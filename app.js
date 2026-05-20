import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    collection, addDoc, deleteDoc, doc, onSnapshot, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = 'login.html'
    } else {
        iniciar(usuario.uid)
    }
})

document.getElementById('btn-logout').addEventListener('click', function() {
    signOut(auth).then(function() {
        window.location.href = 'login.html'
    })
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

function iniciar(uid) {
    carregarSelectCategorias()

    const q = query(collection(db, 'usuarios', uid, 'transacoes'))
    onSnapshot(q, function(snapshot) {
        const transacoes = []
        snapshot.forEach(function(d) {
            transacoes.push({ id: d.id, ...d.data() })
        })
        renderizarTransacoes(transacoes)
        atualizarResumo(transacoes)
    })

    const form = document.getElementById('form-transacao')
    form.addEventListener('submit', async function(evento) {
        evento.preventDefault()

        const transacao = {
            descricao: document.getElementById('descricao').value,
            valor: document.getElementById('valor').value,
            tipo: document.getElementById('tipo').value,
            categoria: document.getElementById('categoria').value,
            data: document.getElementById('data').value
        }

        try {
            await addDoc(collection(db, 'usuarios', uid, 'transacoes'), transacao)
            form.reset()
        } catch(e) {
            console.error('Erro ao salvar:', e)
        }
    })

    window._uid = uid
}

function renderizarTransacoes(transacoes) {
    const lista = document.getElementById('lista-transacoes')
    lista.innerHTML = ''

    transacoes.forEach(function(t) {
        const item = document.createElement('li')
        item.innerHTML = `
            <div>
                <div class="item-descricao">${t.descricao}</div>
                <div class="item-categoria">${t.categoria} · ${t.data}</div>
            </div>
            <div class="item-direita">
                <div class="item-valor">R$ ${Number(t.valor).toFixed(2)}</div>
                <span class="item-tipo ${t.tipo}">${t.tipo}</span>
            </div>
            <button class="btn-excluir" data-id="${t.id}">🗑</button>
        `
        lista.appendChild(item)
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const id = btn.dataset.id
            await deleteDoc(doc(db, 'usuarios', window._uid, 'transacoes', id))
        })
    })
}

function atualizarResumo(transacoes) {
    const receitas = transacoes
        .filter(function(t) { return t.tipo === 'receita' })
        .reduce(function(soma, t) { return soma + Number(t.valor) }, 0)

    const despesas = transacoes
        .filter(function(t) { return t.tipo === 'despesa' })
        .reduce(function(soma, t) { return soma + Number(t.valor) }, 0)

    const saldo = receitas - despesas

    document.getElementById('total-receitas').textContent = 'R$ ' + receitas.toFixed(2)
    document.getElementById('total-despesas').textContent = 'R$ ' + despesas.toFixed(2)
    document.getElementById('saldo-total').textContent = 'R$ ' + saldo.toFixed(2)
}

function carregarSelectCategorias() {
    const select = document.getElementById('categoria')
    const categorias = JSON.parse(localStorage.getItem('categorias')) || ['alimentacao', 'transporte', 'lazer', 'saude', 'outros']
    select.innerHTML = ''
    categorias.forEach(function(nome) {
        const option = document.createElement('option')
        option.value = nome
        option.textContent = nome.charAt(0).toUpperCase() + nome.slice(1)
        select.appendChild(option)
    })
}
