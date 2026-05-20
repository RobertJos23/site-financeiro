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
    const btn = document.getElementById('btn-menu')
    const nav = document.querySelector('nav')
    if (!btn || !nav) return

    btn.addEventListener('click', function(e) {
        e.stopPropagation()
        nav.classList.toggle('aberta')
        btn.textContent = nav.classList.contains('aberta') ? '✕' : '☰'
    })

    nav.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            nav.classList.remove('aberta')
            btn.textContent = '☰'
        })
    })

    document.addEventListener('click', function() {
        nav.classList.remove('aberta')
        btn.textContent = '☰'
    })
}
