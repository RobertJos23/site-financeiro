import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger } from './utils.js'

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

function renderizarMetas(metas, uid) {
    const container = document.getElementById('lista-metas')
    container.innerHTML = ''

    if (metas.length === 0) {
        container.innerHTML = '<p style="color: var(--label);">Nenhuma meta cadastrada.</p>'
        return
    }

    metas.forEach(function(m) {
        const porcentagem = Math.min(100, Math.round((m.guardado / m.alvo) * 100))
        const concluida = porcentagem >= 100
        const card = document.createElement('div')
        card.className = 'meta-card'

        card.innerHTML = `
            <div class="meta-topo">
                <span class="item-descricao">${m.nome}</span>
                <button class="btn-excluir" data-id="${m.id}">×</button>
            </div>
            <div class="meta-valores">
                <span>R$ ${Number(m.guardado).toFixed(2)} guardados</span>
                <span>Meta: R$ ${Number(m.alvo).toFixed(2)}</span>
            </div>
            <div class="barra-fundo">
                <div class="barra-progresso ${concluida ? 'concluida' : ''}" style="width: ${porcentagem}%"></div>
            </div>
            <div class="meta-rodape">
                <span class="meta-porcentagem">${porcentagem}%</span>
                ${concluida
                    ? '<span class="meta-badge">Concluida!</span>'
                    : `<div style="display: flex; gap: 8px; align-items: center;">
                            <input type="number" class="input-deposito" placeholder="R$ 0,00" min="0" step="0.01">
                            <button class="btn-deposito" data-id="${m.id}" data-guardado="${m.guardado}">Adicionar</button>
                       </div>`
                }
            </div>
        `
        container.appendChild(card)
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            await deleteDoc(doc(db, 'usuarios', uid, 'metas', btn.dataset.id))
        })
    })

    document.querySelectorAll('.btn-deposito').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const valor = Number(btn.previousElementSibling.value)
            if (!valor || valor <= 0) return
            const novoGuardado = Number(btn.dataset.guardado) + valor
            await updateDoc(doc(db, 'usuarios', uid, 'metas', btn.dataset.id), { guardado: novoGuardado })
        })
    })
}

function iniciar(uid) {
    onSnapshot(collection(db, 'usuarios', uid, 'metas'), function(snapshot) {
        const metas = []
        snapshot.forEach(function(d) { metas.push({ id: d.id, ...d.data() }) })
        renderizarMetas(metas, uid)
    })

    document.getElementById('form-meta').addEventListener('submit', async function(evento) {
        evento.preventDefault()
        const nome = document.getElementById('nome-meta').value.trim()
        const alvo = document.getElementById('valor-meta').value
        if (!nome || !alvo) return

        await addDoc(collection(db, 'usuarios', uid, 'metas'), { nome, alvo, guardado: 0 })
        document.getElementById('form-meta').reset()
    })
}
