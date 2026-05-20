import { auth } from './firebase.js'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"

onAuthStateChanged(auth, function(usuario) {
    if (usuario) window.location.href = 'index.html'
})

const abaLogin = document.getElementById('aba-login')
const abaCadastro = document.getElementById('aba-cadastro')
const formLogin = document.getElementById('form-login')
const formCadastro = document.getElementById('form-cadastro')

abaLogin.addEventListener('click', function() {
    formLogin.style.display = 'block'
    formCadastro.style.display = 'none'
    abaLogin.classList.add('ativa')
    abaCadastro.classList.remove('ativa')
})

abaCadastro.addEventListener('click', function() {
    formCadastro.style.display = 'block'
    formLogin.style.display = 'none'
    abaCadastro.classList.add('ativa')
    abaLogin.classList.remove('ativa')
})

formLogin.addEventListener('submit', async function(evento) {
    evento.preventDefault()
    const email = document.getElementById('email-login').value
    const senha = document.getElementById('senha-login').value
    const erro = document.getElementById('erro-login')

    try {
        await signInWithEmailAndPassword(auth, email, senha)
        window.location.href = 'index.html'
    } catch (e) {
        erro.textContent = 'E-mail ou senha incorretos.'
    }
})

formCadastro.addEventListener('submit', async function(evento) {
    evento.preventDefault()
    const email = document.getElementById('email-cadastro').value
    const senha = document.getElementById('senha-cadastro').value
    const erro = document.getElementById('erro-cadastro')

    try {
        await createUserWithEmailAndPassword(auth, email, senha)
        window.location.href = 'index.html'
    } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
            erro.textContent = 'Este e-mail ja esta em uso.'
        } else if (e.code === 'auth/weak-password') {
            erro.textContent = 'A senha precisa ter no minimo 6 caracteres.'
        } else {
            erro.textContent = 'Erro ao criar conta. Tente novamente.'
        }
    }
})
