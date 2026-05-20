let graficoRD = null
let graficoCat = null
let graficoMetas = null

function transacoesDoPeriodo(mes, ano) {
    const transacoes = JSON.parse(localStorage.getItem('transacoes')) || []
    return transacoes.filter(function(t) {
        if (!t.data) return false
        const partes = t.data.split('-')
        return partes[0] === String(ano) && partes[1] === mes
    })
}

function renderizarGraficoRD(transacoes) {
    const receitas = transacoes
        .filter(function(t) { return t.tipo === 'receita' })
        .reduce(function(s, t) { return s + Number(t.valor) }, 0)

    const despesas = transacoes
        .filter(function(t) { return t.tipo === 'despesa' })
        .reduce(function(s, t) { return s + Number(t.valor) }, 0)

    if (graficoRD) graficoRD.destroy()

    graficoRD = new Chart(document.getElementById('grafico-receitas-despesas'), {
        type: 'bar',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [receitas, despesas],
                backgroundColor: ['#2d6a4f', '#c0392b']
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    })
}

function renderizarGraficoCategorias(transacoes) {
    const mapa = {}
    transacoes
        .filter(function(t) { return t.tipo === 'despesa' })
        .forEach(function(t) {
            mapa[t.categoria] = (mapa[t.categoria] || 0) + Number(t.valor)
        })

    const labels = Object.keys(mapa)
    const valores = Object.values(mapa)
    const cores = ['#2d6a4f','#c0392b','#2980b9','#e67e22','#8e44ad','#16a085','#d35400']

    if (graficoCat) graficoCat.destroy()

    graficoCat = new Chart(document.getElementById('grafico-categorias'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: valores,
                backgroundColor: cores.slice(0, labels.length)
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    })
}

function renderizarGraficoMetas() {
    const metas = JSON.parse(localStorage.getItem('metas')) || []
    const labels = metas.map(function(m) { return m.nome })
    const porcentagens = metas.map(function(m) {
        return Math.min(100, Math.round((m.guardado / m.alvo) * 100))
    })

    if (graficoMetas) graficoMetas.destroy()

    graficoMetas = new Chart(document.getElementById('grafico-metas'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Progresso (%)',
                data: porcentagens,
                backgroundColor: '#2d6a4f'
            }]
        },
        options: {
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { min: 0, max: 100 } }
        }
    })
}

function renderizarTabela(transacoes) {
    const corpo = document.getElementById('corpo-tabela')
    const msg = document.getElementById('msg-vazia')
    corpo.innerHTML = ''

    if (transacoes.length === 0) {
        msg.style.display = 'block'
        return
    }

    msg.style.display = 'none'
    transacoes.forEach(function(t) {
        const tr = document.createElement('tr')
        tr.innerHTML = `
            <td>${t.descricao}</td>
            <td>${t.categoria}</td>
            <td class="${t.tipo}">${t.tipo}</td>
            <td>${t.data}</td>
            <td>R$ ${Number(t.valor).toFixed(2)}</td>
        `
        corpo.appendChild(tr)
    })
}

function atualizar() {
    const mes = document.getElementById('filtro-mes').value
    const ano = document.getElementById('filtro-ano').value
    const transacoes = transacoesDoPeriodo(mes, ano)

    renderizarGraficoRD(transacoes)
    renderizarGraficoCategorias(transacoes)
    renderizarGraficoMetas()
    renderizarTabela(transacoes)
}

document.getElementById('filtro-mes').addEventListener('change', atualizar)
document.getElementById('filtro-ano').addEventListener('change', atualizar)

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

const agora = new Date()
document.getElementById('filtro-mes').value = String(agora.getMonth() + 1).padStart(2, '0')
document.getElementById('filtro-ano').value = agora.getFullYear()

atualizar()
