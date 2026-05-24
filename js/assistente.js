import { auth, db } from '../js/firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    collection, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger } from '../js/utils.js'

const GROQ_KEY = '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'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

configurarHamburger()

let contextoUsuario = ''
let historico = []

onAuthStateChanged(auth, async function(usuario) {
    if (!usuario) {
        window.location.href = '../login.html'
    } else {
        await carregarDados(usuario.uid)
        esconderLoading()
        configurarTema()
        configurarLogout()
        configurarChat()
    }
})

function configurarLogout() {
    document.getElementById('btn-logout').addEventListener('click', function() {
        signOut(auth).then(function() {
            window.location.href = '../login.html'
        })
    })
}

function configurarTema() {
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
}

async function carregarDados(uid) {
    const snapTransacoes = await getDocs(collection(db, 'usuarios', uid, 'transacoes'))
    const transacoes = []
    snapTransacoes.forEach(function(d) { transacoes.push(d.data()) })

    const snapCat = await getDoc(doc(db, 'usuarios', uid, 'dados', 'categorias'))
    const categorias = snapCat.exists() ? snapCat.data().lista : []

    const snapMetas = await getDocs(collection(db, 'usuarios', uid, 'metas'))
    const metas = []
    snapMetas.forEach(function(d) { metas.push(d.data()) })

    const snapContas = await getDocs(collection(db, 'usuarios', uid, 'contas'))
    const contas = []
    snapContas.forEach(function(d) { contas.push(d.data()) })

    const totalReceitas = transacoes
        .filter(function(t) { return t.tipo === 'receita' })
        .reduce(function(s, t) { return s + Number(t.valor) }, 0)

    const totalDespesas = transacoes
        .filter(function(t) { return t.tipo === 'despesa' })
        .reduce(function(s, t) { return s + Number(t.valor) }, 0)

    contextoUsuario = `Voce e um assistente financeiro pessoal. Responda sempre em portugues, de forma clara e objetiva.

Dados financeiros do usuario:

RESUMO:
- Total de receitas: R$ ${totalReceitas.toFixed(2)}
- Total de despesas: R$ ${totalDespesas.toFixed(2)}
- Saldo atual: R$ ${(totalReceitas - totalDespesas).toFixed(2)}

TRANSACOES (${transacoes.length} registradas):
${transacoes.length > 0
    ? transacoes.slice(-30).map(function(t) {
        return '- ' + t.descricao + ': R$ ' + Number(t.valor).toFixed(2) + ' (' + t.tipo + ', ' + t.categoria + ', ' + t.data + ')'
      }).join('\n')
    : 'Nenhuma transacao registrada.'}

CATEGORIAS: ${categorias.length > 0 ? categorias.join(', ') : 'Nenhuma categoria cadastrada.'}

METAS:
${metas.length > 0
    ? metas.map(function(m) {
        return '- ' + m.nome + ': meta R$ ' + Number(m.alvo).toFixed(2) + ', guardado R$ ' + Number(m.guardado || 0).toFixed(2)
      }).join('\n')
    : 'Nenhuma meta cadastrada.'}

CONTAS FIXAS MENSAIS:
${contas.length > 0
    ? contas.map(function(c) {
        return '- ' + c.nome + ': R$ ' + Number(c.valor).toFixed(2) + '/mes'
      }).join('\n')
    : 'Nenhuma conta fixa cadastrada.'}

Com base nesses dados, responda perguntas sobre as financas do usuario e tambem sobre investimentos e moedas.`
}

function configurarChat() {
    document.getElementById('form-chat').addEventListener('submit', async function(evento) {
        evento.preventDefault()
        const input = document.getElementById('input-mensagem')
        const texto = input.value.trim()
        if (!texto) return

        input.value = ''
        adicionarMensagem(texto, 'usuario')

        const btnEnviar = document.getElementById('btn-enviar')
        btnEnviar.disabled = true
        const idDigitando = adicionarMensagem('Digitando...', 'ia', true)

        historico.push({ role: 'user', content: texto })

        try {
            const resposta = await fetch(GROQ_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + GROQ_KEY
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages: [{ role: 'system', content: contextoUsuario }, ...historico]
                })
            })

            const dados = await resposta.json()
            console.log('Groq resposta:', dados)

            if (!resposta.ok) throw new Error(dados.error?.message || resposta.status)

            const textoResposta = dados.choices[0].message.content

            historico.push({ role: 'assistant', content: textoResposta })

            document.getElementById(idDigitando).remove()
            adicionarMensagem(textoResposta, 'ia')
        } catch(e) {
            console.error('Erro Gemini:', e)
            document.getElementById(idDigitando).remove()
            adicionarMensagem('Erro ao conectar com a IA. Tente novamente.', 'ia')
        }

        btnEnviar.disabled = false
    })
}

function adicionarMensagem(texto, tipo, digitando) {
    const area = document.getElementById('area-mensagens')
    const msg = document.createElement('div')
    const id = 'msg-' + Date.now()
    msg.id = id
    msg.className = 'msg msg-' + tipo
    if (digitando) msg.classList.add('msg-digitando')
    msg.textContent = texto
    area.appendChild(msg)
    area.scrollTop = area.scrollHeight
    return id
}
