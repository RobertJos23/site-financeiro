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
}
