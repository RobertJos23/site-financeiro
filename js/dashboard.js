import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import { collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger } from './utils.js'

configurarHamburger()

onAuthStateChanged(auth, async function(usuario) {
    if (!usuario) {
        window.location.href = '../login.html'
    } else {
        await carregarDashboard(usuario.uid)
        esconderLoading()
        configurarTema()
        configurarLogout()
    }
})

function configurarLogout() {
    document.getElementById('btn-logout').addEventListener('click', function() {
        signOut(auth).then(function() { window.location.href = '../login.html' })
    })
}

function configurarTema() {
    const btnTema = document.getElementById('btn-tema')
    btnTema.addEventListener('click', function() {
        document.body.classList.toggle('dark')
        const escuro = document.body.classList.contains('dark')
        btnTema.textContent = escuro ? 'Modo Claro' : 'Modo Escuro'
        localStorage.setItem('tema', escuro ? 'dark' : 'light')
    })
    if (localStorage.getItem('tema') === 'dark') {
        document.body.classList.add('dark')
        btnTema.textContent = 'Modo Claro'
    }
}

async function carregarDashboard(uid) {
    const agora = new Date()
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    const ano = String(agora.getFullYear())

    const snapT = await getDocs(collection(db, 'usuarios', uid, 'transacoes'))
    const todasTransacoes = []
    snapT.forEach(function(d) { todasTransacoes.push(d.data()) })

    const transacoesMes = todasTransacoes.filter(function(t) {
        return t.data && t.data.startsWith(`${ano}-${mes}`)
    })

    const receitas = transacoesMes
        .filter(function(t) { return t.tipo === 'receita' })
        .reduce(function(s, t) { return s + Number(t.valor) }, 0)
    const despesas = transacoesMes
        .filter(function(t) { return t.tipo === 'despesa' })
        .reduce(function(s, t) { return s + Number(t.valor) }, 0)
    const saldo = receitas - despesas

    document.getElementById('dash-receitas').textContent = 'R$ ' + receitas.toFixed(2)
    document.getElementById('dash-despesas').textContent = 'R$ ' + despesas.toFixed(2)
    const elSaldo = document.getElementById('dash-saldo')
    elSaldo.textContent = 'R$ ' + saldo.toFixed(2)
    elSaldo.style.color = saldo >= 0 ? '#2d6a4f' : '#c0392b'

    renderizarTopCategorias(transacoesMes)
    renderizarHistorico(todasTransacoes)
    renderizarProjecao(todasTransacoes, saldo)
    await verificarLimite(uid, despesas)

    const snapM = await getDocs(collection(db, 'usuarios', uid, 'metas'))
    const metas = []
    snapM.forEach(function(d) { metas.push(d.data()) })
    renderizarMetas(metas)

    const snapC = await getDocs(collection(db, 'usuarios', uid, 'contas'))
    const contas = []
    snapC.forEach(function(d) { contas.push(d.data()) })
    renderizarContasProximas(contas, agora)
}

function renderizarProjecao(todasTransacoes, saldoAtual) {
    const container = document.getElementById('dash-projecao')
    if (!container) return

    const recorrentes = todasTransacoes.filter(function(t) { return t.recorrente === true })
    const recMensal  = recorrentes.filter(function(t) { return t.tipo === 'receita' }).reduce(function(s, t) { return s + Number(t.valor) }, 0)
    const despMensal = recorrentes.filter(function(t) { return t.tipo === 'despesa' }).reduce(function(s, t) { return s + Number(t.valor) }, 0)
    const saldoMensal = recMensal - despMensal

    const agora = new Date()
    const mesesNome = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

    const itens = []
    let projetado = saldoAtual
    for (let i = 1; i <= 3; i++) {
        projetado += saldoMensal
        const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1)
        itens.push({ mes: mesesNome[d.getMonth()], saldo: projetado, rec: recMensal, desp: despMensal })
    }

    container.innerHTML = `
        <div class="projecao-grid">
            ${itens.map(function(item) { return `
                <div class="projecao-item">
                    <div class="projecao-mes">${item.mes}</div>
                    <div class="projecao-valor ${item.saldo >= 0 ? 'positivo' : 'negativo'}">R$ ${item.saldo.toFixed(2)}</div>
                    <div class="projecao-detalhe">+R$ ${item.rec.toFixed(2)} / −R$ ${item.desp.toFixed(2)}</div>
                </div>`
            }).join('')}
        </div>
        <p style="font-size:11px;color:var(--label);margin-top:10px;">* Baseado nas transações recorrentes cadastradas</p>`
}

async function verificarLimite(uid, despesas) {
    const snap = await getDoc(doc(db, 'usuarios', uid, 'dados', 'configuracoes'))
    if (!snap.exists()) return
    const limite = Number(snap.data().limiteMensal || 0)
    if (!limite) return
    const banner = document.getElementById('limite-banner')
    if (despesas > limite) {
        banner.style.display = 'flex'
        banner.textContent = `⚠ Limite mensal excedido! Despesas: R$ ${despesas.toFixed(2)} / Limite: R$ ${limite.toFixed(2)}`
    } else {
        banner.style.display = 'none'
    }
}

function renderizarTopCategorias(transacoes) {
    const mapa = {}
    transacoes.filter(function(t) { return t.tipo === 'despesa' }).forEach(function(t) {
        mapa[t.categoria] = (mapa[t.categoria] || 0) + Number(t.valor)
    })
    const ordenado = Object.entries(mapa).sort(function(a, b) { return b[1] - a[1] }).slice(0, 5)
    const total = ordenado.reduce(function(s, e) { return s + e[1] }, 0)
    const container = document.getElementById('dash-categorias')

    if (ordenado.length === 0) {
        container.innerHTML = '<p style="color: var(--label); font-size: 13px;">Nenhum gasto este mês.</p>'
        return
    }
    container.innerHTML = ordenado.map(function(e) {
        const pct = total > 0 ? Math.round((e[1] / total) * 100) : 0
        return `
            <div class="dash-item">
                <div class="dash-item-header">
                    <span class="dash-item-nome">${e[0]}</span>
                    <span class="dash-item-valor">R$ ${e[1].toFixed(2)}</span>
                </div>
                <div class="barra-fundo" style="height: 6px;">
                    <div class="barra-progresso" style="width: ${pct}%; background: #c0392b; height: 100%;"></div>
                </div>
            </div>
        `
    }).join('')
}

let graficoHistorico = null

function renderizarHistorico(todasTransacoes) {
    const agora = new Date()
    const mesesNome = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const labels = []
    const keys = []

    for (let i = 5; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
        keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
        labels.push(mesesNome[d.getMonth()])
    }

    const receitasMes = keys.map(function(key) {
        return todasTransacoes
            .filter(function(t) { return t.tipo === 'receita' && t.data && t.data.startsWith(key) })
            .reduce(function(s, t) { return s + Number(t.valor) }, 0)
    })
    const despesasMes = keys.map(function(key) {
        return todasTransacoes
            .filter(function(t) { return t.tipo === 'despesa' && t.data && t.data.startsWith(key) })
            .reduce(function(s, t) { return s + Number(t.valor) }, 0)
    })

    if (graficoHistorico) graficoHistorico.destroy()
    graficoHistorico = new Chart(document.getElementById('dash-grafico-historico'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Receitas', data: receitasMes, backgroundColor: '#2d6a4f' },
                { label: 'Despesas', data: despesasMes, backgroundColor: '#c0392b' }
            ]
        },
        options: {
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true } }
        }
    })
}

function renderizarMetas(metas) {
    const container = document.getElementById('dash-metas')
    if (metas.length === 0) {
        container.innerHTML = '<p style="color: var(--label); font-size: 13px;">Nenhuma meta cadastrada.</p>'
        return
    }
    container.innerHTML = metas.slice(0, 4).map(function(m) {
        const pct = Math.min(100, Math.round((Number(m.guardado) / Number(m.alvo)) * 100))
        return `
            <div class="dash-item">
                <div class="dash-item-header">
                    <span class="dash-item-nome">${m.nome}</span>
                    <span class="dash-item-valor">${pct}%</span>
                </div>
                <div class="barra-fundo" style="height: 6px;">
                    <div class="barra-progresso ${pct >= 100 ? 'concluida' : ''}" style="width: ${pct}%; height: 100%;"></div>
                </div>
            </div>
        `
    }).join('')
}

function renderizarContasProximas(contas, agora) {
    const diaHoje = agora.getDate()
    const container = document.getElementById('dash-contas')

    const proximas = contas
        .map(function(c) { return { ...c, diaNum: Number(c.dia) } })
        .filter(function(c) { return c.diaNum >= diaHoje && c.diaNum <= diaHoje + 7 })
        .sort(function(a, b) { return a.diaNum - b.diaNum })

    if (proximas.length === 0) {
        container.innerHTML = '<p style="color: var(--label); font-size: 13px;">Nenhuma conta nos próximos 7 dias.</p>'
        return
    }
    container.innerHTML = proximas.map(function(c) {
        const dias = c.diaNum - diaHoje
        const label = dias === 0 ? 'Hoje!' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`
        return `
            <div class="dash-conta-item ${dias <= 1 ? 'urgente' : ''}">
                <div>
                    <div style="font-size: 14px; font-weight: 600;">${c.nome}</div>
                    <div style="font-size: 12px; color: var(--label);">Dia ${c.dia} · ${label}</div>
                </div>
                <div style="font-weight: bold; font-size: 14px; flex-shrink: 0;">R$ ${Number(c.valor).toFixed(2)}</div>
            </div>
        `
    }).join('')
}
