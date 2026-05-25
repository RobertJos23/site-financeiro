import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger, confirmarAcao } from './utils.js'

const MOEDAS_DISPONIVEIS = [
    { id: 'USD-BRL', nome: 'Dólar Americano', simbolo: 'USD', tipo: 'forex' },
    { id: 'EUR-BRL', nome: 'Euro',             simbolo: 'EUR', tipo: 'forex' },
    { id: 'GBP-BRL', nome: 'Libra Esterlina',  simbolo: 'GBP', tipo: 'forex' },
    { id: 'ARS-BRL', nome: 'Peso Argentino',   simbolo: 'ARS', tipo: 'forex' },
    { id: 'CAD-BRL', nome: 'Dólar Canadense',  simbolo: 'CAD', tipo: 'forex' },
    { id: 'JPY-BRL', nome: 'Iene Japonês',     simbolo: 'JPY', tipo: 'forex' },
    { id: 'bitcoin',  nome: 'Bitcoin',          simbolo: 'BTC', tipo: 'crypto' },
    { id: 'ethereum', nome: 'Ethereum',         simbolo: 'ETH', tipo: 'crypto' },
    { id: 'solana',   nome: 'Solana',           simbolo: 'SOL', tipo: 'crypto' },
    { id: 'cardano',  nome: 'Cardano',          simbolo: 'ADA', tipo: 'crypto' },
    { id: 'ripple',   nome: 'XRP',              simbolo: 'XRP', tipo: 'crypto' },
    { id: 'dogecoin', nome: 'Dogecoin',         simbolo: 'DOGE', tipo: 'crypto' },
]

const chartInstances = {}
let intervalId = null
let uid = null

configurarHamburger()

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = '../login.html'
    } else {
        uid = usuario.uid
        esconderLoading()
        iniciar()
    }
})

document.getElementById('btn-logout').addEventListener('click', function() {
    signOut(auth).then(function() { window.location.href = '../login.html' })
})

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

function popularSelect() {
    const select = document.getElementById('select-moeda')
    select.innerHTML = '<option value="">Selecione uma moeda...</option>'
    MOEDAS_DISPONIVEIS.forEach(function(m) {
        const opt = document.createElement('option')
        opt.value = m.id
        opt.textContent = `${m.nome} (${m.simbolo})`
        select.appendChild(opt)
    })
}

async function carregarPreferencias() {
    const snap = await getDoc(doc(db, 'usuarios', uid, 'dados', 'investimentos'))
    if (snap.exists()) return snap.data()
    return { moedas: [], intervalo: 5 }
}

async function salvarPreferencias(moedas, intervalo) {
    await setDoc(doc(db, 'usuarios', uid, 'dados', 'investimentos'), { moedas, intervalo })
}

function carregarHistorico() {
    return JSON.parse(localStorage.getItem('inv_historico')) || {}
}

function salvarHistorico(historico) {
    localStorage.setItem('inv_historico', JSON.stringify(historico))
}

function adicionarAoHistorico(id, preco, variacao) {
    const historico = carregarHistorico()
    if (!historico[id]) historico[id] = []
    historico[id].push({ preco, variacao, ts: Date.now() })
    if (historico[id].length > 20) historico[id].shift()
    salvarHistorico(historico)
}

async function buscarPrecos(moedaIds) {
    const precos = {}
    const forex  = MOEDAS_DISPONIVEIS.filter(function(m) { return moedaIds.includes(m.id) && m.tipo === 'forex' })
    const crypto = MOEDAS_DISPONIVEIS.filter(function(m) { return moedaIds.includes(m.id) && m.tipo === 'crypto' })

    if (forex.length > 0) {
        try {
            const ids = forex.map(function(m) { return m.id }).join(',')
            const res  = await fetch(`https://economia.awesomeapi.com.br/json/last/${ids}`)
            const data = await res.json()
            forex.forEach(function(m) {
                const key = m.id.replace('-', '')
                if (data[key]) {
                    precos[m.id] = { preco: Number(data[key].bid), variacao: Number(data[key].pctChange) }
                }
            })
        } catch(e) {
            forex.forEach(function(m) { precos[m.id] = null })
        }
    }

    if (crypto.length > 0) {
        try {
            const ids = crypto.map(function(m) { return m.id }).join(',')
            const res  = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`)
            const data = await res.json()
            crypto.forEach(function(m) {
                if (data[m.id]) {
                    precos[m.id] = { preco: data[m.id].brl, variacao: data[m.id].brl_24h_change }
                }
            })
        } catch(e) {
            crypto.forEach(function(m) { precos[m.id] = null })
        }
    }

    return precos
}

function formatarPreco(preco) {
    if (preco === null) return 'Indisponível'
    return 'R$ ' + preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function renderizarMiniChart(canvasId, historico) {
    const canvas = document.getElementById(canvasId)
    if (!canvas) return
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy()
    if (!historico || historico.length < 2) return

    const precos = historico.map(function(h) { return h.preco })
    const cor = precos[precos.length - 1] >= precos[0] ? '#2d6a4f' : '#c0392b'

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: precos.map(function(_, i) { return i }),
            datasets: [{ data: precos, borderColor: cor, borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 }]
        },
        options: {
            responsive: true,
            animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        }
    })
}

function renderizarPainel(moedaIds, precos) {
    const painel = document.getElementById('painel-moedas')
    painel.innerHTML = ''
    const historico = carregarHistorico()

    if (moedaIds.length === 0) {
        painel.innerHTML = '<p style="color: var(--label);">Nenhuma moeda adicionada. Selecione acima para começar.</p>'
        return
    }

    moedaIds.forEach(function(id) {
        const info = MOEDAS_DISPONIVEIS.find(function(m) { return m.id === id })
        if (!info) return
        const dado    = precos[id]
        const variacao = dado ? dado.variacao : null
        const positivo = variacao !== null && variacao >= 0
        const canvasId = 'chart-' + id.replace(/[^a-zA-Z0-9]/g, '_')

        const card = document.createElement('div')
        card.className = 'moeda-card'
        card.innerHTML = `
            <div class="moeda-header">
                <div>
                    <span class="moeda-simbolo">${info.simbolo}</span>
                    <span class="moeda-nome">${info.nome}</span>
                </div>
                <button class="btn-excluir" data-id="${id}">×</button>
            </div>
            <div class="moeda-preco">${dado ? formatarPreco(dado.preco) : 'Carregando...'}</div>
            <div class="moeda-variacao ${dado ? (positivo ? 'positiva' : 'negativa') : ''}">
                ${dado ? (positivo ? '▲' : '▼') + ' ' + Math.abs(variacao).toFixed(2) + '%' : '—'}
            </div>
            <canvas id="${canvasId}" class="mini-chart"></canvas>
        `
        painel.appendChild(card)
        renderizarMiniChart(canvasId, historico[id])
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const ok = await confirmarAcao('Remover esta moeda do painel?')
            if (!ok) return
            const pref = await carregarPreferencias()
            const novas = pref.moedas.filter(function(m) { return m !== btn.dataset.id })
            await salvarPreferencias(novas, pref.intervalo)
            iniciar()
        })
    })

    const agora = new Date()
    document.getElementById('ultima-atualizacao').textContent =
        'Última atualização: ' + agora.toLocaleTimeString('pt-BR')
}

async function atualizar(moedaIds) {
    if (moedaIds.length === 0) return
    const precos = await buscarPrecos(moedaIds)
    moedaIds.forEach(function(id) {
        if (precos[id]) adicionarAoHistorico(id, precos[id].preco, precos[id].variacao)
    })
    renderizarPainel(moedaIds, precos)
}

function configurarIntervalo(moedaIds, minutos) {
    if (intervalId) clearInterval(intervalId)
    intervalId = setInterval(function() { atualizar(moedaIds) }, minutos * 60 * 1000)
}

async function iniciar() {
    popularSelect()
    const pref = await carregarPreferencias()

    document.getElementById('intervalo-atualizacao').value = pref.intervalo

    await atualizar(pref.moedas)
    configurarIntervalo(pref.moedas, pref.intervalo)

    document.getElementById('btn-atualizar').onclick = function() { atualizar(pref.moedas) }

    document.getElementById('intervalo-atualizacao').onchange = async function() {
        const novoIntervalo = Number(this.value)
        await salvarPreferencias(pref.moedas, novoIntervalo)
        configurarIntervalo(pref.moedas, novoIntervalo)
    }

    document.getElementById('btn-adicionar-moeda').onclick = async function() {
        const select = document.getElementById('select-moeda')
        const id = select.value
        if (!id) return
        if (pref.moedas.includes(id)) { alert('Essa moeda já está sendo monitorada!'); return }
        pref.moedas.push(id)
        await salvarPreferencias(pref.moedas, pref.intervalo)
        iniciar()
    }
}
