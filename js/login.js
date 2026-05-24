import { auth } from './firebase.js'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"

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

const abaLogin    = document.getElementById('aba-login')
const abaCadastro = document.getElementById('aba-cadastro')
const formLogin     = document.getElementById('form-login')
const formCadastro  = document.getElementById('form-cadastro')
const formRecuperar = document.getElementById('form-recuperar')
const separador     = document.getElementById('separador-google')

function mostrar(form) {
    formLogin.style.display    = 'none'
    formCadastro.style.display = 'none'
    formRecuperar.style.display = 'none'
    separador.style.display    = 'none'
    abaLogin.classList.remove('ativa')
    abaCadastro.classList.remove('ativa')
    form.style.display = 'block'
}

abaLogin.addEventListener('click', function() {
    mostrar(formLogin)
    separador.style.display = 'block'
    abaLogin.classList.add('ativa')
})

abaCadastro.addEventListener('click', function() {
    mostrar(formCadastro)
    separador.style.display = 'block'
    abaCadastro.classList.add('ativa')
})

document.getElementById('link-recuperar').addEventListener('click', function(e) {
    e.preventDefault()
    mostrar(formRecuperar)
})

document.getElementById('link-voltar-login').addEventListener('click', function(e) {
    e.preventDefault()
    mostrar(formLogin)
    separador.style.display = 'block'
    abaLogin.classList.add('ativa')
})

formLogin.addEventListener('submit', async function(evento) {
    evento.preventDefault()
    const email = document.getElementById('email-login').value
    const senha = document.getElementById('senha-login').value
    const erro  = document.getElementById('erro-login')
    try {
        await signInWithEmailAndPassword(auth, email, senha)
        window.location.href = 'pages/dashboard.html'
    } catch(e) {
        erro.textContent = 'E-mail ou senha incorretos.'
    }
})

formCadastro.addEventListener('submit', async function(evento) {
    evento.preventDefault()
    const email = document.getElementById('email-cadastro').value
    const senha = document.getElementById('senha-cadastro').value
    const erro  = document.getElementById('erro-cadastro')
    try {
        await createUserWithEmailAndPassword(auth, email, senha)
        window.location.href = 'pages/dashboard.html'
    } catch(e) {
        if (e.code === 'auth/email-already-in-use') {
            erro.textContent = 'Este e-mail já está em uso.'
        } else if (e.code === 'auth/weak-password') {
            erro.textContent = 'A senha precisa ter no mínimo 6 caracteres.'
        } else {
            erro.textContent = 'Erro ao criar conta. Tente novamente.'
        }
    }
})

formRecuperar.addEventListener('submit', async function(evento) {
    evento.preventDefault()
    const email = document.getElementById('email-recuperar').value
    const msg   = document.getElementById('msg-recuperar')
    try {
        await sendPasswordResetEmail(auth, email)
        msg.style.color = '#2d6a4f'
        msg.textContent = 'Link enviado! Verifique seu e-mail.'
    } catch(e) {
        msg.style.color = '#c0392b'
        msg.textContent = 'E-mail não encontrado.'
    }
})

document.getElementById('btn-google').addEventListener('click', async function() {
    const provider = new GoogleAuthProvider()
    try {
        await signInWithPopup(auth, provider)
        window.location.href = 'pages/dashboard.html'
    } catch(e) {
        console.error('Erro login Google:', e)
    }
})
