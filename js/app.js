import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    collection, addDoc, deleteDoc, doc, onSnapshot, query, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger, toast } from './utils.js'

configurarHamburger()

let todasTransacoes = []
let filtros = { tipo: '', categoria: '', inicio: '', fim: '' }

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = 'login.html'
    } else {
        esconderLoading()
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

function aplicarFiltros() {
    let filtradas = todasTransacoes
    if (filtros.tipo)      filtradas = filtradas.filter(function(t) { return t.tipo === filtros.tipo })
    if (filtros.categoria) filtradas = filtradas.filter(function(t) { return t.categoria === filtros.categoria })
    if (filtros.inicio)    filtradas = filtradas.filter(function(t) { return t.data >= filtros.inicio })
    if (filtros.fim)       filtradas = filtradas.filter(function(t) { return t.data <= filtros.fim })
    renderizarTransacoes(filtradas)
}

function iniciar(uid) {
    carregarSelectCategorias(uid)

    const q = query(collection(db, 'usuarios', uid, 'transacoes'))
    onSnapshot(q, function(snapshot) {
        todasTransacoes = []
        snapshot.forEach(function(d) {
            todasTransacoes.push({ id: d.id, ...d.data() })
        })
        aplicarFiltros()
        atualizarResumo(todasTransacoes)
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
            toast('Transação adicionada!')
        } catch(e) {
            toast('Erro ao salvar transação.', 'erro')
        }
    })

    document.getElementById('filtro-tipo').addEventListener('change', function() {
        filtros.tipo = this.value; aplicarFiltros()
    })
    document.getElementById('filtro-categoria-filtro').addEventListener('change', function() {
        filtros.categoria = this.value; aplicarFiltros()
    })
    document.getElementById('filtro-data-inicio').addEventListener('change', function() {
        filtros.inicio = this.value; aplicarFiltros()
    })
    document.getElementById('filtro-data-fim').addEventListener('change', function() {
        filtros.fim = this.value; aplicarFiltros()
    })
    document.getElementById('btn-limpar-filtros').addEventListener('click', function() {
        filtros = { tipo: '', categoria: '', inicio: '', fim: '' }
        document.getElementById('filtro-tipo').value = ''
        document.getElementById('filtro-categoria-filtro').value = ''
        document.getElementById('filtro-data-inicio').value = ''
        document.getElementById('filtro-data-fim').value = ''
        aplicarFiltros()
    })
    document.getElementById('btn-exportar-csv').addEventListener('click', function() {
        exportarCSV()
    })

    window._uid = uid
}

function renderizarTransacoes(transacoes) {
    const lista = document.getElementById('lista-transacoes')
    lista.innerHTML = ''

    if (transacoes.length === 0) {
        lista.innerHTML = '<li style="color: var(--label); padding: 12px 0; font-size: 14px;">Nenhuma transação encontrada.</li>'
        return
    }

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
            <button class="btn-excluir" data-id="${t.id}">×</button>
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

async function carregarSelectCategorias(uid) {
    const select = document.getElementById('categoria')
    const selectFiltro = document.getElementById('filtro-categoria-filtro')
    const ref = doc(db, 'usuarios', uid, 'dados', 'categorias')
    const snap = await getDoc(ref)
    const categorias = snap.exists() ? snap.data().lista : ['alimentacao', 'transporte', 'lazer', 'saude', 'outros']

    select.innerHTML = ''
    selectFiltro.innerHTML = '<option value="">Todas as categorias</option>'

    categorias.forEach(function(nome) {
        const cap = nome.charAt(0).toUpperCase() + nome.slice(1)
        const opt1 = document.createElement('option')
        opt1.value = nome
        opt1.textContent = cap
        select.appendChild(opt1)

        const opt2 = document.createElement('option')
        opt2.value = nome
        opt2.textContent = cap
        selectFiltro.appendChild(opt2)
    })
}

function exportarCSV() {
    if (todasTransacoes.length === 0) { toast('Nenhuma transação para exportar.', 'aviso'); return }
    const linhas = [['Descrição', 'Categoria', 'Tipo', 'Data', 'Valor']]
    todasTransacoes.forEach(function(t) {
        linhas.push([`"${t.descricao}"`, t.categoria, t.tipo, t.data, Number(t.valor).toFixed(2)])
    })
    const csv = '﻿' + linhas.map(function(l) { return l.join(';') }).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transacoes.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast('CSV exportado!')
}
