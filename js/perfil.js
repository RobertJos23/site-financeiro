import { auth } from './firebase.js'
import {
    onAuthStateChanged, signOut, updateProfile,
    updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import { esconderLoading, configurarHamburger, toast } from './utils.js'

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

configurarHamburger()

document.getElementById('btn-logout').addEventListener('click', function() {
    signOut(auth).then(function() { window.location.href = '../login.html' })
})

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = '../login.html'
        return
    }
    esconderLoading()
    preencherPerfil(usuario)
    configurarFormNome(usuario)
    configurarFormSenha(usuario)
})

function preencherPerfil(usuario) {
    const avatar = document.getElementById('avatar')
    const nomePerfil = document.getElementById('nome-perfil')
    const emailPerfil = document.getElementById('email-perfil')
    const providerBadge = document.getElementById('provider-badge')

    const isGoogle = usuario.providerData.some(function(p) { return p.providerId === 'google.com' })

    if (usuario.photoURL) {
        const img = document.createElement('img')
        img.src = usuario.photoURL
        img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;'
        avatar.appendChild(img)
    } else {
        const inicial = (usuario.displayName || usuario.email || '?')[0].toUpperCase()
        avatar.textContent = inicial
    }

    nomePerfil.textContent = usuario.displayName || 'Sem nome'
    emailPerfil.textContent = usuario.email

    if (isGoogle) {
        providerBadge.textContent = 'Google'
        document.getElementById('secao-senha').style.display = 'none'
    } else {
        providerBadge.textContent = 'E-mail'
    }
}

function configurarFormNome(usuario) {
    const inputNome = document.getElementById('input-nome')
    inputNome.value = usuario.displayName || ''

    document.getElementById('form-nome').addEventListener('submit', async function(e) {
        e.preventDefault()
        const novoNome = inputNome.value.trim()
        if (!novoNome) return
        try {
            await updateProfile(usuario, { displayName: novoNome })
            document.getElementById('nome-perfil').textContent = novoNome
            toast('Nome atualizado com sucesso!')
        } catch(err) {
            toast('Erro ao atualizar nome.', 'erro')
        }
    })
}

function configurarFormSenha(usuario) {
    document.getElementById('form-senha').addEventListener('submit', async function(e) {
        e.preventDefault()
        const senhaAtual = document.getElementById('senha-atual').value
        const novaSenha = document.getElementById('nova-senha').value

        if (novaSenha.length < 6) {
            toast('A nova senha precisa ter no minimo 6 caracteres.', 'aviso')
            return
        }

        try {
            const credencial = EmailAuthProvider.credential(usuario.email, senhaAtual)
            await reauthenticateWithCredential(usuario, credencial)
            await updatePassword(usuario, novaSenha)
            document.getElementById('form-senha').reset()
            toast('Senha alterada com sucesso!')
        } catch(err) {
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                toast('Senha atual incorreta.', 'erro')
            } else {
                toast('Erro ao alterar senha.', 'erro')
            }
        }
    })
}
