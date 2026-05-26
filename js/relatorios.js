import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger } from './utils.js'

let graficoRD = null
let graficoCat = null
let graficoMetas = null
let graficoHistorico = null

configurarHamburger()

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = '../login.html'
    } else {
        esconderLoading()
        iniciar(usuario.uid)
    }
})

document.getElementById('btn-logout').addEventListener('click', function() {
    signOut(auth).then(function() { window.location.href = '../login.html' })
})

const btnTema = document.getElementById('btn-tema')
btnTema.addEventListener('click', function() {
    document.body.classList.toggle('dark')
    const escuro = document.body.classList.contains('dark')
    btnTema.textContent = escuro ? '☀' : '☾'
    localStorage.setItem('tema', escuro ? 'dark' : 'light')
})

if (localStorage.getItem('tema') === 'dark') {
    document.body.classList.add('dark')
    btnTema.textContent = '☀'
}

function renderizarGraficoRD(transacoes) {
    const receitas = transacoes.filter(function(t) { return t.tipo === 'receita' }).reduce(function(s, t) { return s + Number(t.valor) }, 0)
    const despesas = transacoes.filter(function(t) { return t.tipo === 'despesa' }).reduce(function(s, t) { return s + Number(t.valor) }, 0)
    if (graficoRD) graficoRD.destroy()
    graficoRD = new Chart(document.getElementById('grafico-receitas-despesas'), {
        type: 'bar',
        data: { labels: ['Receitas', 'Despesas'], datasets: [{ data: [receitas, despesas], backgroundColor: ['#2d6a4f', '#c0392b'] }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    })
}

function renderizarGraficoCategorias(transacoes) {
    const mapa = {}
    transacoes.filter(function(t) { return t.tipo === 'despesa' }).forEach(function(t) {
        mapa[t.categoria] = (mapa[t.categoria] || 0) + Number(t.valor)
    })
    const labels = Object.keys(mapa)
    const valores = Object.values(mapa)
    const cores = ['#2d6a4f','#c0392b','#2980b9','#e67e22','#8e44ad','#16a085','#d35400']
    if (graficoCat) graficoCat.destroy()
    graficoCat = new Chart(document.getElementById('grafico-categorias'), {
        type: 'doughnut',
        data: { labels, datasets: [{ data: valores, backgroundColor: cores.slice(0, labels.length) }] },
        options: { plugins: { legend: { position: 'bottom' } } }
    })
}

function renderizarGraficoMetas(metas) {
    const labels = metas.map(function(m) { return m.nome })
    const porcentagens = metas.map(function(m) { return Math.min(100, Math.round((m.guardado / m.alvo) * 100)) })
    if (graficoMetas) graficoMetas.destroy()
    graficoMetas = new Chart(document.getElementById('grafico-metas'), {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Progresso (%)', data: porcentagens, backgroundColor: '#2d6a4f' }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 } } }
    })
}

function renderizarTabela(transacoes) {
    const corpo = document.getElementById('corpo-tabela')
    const msg = document.getElementById('msg-vazia')
    corpo.innerHTML = ''
    if (transacoes.length === 0) { msg.style.display = 'block'; return }
    msg.style.display = 'none'
    transacoes.forEach(function(t) {
        const tr = document.createElement('tr')
        tr.innerHTML = `<td>${t.descricao}</td><td>${t.categoria}</td><td class="${t.tipo}">${t.tipo}</td><td>${t.data}</td><td>R$ ${Number(t.valor).toFixed(2)}</td>`
        corpo.appendChild(tr)
    })
}

function renderizarHistoricoMensal(todasTransacoes) {
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
    graficoHistorico = new Chart(document.getElementById('grafico-historico-mensal'), {
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

function renderizarComparacao(transacoesMes, todasTransacoes, mes, ano) {
    const container = document.getElementById('comparacao-container')
    if (!container) return

    const mesAtual = new Date(Number(ano), Number(mes) - 1, 1)
    const mesAnterior = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1)
    const mesAntKey = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`
    const transacoesAnt = todasTransacoes.filter(function(t) { return t.data && t.data.startsWith(mesAntKey) })

    function calcular(lista) {
        const rec = lista.filter(function(t) { return t.tipo === 'receita' }).reduce(function(s, t) { return s + Number(t.valor) }, 0)
        const desp = lista.filter(function(t) { return t.tipo === 'despesa' }).reduce(function(s, t) { return s + Number(t.valor) }, 0)
        return { receitas: rec, despesas: desp, saldo: rec - desp }
    }

    const atual = calcular(transacoesMes)
    const anterior = calcular(transacoesAnt)

    const mesesNome = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const nomeMesAtual = mesesNome[mesAtual.getMonth()]
    const nomeMesAnt = mesesNome[mesAnterior.getMonth()]

    function bloco(titulo, a, b) {
        const d = a - b
        const cls = d >= 0 ? 'diff-positivo' : 'diff-negativo'
        const sinal = d >= 0 ? '+' : ''
        return `
            <div class="comparacao-item">
                <div class="comparacao-label">${titulo}</div>
                <div class="comparacao-valor">R$ ${a.toFixed(2)}</div>
                <div class="comparacao-label" style="margin-top:4px;">${nomeMesAnt}: R$ ${b.toFixed(2)}</div>
                <div class="comparacao-diff ${cls}">${sinal}R$ ${d.toFixed(2)}</div>
            </div>`
    }

    container.innerHTML = `
        <div class="comparacao-grid">
            ${bloco('Receitas', atual.receitas, anterior.receitas)}
            ${bloco('Despesas', atual.despesas, anterior.despesas)}
            ${bloco('Saldo', atual.saldo, anterior.saldo)}
        </div>`
}

async function atualizar(uid) {
    const mes = document.getElementById('filtro-mes').value
    const ano = document.getElementById('filtro-ano').value

    const snapT = await getDocs(collection(db, 'usuarios', uid, 'transacoes'))
    const todasTransacoes = []
    snapT.forEach(function(d) { todasTransacoes.push(d.data()) })

    const transacoes = todasTransacoes.filter(function(t) {
        if (!t.data) return false
        const partes = t.data.split('-')
        return partes[0] === String(ano) && partes[1] === mes
    })

    const snapM = await getDocs(collection(db, 'usuarios', uid, 'metas'))
    const metas = []
    snapM.forEach(function(d) { metas.push(d.data()) })

    renderizarGraficoRD(transacoes)
    renderizarGraficoCategorias(transacoes)
    renderizarGraficoMetas(metas)
    renderizarHistoricoMensal(todasTransacoes)
    renderizarTabela(transacoes)
    renderizarComparacao(transacoes, todasTransacoes, mes, ano)
}

function iniciar(uid) {
    const agora = new Date()
    document.getElementById('filtro-mes').value = String(agora.getMonth() + 1).padStart(2, '0')
    document.getElementById('filtro-ano').value = agora.getFullYear()

    atualizar(uid)

    document.getElementById('filtro-mes').addEventListener('change', function() { atualizar(uid) })
    document.getElementById('filtro-ano').addEventListener('change', function() { atualizar(uid) })
}
