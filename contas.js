function carregarContas() {
    return JSON.parse(localStorage.getItem('contas')) || []
}

function salvarContas(contas) {
    localStorage.setItem('contas', JSON.stringify(contas))
}

function atualizarResumo(contas) {
    const total = contas.reduce(function(soma, c) { return soma + Number(c.valor) }, 0)
    document.getElementById('total-contas').textContent = 'R$ ' + total.toFixed(2)
    document.getElementById('qtd-contas').textContent = contas.length
}

function renderizarContas() {
    const lista = document.getElementById('lista-contas')
    lista.innerHTML = ''
    const contas = carregarContas()

    atualizarResumo(contas)

    if (contas.length === 0) {
        lista.innerHTML = '<p style="color: var(--label);">Nenhuma conta fixa cadastrada.</p>'
        return
    }

    contas.forEach(function(c, indice) {
        const item = document.createElement('li')
        item.innerHTML = `
            <div class="item-descricao">${c.nome}</div>
            <div class="item-total">Vence dia ${c.dia}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="item-total">R$ ${Number(c.valor).toFixed(2)}</div>
                <button class="btn-excluir" data-indice="${indice}">🗑</button>
            </div>
        `
        lista.appendChild(item)
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const indice = Number(btn.dataset.indice)
            const contas = carregarContas()
            contas.splice(indice, 1)
            salvarContas(contas)
            renderizarContas()
        })
    })
}

const form = document.getElementById('form-conta')
form.addEventListener('submit', function(evento) {
    evento.preventDefault()

    const nome = document.getElementById('nome-conta').value.trim()
    const valor = document.getElementById('valor-conta').value
    const dia = document.getElementById('dia-conta').value

    if (!nome || !valor || !dia) return

    const contas = carregarContas()
    contas.push({ nome: nome, valor: valor, dia: dia })
    salvarContas(contas)
    renderizarContas()
    form.reset()
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

renderizarContas()
