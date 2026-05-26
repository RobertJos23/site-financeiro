import { auth } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import { configurarHamburger, esconderLoading } from './utils.js'

configurarHamburger()

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = '../login.html'
    } else {
        esconderLoading()
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

// Tabs
document.querySelectorAll('.calc-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.calc-tab').forEach(function(t) { t.classList.remove('ativa') })
        document.querySelectorAll('.calc-painel').forEach(function(p) { p.classList.remove('ativo') })
        tab.classList.add('ativa')
        document.getElementById('painel-' + tab.dataset.painel).classList.add('ativo')
    })
})

// ── Juros compostos ──
function calcularJuros() {
    const P   = Number(document.getElementById('jc-capital').value) || 0
    const PMT = Number(document.getElementById('jc-aporte').value)  || 0
    const taxaAnual = Number(document.getElementById('jc-taxa').value) || 0
    const n   = Number(document.getElementById('jc-meses').value)   || 0
    const res = document.getElementById('jc-resultado')
    if (!n) { res.innerHTML = ''; return }

    const i = taxaAnual / 100 / 12
    const fv = i === 0
        ? P + PMT * n
        : P * Math.pow(1 + i, n) + PMT * (Math.pow(1 + i, n) - 1) / i

    const totalInv = P + PMT * n
    const rend = fv - totalInv

    res.innerHTML = `
        <div class="calc-resultado-item"><span>Valor final</span><span class="calc-resultado-destaque">R$ ${fv.toFixed(2)}</span></div>
        <div class="calc-resultado-item"><span>Total investido</span><span>R$ ${totalInv.toFixed(2)}</span></div>
        <div class="calc-resultado-item"><span>Rendimento</span><span style="color:#2d6a4f;font-weight:600">+ R$ ${rend.toFixed(2)}</span></div>
        <div class="calc-resultado-item"><span>Rentabilidade</span><span>${totalInv > 0 ? ((rend / totalInv) * 100).toFixed(1) : 0}%</span></div>
    `
}
;['jc-capital','jc-aporte','jc-taxa','jc-meses'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', calcularJuros)
})

// ── Meta de economia ──
function calcularMeta() {
    const FV = Number(document.getElementById('meta-valor').value)  || 0
    const n  = Number(document.getElementById('meta-meses').value)  || 0
    const taxaAnual = Number(document.getElementById('meta-taxa').value) || 0
    const res = document.getElementById('meta-resultado')
    if (!FV || !n) { res.innerHTML = ''; return }

    const i = taxaAnual / 100 / 12
    const PMT = i === 0
        ? FV / n
        : FV * i / (Math.pow(1 + i, n) - 1)

    const totalDep = PMT * n
    const rend = FV - totalDep

    res.innerHTML = `
        <div class="calc-resultado-item"><span>Aporte mensal necessário</span><span class="calc-resultado-destaque">R$ ${PMT.toFixed(2)}</span></div>
        <div class="calc-resultado-item"><span>Total depositado</span><span>R$ ${totalDep.toFixed(2)}</span></div>
        <div class="calc-resultado-item"><span>Rendimento esperado</span><span style="color:#2d6a4f;font-weight:600">+ R$ ${rend.toFixed(2)}</span></div>
    `
}
;['meta-valor','meta-meses','meta-taxa'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', calcularMeta)
})

// ── Parcela de empréstimo ──
function calcularParcela() {
    const PV = Number(document.getElementById('emp-valor').value) || 0
    const taxaAnual = Number(document.getElementById('emp-taxa').value) || 0
    const n  = Number(document.getElementById('emp-meses').value) || 0
    const res = document.getElementById('emp-resultado')
    if (!PV || !n) { res.innerHTML = ''; return }

    const i = taxaAnual / 100 / 12
    const PMT = i === 0
        ? PV / n
        : PV * i / (1 - Math.pow(1 + i, -n))

    const totalPago = PMT * n
    const totalJuros = totalPago - PV

    res.innerHTML = `
        <div class="calc-resultado-item"><span>Parcela mensal</span><span class="calc-resultado-destaque">R$ ${PMT.toFixed(2)}</span></div>
        <div class="calc-resultado-item"><span>Total a pagar</span><span>R$ ${totalPago.toFixed(2)}</span></div>
        <div class="calc-resultado-item"><span>Total de juros</span><span style="color:#c0392b;font-weight:600">R$ ${totalJuros.toFixed(2)}</span></div>
    `
}
;['emp-valor','emp-taxa','emp-meses'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', calcularParcela)
})
