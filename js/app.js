import { auth, db } from './firebase.js'
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js"
import {
    collection, addDoc, deleteDoc, doc, onSnapshot, query, getDoc, getDocs, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
import { esconderLoading, configurarHamburger, toast, confirmarAcao } from './utils.js'

configurarHamburger()

let todasTransacoes = []
let filtros = { tipo: '', categoria: '', inicio: '', fim: '', busca: '', carteira: '' }
let modoSemana = false

onAuthStateChanged(auth, function(usuario) {
    if (!usuario) {
        window.location.href = 'login.html'
    } else {
        esconderLoading()
        iniciar(usuario.uid)
    }
})

document.getElementById('btn-logout').addEventListener('click', function() {
    signOut(auth).then(function() { window.location.href = 'login.html' })
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

function adicionarMeses(dataStr, qtd) {
    const d = new Date(dataStr + 'T00:00:00')
    d.setMonth(d.getMonth() + qtd)
    return d.toISOString().split('T')[0]
}

function aplicarFiltros() {
    let filtradas = todasTransacoes
    if (filtros.tipo)      filtradas = filtradas.filter(function(t) { return t.tipo === filtros.tipo })
    if (filtros.categoria) filtradas = filtradas.filter(function(t) { return t.categoria === filtros.categoria })
    if (filtros.inicio)    filtradas = filtradas.filter(function(t) { return t.data >= filtros.inicio })
    if (filtros.fim)       filtradas = filtradas.filter(function(t) { return t.data <= filtros.fim })
    if (filtros.busca)     filtradas = filtradas.filter(function(t) {
        return t.descricao.toLowerCase().includes(filtros.busca.toLowerCase())
    })
    if (filtros.carteira)  filtradas = filtradas.filter(function(t) {
        return (t.carteira || '') === filtros.carteira
    })
    renderizarTransacoes(filtradas)
}

async function verificarLimite(uid) {
    const snap = await getDoc(doc(db, 'usuarios', uid, 'dados', 'configuracoes'))
    if (!snap.exists()) return
    const limite = Number(snap.data().limiteMensal || 0)
    if (!limite) return

    const agora = new Date()
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    const ano = String(agora.getFullYear())
    const despesas = todasTransacoes
        .filter(function(t) { return t.tipo === 'despesa' && t.data && t.data.startsWith(`${ano}-${mes}`) })
        .reduce(function(s, t) { return s + Number(t.valor) }, 0)

    const banner = document.getElementById('limite-banner')
    if (despesas > limite) {
        banner.style.display = 'flex'
        banner.textContent = `⚠ Limite mensal excedido! Despesas: R$ ${despesas.toFixed(2)} / Limite: R$ ${limite.toFixed(2)}`
    } else {
        banner.style.display = 'none'
    }
}

async function processarRecorrentes(uid) {
    const agora = new Date()
    const mes = String(agora.getMonth() + 1).padStart(2, '0')
    const ano = String(agora.getFullYear())
    const chave = `${ano}-${mes}`

    const refLanc = doc(db, 'usuarios', uid, 'lancamentos_recorrentes', chave)
    const snapLanc = await getDoc(refLanc)
    if (snapLanc.exists()) return

    const recorrentes = todasTransacoes.filter(function(t) { return t.recorrente === true })
    if (recorrentes.length === 0) return

    const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const mesAntStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`
    const jaExiste = todasTransacoes.some(function(t) { return t.data && t.data.startsWith(chave) && t.recorrente })
    if (jaExiste) return

    for (const t of recorrentes) {
        if (t.data && t.data.startsWith(mesAntStr)) {
            await addDoc(collection(db, 'usuarios', uid, 'transacoes'), {
                descricao: t.descricao,
                valor: t.valor,
                tipo: t.tipo,
                categoria: t.categoria,
                data: `${chave}-${t.data.split('-')[2]}`,
                recorrente: true
            })
        }
    }
    await setDoc(refLanc, { processadoEm: new Date().toISOString() })
    toast('Transações recorrentes lançadas!')
}

async function carregarSelectCategorias(uid) {
    const select = document.getElementById('categoria')
    const selectFiltro = document.getElementById('filtro-categoria-filtro')
    const snap = await getDoc(doc(db, 'usuarios', uid, 'dados', 'categorias'))
    const categorias = snap.exists() ? snap.data().lista : ['alimentacao', 'transporte', 'lazer', 'saude', 'outros']

    select.innerHTML = ''
    selectFiltro.innerHTML = '<option value="">Todas as categorias</option>'
    categorias.forEach(function(nome) {
        const cap = nome.charAt(0).toUpperCase() + nome.slice(1)
        const opt1 = document.createElement('option')
        opt1.value = nome; opt1.textContent = cap
        select.appendChild(opt1)
        const opt2 = document.createElement('option')
        opt2.value = nome; opt2.textContent = cap
        selectFiltro.appendChild(opt2)
    })
}

async function carregarSelectCarteiras(uid) {
    const selectForm = document.getElementById('carteira')
    const selectFiltro = document.getElementById('filtro-carteira')
    if (!selectForm || !selectFiltro) return

    const snap = await getDocs(collection(db, 'usuarios', uid, 'carteiras'))
    const carteiras = []
    snap.forEach(function(d) { carteiras.push(d.data().nome) })

    selectForm.innerHTML = '<option value="">Nenhuma</option>'
    selectFiltro.innerHTML = '<option value="">Todas as carteiras</option>'
    carteiras.forEach(function(nome) {
        const opt1 = document.createElement('option')
        opt1.value = nome; opt1.textContent = nome
        selectForm.appendChild(opt1)
        const opt2 = document.createElement('option')
        opt2.value = nome; opt2.textContent = nome
        selectFiltro.appendChild(opt2)
    })
}

function configurarImportCSV(uid) {
    const btnAbrir = document.getElementById('btn-importar-csv')
    const overlay  = document.getElementById('csv-modal-overlay')
    if (!btnAbrir || !overlay) return

    let linhas  = []
    let headers = []

    btnAbrir.addEventListener('click', function() { overlay.classList.add('visivel') })
    document.getElementById('csv-modal-fechar').addEventListener('click', function() {
        overlay.classList.remove('visivel')
    })
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.classList.remove('visivel')
    })

    function parsearCSV() {
        const sep = document.getElementById('csv-separador').value
        const texto = document.getElementById('csv-file-input')._conteudo || ''
        if (!texto) return

        const todasLinhas = texto.trim().split('\n').map(function(l) { return l.trim() })
        if (todasLinhas.length < 2) { toast('Arquivo vazio ou inválido.', 'aviso'); return }

        headers = todasLinhas[0].split(sep).map(function(h) { return h.replace(/"/g, '').trim() })
        linhas  = todasLinhas.slice(1).map(function(l) {
            return l.split(sep).map(function(v) { return v.replace(/"/g, '').trim() })
        }).filter(function(l) { return l.some(function(v) { return v }) })

        const mapeamento = document.getElementById('csv-mapeamento')
        const campos = [
            { id: 'map-data',     label: 'Coluna Data' },
            { id: 'map-descricao', label: 'Coluna Descrição' },
            { id: 'map-valor',    label: 'Coluna Valor' }
        ]
        mapeamento.innerHTML = campos.map(function(c) {
            const opts = headers.map(function(h, i) { return `<option value="${i}">${h}</option>` }).join('')
            return `<div class="campo"><label>${c.label}</label><select id="${c.id}">${opts}</select></div>`
        }).join('')

        // Auto-detectar colunas por nome
        headers.forEach(function(h, i) {
            const hl = h.toLowerCase()
            if (hl.includes('data') || hl.includes('date'))
                document.getElementById('map-data').value = i
            if (hl.includes('desc') || hl.includes('hist') || hl.includes('memo') || hl.includes('lancamento'))
                document.getElementById('map-descricao').value = i
            if (hl.includes('valor') || hl.includes('amount') || hl.includes('debito') || hl.includes('credito'))
                document.getElementById('map-valor').value = i
        })

        const preview = document.getElementById('csv-preview')
        const amostra = linhas.slice(0, 5)
        preview.innerHTML = `
            <table>
                <thead><tr>${headers.map(function(h) { return `<th>${h}</th>` }).join('')}</tr></thead>
                <tbody>${amostra.map(function(l) {
                    return `<tr>${l.map(function(v) { return `<td>${v}</td>` }).join('')}</tr>`
                }).join('')}</tbody>
            </table>
            <p class="csv-preview-info">${linhas.length} linha(s) encontrada(s)</p>`
    }

    document.getElementById('csv-file-input').addEventListener('change', function() {
        const file = this.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = function(e) {
            document.getElementById('csv-file-input')._conteudo = e.target.result
            parsearCSV()
        }
        reader.readAsText(file, 'latin1')
    })
    document.getElementById('csv-separador').addEventListener('change', parsearCSV)

    document.getElementById('csv-btn-importar').addEventListener('click', async function() {
        if (!linhas.length) { toast('Nenhum dado para importar.', 'aviso'); return }
        const iData  = Number(document.getElementById('map-data').value)
        const iDesc  = Number(document.getElementById('map-descricao').value)
        const iValor = Number(document.getElementById('map-valor').value)
        const cat    = document.getElementById('csv-categoria').value || 'outros'

        let importados = 0
        for (const linha of linhas) {
            const descricao = linha[iDesc] || ''
            const valorRaw  = (linha[iValor] || '0').replace(',', '.').replace(/[^0-9.\-]/g, '')
            const valor     = parseFloat(valorRaw)
            if (isNaN(valor) || !descricao) continue

            const dataRaw = linha[iData] || ''
            let data = new Date().toISOString().split('T')[0]
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataRaw)) {
                const [d, m, a] = dataRaw.split('/')
                data = `${a}-${m}-${d}`
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataRaw)) {
                data = dataRaw
            }

            await addDoc(collection(db, 'usuarios', uid, 'transacoes'), {
                descricao,
                valor: Math.abs(valor).toFixed(2),
                tipo: valor < 0 ? 'despesa' : 'receita',
                categoria: cat,
                data
            })
            importados++
        }
        toast(`${importados} transações importadas!`)
        overlay.classList.remove('visivel')
    })
}

function criarItemTransacao(t) {
    const item = document.createElement('li')
    const badgeRec      = t.recorrente ? '<span class="badge-recorrente">🔄 recorrente</span>' : ''
    const badgeCarteira = t.carteira   ? `<span class="badge-carteira">${t.carteira}</span>`   : ''
    item.innerHTML = `
        <div>
            <div class="item-descricao">${t.descricao}${badgeRec}${badgeCarteira}</div>
            <div class="item-categoria">${t.categoria} · ${t.data}</div>
        </div>
        <div class="item-direita">
            <div class="item-valor">R$ ${Number(t.valor).toFixed(2)}</div>
            <span class="item-tipo ${t.tipo}">${t.tipo}</span>
        </div>
        <button class="btn-excluir" data-id="${t.id}">×</button>
    `
    return item
}

function configurarBotoesExcluir(container) {
    container.querySelectorAll('.btn-excluir').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            const ok = await confirmarAcao('Excluir esta transação?')
            if (!ok) return
            await deleteDoc(doc(db, 'usuarios', window._uid, 'transacoes', btn.dataset.id))
        })
    })
}

function renderizarPorSemana(transacoes, lista) {
    const semanas = {}
    const ordenadas = [...transacoes].sort(function(a, b) {
        return (b.data || '') > (a.data || '') ? 1 : -1
    })
    ordenadas.forEach(function(t) {
        if (!t.data) return
        const d = new Date(t.data + 'T00:00:00')
        const dom = new Date(d)
        dom.setDate(d.getDate() - d.getDay())
        const chave = dom.toISOString().split('T')[0]
        if (!semanas[chave]) {
            const sab = new Date(dom)
            sab.setDate(dom.getDate() + 6)
            semanas[chave] = { dom, sab, items: [] }
        }
        semanas[chave].items.push(t)
    })

    const fmt = function(d) { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }
    Object.keys(semanas).sort().reverse().forEach(function(chave) {
        const s = semanas[chave]
        const rec  = s.items.filter(function(t) { return t.tipo === 'receita' }).reduce(function(a, t) { return a + Number(t.valor) }, 0)
        const desp = s.items.filter(function(t) { return t.tipo === 'despesa' }).reduce(function(a, t) { return a + Number(t.valor) }, 0)
        const saldo = rec - desp

        const header = document.createElement('li')
        header.className = 'semana-header'
        header.innerHTML = `
            <span>${fmt(s.dom)} – ${fmt(s.sab)}</span>
            <span style="color: ${saldo >= 0 ? '#2d6a4f' : '#c0392b'}">Saldo: R$ ${saldo.toFixed(2)}</span>`
        lista.appendChild(header)
        s.items.forEach(function(t) { lista.appendChild(criarItemTransacao(t)) })
    })
    configurarBotoesExcluir(lista)
}

function renderizarTransacoes(transacoes) {
    const lista = document.getElementById('lista-transacoes')
    lista.innerHTML = ''

    if (transacoes.length === 0) {
        lista.innerHTML = '<li style="color: var(--label); padding: 12px 0; font-size: 14px;">Nenhuma transação encontrada.</li>'
        return
    }

    if (modoSemana) {
        renderizarPorSemana(transacoes, lista)
    } else {
        transacoes.forEach(function(t) { lista.appendChild(criarItemTransacao(t)) })
        configurarBotoesExcluir(lista)
    }
}

function atualizarResumo(transacoes) {
    const receitas = transacoes
        .filter(function(t) { return t.tipo === 'receita' })
        .reduce(function(soma, t) { return soma + Number(t.valor) }, 0)
    const despesas = transacoes
        .filter(function(t) { return t.tipo === 'despesa' })
        .reduce(function(soma, t) { return soma + Number(t.valor) }, 0)
    const saldo = receitas - despesas
    document.getElementById('total-receitas').textContent = 'R$ ' + receitas.toFixed(2)
    document.getElementById('total-despesas').textContent = 'R$ ' + despesas.toFixed(2)
    document.getElementById('saldo-total').textContent    = 'R$ ' + saldo.toFixed(2)
}

function iniciar(uid) {
    window._uid = uid
    carregarSelectCategorias(uid)
    carregarSelectCarteiras(uid)
    configurarImportCSV(uid)

    const q = query(collection(db, 'usuarios', uid, 'transacoes'))
    let primeira = true
    onSnapshot(q, async function(snapshot) {
        todasTransacoes = []
        snapshot.forEach(function(d) { todasTransacoes.push({ id: d.id, ...d.data() }) })
        aplicarFiltros()
        atualizarResumo(todasTransacoes)
        verificarLimite(uid)
        if (primeira) {
            primeira = false
            await processarRecorrentes(uid)
        }
    })

    // Form de nova transação
    document.getElementById('form-transacao').addEventListener('submit', async function(evento) {
        evento.preventDefault()
        const parcelas = Number(document.getElementById('parcelas').value) || 1
        const baseData = document.getElementById('data').value
        const base = {
            descricao: document.getElementById('descricao').value,
            valor:     document.getElementById('valor').value,
            tipo:      document.getElementById('tipo').value,
            categoria: document.getElementById('categoria').value,
            data:      baseData,
            recorrente: document.getElementById('recorrente').checked,
            carteira:  document.getElementById('carteira').value
        }

        try {
            if (parcelas > 1) {
                const valorParcela = (Number(base.valor) / parcelas).toFixed(2)
                for (let i = 0; i < parcelas; i++) {
                    await addDoc(collection(db, 'usuarios', uid, 'transacoes'), {
                        ...base,
                        descricao:  `${base.descricao} (${i + 1}/${parcelas})`,
                        valor:      valorParcela,
                        data:       adicionarMeses(baseData, i),
                        recorrente: false
                    })
                }
                toast(`${parcelas} parcelas adicionadas!`)
            } else {
                await addDoc(collection(db, 'usuarios', uid, 'transacoes'), base)
                toast('Transação adicionada!')
            }
            document.getElementById('form-transacao').reset()
        } catch(e) {
            toast('Erro ao salvar transação.', 'erro')
        }
    })

    // Filtros
    document.getElementById('filtro-tipo').addEventListener('change', function() {
        filtros.tipo = this.value; aplicarFiltros()
    })
    document.getElementById('filtro-categoria-filtro').addEventListener('change', function() {
        filtros.categoria = this.value; aplicarFiltros()
    })
    document.getElementById('filtro-data-inicio').addEventListener('change', function() {
        filtros.inicio = this.value; aplicarFiltros()
    })
    document.getElementById('filtro-data-fim').addEventListener('change', function() {
        filtros.fim = this.value; aplicarFiltros()
    })
    document.getElementById('filtro-busca').addEventListener('input', function() {
        filtros.busca = this.value; aplicarFiltros()
    })
    const filtroCarteira = document.getElementById('filtro-carteira')
    if (filtroCarteira) {
        filtroCarteira.addEventListener('change', function() {
            filtros.carteira = this.value; aplicarFiltros()
        })
    }

    document.getElementById('btn-limpar-filtros').addEventListener('click', function() {
        filtros = { tipo: '', categoria: '', inicio: '', fim: '', busca: '', carteira: '' }
        document.getElementById('filtro-tipo').value            = ''
        document.getElementById('filtro-categoria-filtro').value = ''
        document.getElementById('filtro-data-inicio').value     = ''
        document.getElementById('filtro-data-fim').value        = ''
        document.getElementById('filtro-busca').value           = ''
        if (filtroCarteira) filtroCarteira.value                 = ''
        aplicarFiltros()
    })
    document.getElementById('btn-exportar-csv').addEventListener('click', exportarCSV)

    // Semana toggle
    const btnSemana = document.getElementById('btn-semanas')
    if (btnSemana) {
        btnSemana.addEventListener('click', function() {
            modoSemana = !modoSemana
            btnSemana.classList.toggle('ativa', modoSemana)
            btnSemana.textContent = modoSemana ? 'Ver lista simples' : 'Agrupar por semana'
            aplicarFiltros()
        })
    }
}

function exportarCSV() {
    if (todasTransacoes.length === 0) { toast('Nenhuma transação para exportar.', 'aviso'); return }
    const linhas = [['Descrição', 'Categoria', 'Tipo', 'Data', 'Valor', 'Recorrente', 'Carteira']]
    todasTransacoes.forEach(function(t) {
        linhas.push([`"${t.descricao}"`, t.categoria, t.tipo, t.data,
            Number(t.valor).toFixed(2), t.recorrente ? 'Sim' : 'Não', t.carteira || ''])
    })
    const csv = '﻿' + linhas.map(function(l) { return l.join(';') }).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'transacoes.csv'; a.click()
    URL.revokeObjectURL(url)
    toast('CSV exportado!')
}
