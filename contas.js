import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    collection, addDoc, deleteDoc, doc, onSnapshot, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = '../login.html'
    } else {
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

const agora = new Date()
const mesAtual = String(agora.getMonth() + 1).padStart(2, '0')
const anoAtual = agora.getFullYear()
const chaveMes = `${anoAtual}-${mesAtual}`
const meses = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
document.getElementById('mes-atual').textContent = meses[agora.getMonth()]

function atualizarResumo(contas) {
    const total = contas.reduce(function(soma, c) { return soma + Number(c.valor) }, 0)
    document.getElementById('total-contas').textContent = 'R$ ' + total.toFixed(2)
    document.getElementById('qtd-contas').textContent = contas.length
}

function renderizarContas(contas, jaLancado) {
    const lista = document.getElementById('lista-contas')
    lista.innerHTML = ''
    atualizarResumo(contas)

    const btnLancar = document.getElementById('btn-lancar')
    if (jaLancado) {
        btnLancar.textContent = 'Ja lancado este mes'
        btnLancar.disabled = true
        btnLancar.style.opacity = '0.5'
    } else {
        btnLancar.disabled = false
        btnLancar.style.opacity = '1'
    }

    if (contas.length === 0) {
        lista.innerHTML = '<p style="color: var(--label);">Nenhuma conta fixa cadastrada.</p>'
        return
    }

    contas.forEach(function(c) {
        const item = document.createElement('li')
        item.innerHTML = `
            <div class="item-descricao">${c.nome}</div>
            <div class="item-total">Vence dia ${c.dia}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="item-total">R$ ${Number(c.valor).toFixed(2)}</div>
                <button class="btn-excluir" data-id="${c.id}">×</button>
            </div>
        `
        lista.appendChild(item)
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            await deleteDoc(doc(db, 'usuarios', window._uid, 'contas', btn.dataset.id))
        })
    })
}

async function verificarLancamento(uid) {
    const ref = doc(db, 'usuarios', uid, 'lancamentos', chaveMes)
    const snap = await getDoc(ref)
    return snap.exists()
}

async function lancarContasDoMes(uid, contas) {
    const jaLancado = await verificarLancamento(uid)
    if (jaLancado) return

    for (const c of contas) {
        await addDoc(collection(db, 'usuarios', uid, 'transacoes'), {
            descricao: c.nome,
            valor: c.valor,
            tipo: 'despesa',
            categoria: 'contas fixas',
            data: `${anoAtual}-${mesAtual}-${String(c.dia).padStart(2, '0')}`
        })
    }

    await setDoc(doc(db, 'usuarios', uid, 'lancamentos', chaveMes), { lancadoEm: new Date().toISOString() })
    renderizarContas(contas, true)
}

function iniciar(uid) {
    window._uid = uid
    let contasAtuais = []

    onSnapshot(collection(db, 'usuarios', uid, 'contas'), async function(snapshot) {
        contasAtuais = []
        snapshot.forEach(function(d) { contasAtuais.push({ id: d.id, ...d.data() }) })
        const jaLancado = await verificarLancamento(uid)
        renderizarContas(contasAtuais, jaLancado)
    })

    document.getElementById('btn-lancar').addEventListener('click', async function() {
        if (contasAtuais.length === 0) { alert('Nenhuma conta fixa cadastrada.'); return }
        await lancarContasDoMes(uid, contasAtuais)
    })

    document.getElementById('form-conta').addEventListener('submit', async function(evento) {
        evento.preventDefault()
        const nome = document.getElementById('nome-conta').value.trim()
        const valor = document.getElementById('valor-conta').value
        const dia = document.getElementById('dia-conta').value
        if (!nome || !valor || !dia) return
        await addDoc(collection(db, 'usuarios', uid, 'contas'), { nome, valor, dia })
        document.getElementById('form-conta').reset()
    })
}
