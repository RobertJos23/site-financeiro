if ('serviceWorker' in navigator) {
    const base = window.location.pathname.includes('/pages/') ? '../sw.js' : 'sw.js'
    navigator.serviceWorker.register(base).catch(function() {})
}

export function esconderLoading() {
    const el = document.getElementById('loading')
    if (!el) return
    el.style.opacity = '0'
    setTimeout(function() { el.style.display = 'none' }, 300)
}

export function toast(mensagem, tipo) {
    tipo = tipo || 'sucesso'
    const t = document.createElement('div')
    t.className = 'toast toast-' + tipo
    t.textContent = mensagem
    document.body.appendChild(t)
    requestAnimationFrame(function() {
        requestAnimationFrame(function() { t.classList.add('visivel') })
    })
    setTimeout(function() {
        t.classList.remove('visivel')
        setTimeout(function() { t.remove() }, 300)
    }, 3000)
}

export function configurarHamburger() {
    const btnMenu = document.getElementById('btn-menu')
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('sidebar-overlay')
    const btnFechar = document.getElementById('btn-fechar-sidebar')
    if (!btnMenu || !sidebar) return

    function abrirSidebar() {
        sidebar.classList.add('aberta')
        if (overlay) overlay.classList.add('visivel')
    }

    function fecharSidebar() {
        sidebar.classList.remove('aberta')
        if (overlay) overlay.classList.remove('visivel')
    }

    btnMenu.addEventListener('click', abrirSidebar)
    if (btnFechar) btnFechar.addEventListener('click', fecharSidebar)
    if (overlay) overlay.addEventListener('click', fecharSidebar)

    ativarLinkAtual()
}

export function ativarLinkAtual() {
    const atual = window.location.pathname.split('/').pop() || 'index.html'
    document.querySelectorAll('.sidebar-nav a').forEach(function(a) {
        if (a.getAttribute('href').split('/').pop() === atual) {
            a.classList.add('ativa')
        }
    })
}

export function confirmarAcao(mensagem) {
    return new Promise(function(resolve) {
        const overlay = document.createElement('div')
        overlay.className = 'confirm-overlay'
        overlay.innerHTML = `
            <div class="confirm-box">
                <p class="confirm-msg">${mensagem}</p>
                <div class="confirm-btns">
                    <button class="confirm-cancelar">Cancelar</button>
                    <button class="confirm-ok">Excluir</button>
                </div>
            </div>
        `
        document.body.appendChild(overlay)
        requestAnimationFrame(function() { overlay.classList.add('visivel') })

        overlay.querySelector('.confirm-ok').addEventListener('click', function() {
            overlay.remove(); resolve(true)
        })
        overlay.querySelector('.confirm-cancelar').addEventListener('click', function() {
            overlay.remove(); resolve(false)
        })
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) { overlay.remove(); resolve(false) }
        })
    })
}
