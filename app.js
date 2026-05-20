const form = document.getElementById('form-transacao')
const transacoes = JSON.parse(localStorage.getItem('transacoes')) || []

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

renderizarTransacoes()
atualizarResumo()
carregarSelectCategorias()

function carregarSelectCategorias() {
    const select = document.getElementById('categoria')
    const categorias = JSON.parse(localStorage.getItem('categorias')) || ['alimentacao', 'transporte', 'lazer', 'saude', 'outros']
    select.innerHTML = ''
    categorias.forEach(function(nome) {
        const option = document.createElement('option')
        option.value = nome
        option.textContent = nome.charAt(0).toUpperCase() + nome.slice(1)
        select.appendChild(option)
    })
}

form.addEventListener('submit', function(evento) {
    evento.preventDefault()

    const descricao = document.getElementById('descricao').value
    const valor = document.getElementById('valor').value
    const tipo = document.getElementById('tipo').value
    const categoria = document.getElementById('categoria').value
    const data = document.getElementById('data').value

    const transacao = {
        descricao: descricao,
        valor: valor,
        tipo: tipo,
        categoria: categoria,
        data: data
    }

    transacoes.push(transacao)
    localStorage.setItem('transacoes', JSON.stringify(transacoes))
    renderizarTransacoes()
    atualizarResumo()
    form.reset()
})

function renderizarTransacoes() {
    const lista = document.getElementById('lista-transacoes')
    lista.innerHTML = ''

    transacoes.forEach(function(t, indice) {
        const item = document.createElement('li')

        item.innerHTML = `
            <div>
                <div class="item-descricao">${t.descricao}</div>
                <div class="item-categoria">${t.categoria} · ${t.data}</div>
            </div>
            <div class="item-direita">
                <div class="item-valor">R$ ${Number(t.valor).toFixed(2)}</div>
                <span class="item-tipo ${t.tipo}">${t.tipo}</span>
            </div>
            <button class="btn-excluir" data-indice="${indice}">🗑</button>
        `

        lista.appendChild(item)
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const indice = Number(btn.dataset.indice)
            transacoes.splice(indice, 1)
            localStorage.setItem('transacoes', JSON.stringify(transacoes))
            renderizarTransacoes()
            atualizarResumo()
        })
    })
}

function atualizarResumo() {
    const receitas = transacoes
        .filter(function(t) { return t.tipo === 'receita' })
        .reduce(function(soma, t) { return soma + Number(t.valor) }, 0)

    const despesas = transacoes
        .filter(function(t) { return t.tipo === 'despesa' })
        .reduce(function(soma, t) { return soma + Number(t.valor) }, 0)

    const saldo = receitas - despesas

    document.getElementById('total-receitas').textContent = 'R$ ' + receitas.toFixed(2)
    document.getElementById('total-despesas').textContent = 'R$ ' + despesas.toFixed(2)
    document.getElementById('saldo-total').textContent = 'R$ ' + saldo.toFixed(2)
}
