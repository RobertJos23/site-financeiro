function carregarMetas() {
    return JSON.parse(localStorage.getItem('metas')) || []
}

function salvarMetas(metas) {
    localStorage.setItem('metas', JSON.stringify(metas))
}

function renderizarMetas() {
    const container = document.getElementById('lista-metas')
    container.innerHTML = ''
    const metas = carregarMetas()

    if (metas.length === 0) {
        container.innerHTML = '<p style="color: var(--label);">Nenhuma meta cadastrada.</p>'
        return
    }

    metas.forEach(function(m, indice) {
        const porcentagem = Math.min(100, Math.round((m.guardado / m.alvo) * 100))
        const concluida = porcentagem >= 100

        const card = document.createElement('div')
        card.className = 'meta-card'

        card.innerHTML = `
            <div class="meta-topo">
                <span class="item-descricao">${m.nome}</span>
                <button class="btn-excluir" data-indice="${indice}">🗑</button>
            </div>
            <div class="meta-valores">
                <span>R$ ${Number(m.guardado).toFixed(2)} guardados</span>
                <span>Meta: R$ ${Number(m.alvo).toFixed(2)}</span>
            </div>
            <div class="barra-fundo">
                <div class="barra-progresso ${concluida ? 'concluida' : ''}" style="width: ${porcentagem}%"></div>
            </div>
            <div class="meta-rodape">
                <span class="meta-porcentagem">${porcentagem}%</span>
                ${concluida
                    ? '<span class="meta-badge">Concluida!</span>'
                    : `<div style="display: flex; gap: 8px; align-items: center;">
                            <input type="number" class="input-deposito" placeholder="R$ 0,00" min="0" step="0.01">
                            <button class="btn-deposito" data-indice="${indice}">Adicionar</button>
                       </div>`
                }
            </div>
        `

        container.appendChild(card)
    })

    document.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const indice = Number(btn.dataset.indice)
            const metas = carregarMetas()
            metas.splice(indice, 1)
            salvarMetas(metas)
            renderizarMetas()
        })
    })

    document.querySelectorAll('.btn-deposito').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const indice = Number(btn.dataset.indice)
            const input = btn.previousElementSibling
            const valor = Number(input.value)
            if (!valor || valor <= 0) return

            const metas = carregarMetas()
            metas[indice].guardado = Number(metas[indice].guardado) + valor
            salvarMetas(metas)
            renderizarMetas()
        })
    })
}

const form = document.getElementById('form-meta')
form.addEventListener('submit', function(evento) {
    evento.preventDefault()

    const nome = document.getElementById('nome-meta').value.trim()
    const alvo = document.getElementById('valor-meta').value

    if (!nome || !alvo) return

    const metas = carregarMetas()
    metas.push({ nome: nome, alvo: alvo, guardado: 0 })
    salvarMetas(metas)
    renderizarMetas()
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

renderizarMetas()
