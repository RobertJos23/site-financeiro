import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    collection, addDoc, deleteDoc, doc, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger, toast, confirmarAcao } from './utils.js'

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

async function calcularSaldo(uid, nomeCarteira) {
    const snap = await getDocs(collection(db, 'usuarios', uid, 'transacoes'))
    let saldo = 0
    snap.forEach(function(d) {
        const t = d.data()
        if ((t.carteira || '') === nomeCarteira) {
            saldo += t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor)
        }
    })
    return saldo
}

async function renderizarCarteiras(uid, carteiras) {
    const grid = document.getElementById('carteiras-grid')
    grid.innerHTML = ''

    if (carteiras.length === 0) {
        grid.innerHTML = '<p style="color: var(--label); grid-column: 1/-1;">Nenhuma carteira cadastrada. Crie uma abaixo.</p>'
        return
    }

    for (const c of carteiras) {
        const saldo = await calcularSaldo(uid, c.nome)
        const card = document.createElement('div')
        card.className = 'carteira-card'
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div class="carteira-nome">${c.nome}</div>
                <button class="btn-excluir" data-id="${c.id}" style="margin: 0; flex-shrink: 0;">×</button>
            </div>
            <div class="carteira-saldo ${saldo >= 0 ? 'positivo' : 'negativo'}">R$ ${saldo.toFixed(2)}</div>
            <div style="font-size: 12px; color: var(--label); margin-top: 4px;">Saldo disponível</div>
        `
        grid.appendChild(card)
    }

    grid.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const ok = await confirmarAcao('Excluir esta carteira?')
            if (!ok) return
            await deleteDoc(doc(db, 'usuarios', uid, 'carteiras', btn.dataset.id))
            toast('Carteira excluída!')
        })
    })
}

function iniciar(uid) {
    onSnapshot(collection(db, 'usuarios', uid, 'carteiras'), async function(snapshot) {
        const carteiras = []
        snapshot.forEach(function(d) { carteiras.push({ id: d.id, ...d.data() }) })
        await renderizarCarteiras(uid, carteiras)
    })

    document.getElementById('form-carteira').addEventListener('submit', async function(e) {
        e.preventDefault()
        const input = document.getElementById('nome-carteira')
        const nome = input.value.trim()
        if (!nome) return
        await addDoc(collection(db, 'usuarios', uid, 'carteiras'), { nome })
        input.value = ''
        toast('Carteira criada!')
    })
}
