import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    doc, getDoc, setDoc, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger, toast, confirmarAcao } from './utils.js'

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

async function carregarOrcamentos(uid) {
    const snap = await getDoc(doc(db, 'usuarios', uid, 'dados', 'orcamentos'))
    return snap.exists() ? snap.data() : {}
}

async function salvarOrcamentos(uid, orcamentos) {
    await setDoc(doc(db, 'usuarios', uid, 'dados', 'orcamentos'), orcamentos)
}

async function calcularTotalCategoria(uid, nome) {
    const agora = new Date()
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    const ano = String(agora.getFullYear())
    const snap = await getDocs(collection(db, 'usuarios', uid, 'transacoes'))
    let total = 0
    snap.forEach(function(d) {
        const t = d.data()
        if (t.categoria === nome && t.tipo === 'despesa' && t.data && t.data.startsWith(`${ano}-${mes}`)) {
            total += Number(t.valor)
        }
    })
    return total
}

async function renderizarCategorias(uid) {
    const lista = document.getElementById('lista-categorias')
    lista.innerHTML = ''
    const categorias = await carregarCategorias(uid)
    const orcamentos = await carregarOrcamentos(uid)

    for (const nome of categorias) {
        const total = await calcularTotalCategoria(uid, nome)
        const limite = Number(orcamentos[nome] || 0)
        const pct = limite > 0 ? Math.min(100, Math.round((total / limite) * 100)) : 0
        const excedido = limite > 0 && total > limite

        const item = document.createElement('li')
        item.innerHTML = `
            <div class="item-descricao">${nome}</div>
            <div class="item-total">R$ ${total.toFixed(2)} gastos este mês</div>
            <div class="cat-orcamento">
                <div class="cat-orcamento-header">
                    <span>Orçamento mensal</span>
                    <input type="number" class="input-orcamento" data-cat="${nome}"
                        value="${limite > 0 ? limite.toFixed(2) : ''}" placeholder="R$ 0,00" min="0" step="0.01">
                </div>
                ${limite > 0 ? `
                <div class="barra-orcamento">
                    <div class="barra-orcamento-fill ${excedido ? 'excedido' : ''}" style="width: ${pct}%"></div>
                </div>
                ${excedido ? `<div class="cat-alerta-orcamento">⚠ Limite excedido por R$ ${(total - limite).toFixed(2)}</div>` : ''}
                ` : ''}
            </div>
            <div class="item-direita" style="margin-top: 8px;">
                ${categoriasPadrao.includes(nome)
                    ? '<span style="color: var(--label); font-size: 12px;">padrão</span>'
                    : `<button class="btn-excluir" data-nome="${nome}">×</button>`
                }
            </div>
        `
        lista.appendChild(item)
    }

    document.querySelectorAll('.input-orcamento').forEach(function(input) {
        input.addEventListener('change', async function() {
            const cat = input.dataset.cat
            const valor = Number(input.value) || 0
            const orcamentosAtuais = await carregarOrcamentos(uid)
            if (valor > 0) {
                orcamentosAtuais[cat] = valor
            } else {
                delete orcamentosAtuais[cat]
            }
            await salvarOrcamentos(uid, orcamentosAtuais)
            renderizarCategorias(uid)
            toast('Orçamento salvo!')
        })
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const ok = await confirmarAcao('Excluir esta categoria?')
            if (!ok) return
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
