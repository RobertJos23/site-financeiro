const categoriasPadrao = ['alimentacao', 'transporte', 'lazer', 'saude', 'outros']

function carregarCategorias() {
    const salvas = localStorage.getItem('categorias')
    if (salvas) return JSON.parse(salvas)
    localStorage.setItem('categorias', JSON.stringify(categoriasPadrao))
    return categoriasPadrao
}

function salvarCategorias(categorias) {
    localStorage.setItem('categorias', JSON.stringify(categorias))
}

function calcularTotalCategoria(nome) {
    const transacoes = JSON.parse(localStorage.getItem('transacoes')) || []
    return transacoes
        .filter(function(t) { return t.categoria === nome })
        .reduce(function(soma, t) { return soma + Number(t.valor) }, 0)
}

function renderizarCategorias() {
    const lista = document.getElementById('lista-categorias')
    lista.innerHTML = ''
    const categorias = carregarCategorias()

    categorias.forEach(function(nome) {
        const total = calcularTotalCategoria(nome)
        const item = document.createElement('li')

        item.innerHTML = `
            <div class="item-descricao">${nome}</div>
            <div class="item-total">R$ ${total.toFixed(2)} gastos</div>
            <div class="item-direita">
                ${categoriasPadrao.includes(nome)
                    ? '<span style="color: var(--label); font-size: 12px;">padrão</span>'
                    : `<button class="btn-excluir" data-nome="${nome}">🗑</button>`
                }
            </div>
        `

        lista.appendChild(item)
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const nome = btn.dataset.nome
            const categorias = carregarCategorias()
            const novas = categorias.filter(function(c) { return c !== nome })
            salvarCategorias(novas)
            renderizarCategorias()
        })
    })
}

const form = document.getElementById('form-categoria')
form.addEventListener('submit', function(evento) {
    evento.preventDefault()
    const input = document.getElementById('nome-categoria')
    const nome = input.value.trim().toLowerCase()

    if (!nome) return

    const categorias = carregarCategorias()
    if (categorias.includes(nome)) {
        alert('Essa categoria já existe!')
        return
    }

    categorias.push(nome)
    salvarCategorias(categorias)
    renderizarCategorias()
    input.value = ''
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

renderizarCategorias()
