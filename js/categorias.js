import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    doc, getDoc, setDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger, toast } from './utils.js'

const categoriasPadrao = ['alimentacao', 'transporte', 'lazer', 'saude', 'outros']

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
    btnTema.textContent = escuro ? 'Modo Claro' : 'Modo Escuro'
    localStorage.setItem('tema', escuro ? 'dark' : 'light')
})

if (localStorage.getItem('tema') === 'dark') {
    document.body.classList.add('dark')
    btnTema.textContent = 'Modo Claro'
}

async function carregarCategorias(uid) {
    const ref = doc(db, 'usuarios', uid, 'dados', 'categorias')
    const snap = await getDoc(ref)
    if (snap.exists()) return snap.data().lista
    await setDoc(ref, { lista: categoriasPadrao })
    return categoriasPadrao
}

async function salvarCategorias(uid, lista) {
    await setDoc(doc(db, 'usuarios', uid, 'dados', 'categorias'), { lista })
}

async function calcularTotalCategoria(uid, nome) {
    const snap = await getDocs(collection(db, 'usuarios', uid, 'transacoes'))
    let total = 0
    snap.forEach(function(d) {
        const t = d.data()
        if (t.categoria === nome) total += Number(t.valor)
    })
    return total
}

async function renderizarCategorias(uid) {
    const lista = document.getElementById('lista-categorias')
    lista.innerHTML = ''
    const categorias = await carregarCategorias(uid)

    for (const nome of categorias) {
        const total = await calcularTotalCategoria(uid, nome)
        const item = document.createElement('li')
        item.innerHTML = `
            <div class="item-descricao">${nome}</div>
            <div class="item-total">R$ ${total.toFixed(2)} gastos</div>
            <div class="item-direita">
                ${categoriasPadrao.includes(nome)
                    ? '<span style="color: var(--label); font-size: 12px;">padrão</span>'
                    : `<button class="btn-excluir" data-nome="${nome}">×</button>`
                }
            </div>
        `
        lista.appendChild(item)
    }

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const nome = btn.dataset.nome
            const cats = await carregarCategorias(uid)
            await salvarCategorias(uid, cats.filter(function(c) { return c !== nome }))
            renderizarCategorias(uid)
        })
    })
}

function iniciar(uid) {
    renderizarCategorias(uid)

    document.getElementById('form-categoria').addEventListener('submit', async function(evento) {
        evento.preventDefault()
        const input = document.getElementById('nome-categoria')
        const nome = input.value.trim().toLowerCase()
        if (!nome) return

        const cats = await carregarCategorias(uid)
        if (cats.includes(nome)) { toast('Essa categoria já existe!', 'aviso'); return }

        cats.push(nome)
        await salvarCategorias(uid, cats)
        renderizarCategorias(uid)
        input.value = ''
    })
}
