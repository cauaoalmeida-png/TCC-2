// Variável global para guardar os dados que vieram do banco
let estoqueAtual = [];
let pecaSelecionada = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    try { clearNextUrl && clearNextUrl(); } catch (e) {}

    // Operador só consulta o estoque: o cadastro de peças some e os cartões não têm botões
    if (isOperator()) {
        const cadastro = document.querySelector('.nova-peca-panel');
        if (cadastro) cadastro.remove();
    }

    // Carrega o estoque ao abrir a página
    renderEstoque();
});

function escapeHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function getStatusEstoque(p) {
    if (p.qtd <= 0) return { label:'Sem estoque', cls:'bar-danger', status:'critico' };
    if (p.qtd <= p.min) return { label:'Estoque crítico', cls:'bar-danger', status:'critico' };
    if (p.qtd <= p.min * 1.5) return { label:'Estoque baixo', cls:'bar-warning', status:'baixo' };
    return { label:'Estoque OK', cls:'bar-ok', status:'ok' };
}

// BUSCAR do Banco de Dados e Renderizar
async function renderEstoque() {
    try {
        const resposta = await fetch(`${API_BASE_URL}/pecas`);
        estoqueAtual = await resposta.json();
    } catch (erro) {
        console.error('Erro ao buscar do servidor:', erro);
        return;
    }

    let pecas = [...estoqueAtual];
    const fCat = document.getElementById('filterCategoria').value;
    const fStatus = document.getElementById('filterStatus').value;
    const fBusca = document.getElementById('filterBusca').value.toLowerCase();

    if (fCat) pecas = pecas.filter(p => p.categoria === fCat);
    if (fStatus) pecas = pecas.filter(p => getStatusEstoque(p).status === fStatus);
    if (fBusca) pecas = pecas.filter(p => p.nome.toLowerCase().includes(fBusca));

    const grid = document.getElementById('estoqueGrid');

    if (!pecas.length) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-boxes"></i><p>Nenhuma peça encontrada.</p></div>`;
        return;
    }

    const pct = p => Math.min(100, Math.round((p.qtd / (p.min * 2)) * 100));

    grid.innerHTML = pecas.map(p => {
        const st = getStatusEstoque(p);
        const alertaBaixa = p.qtd <= p.min;
        return `
        <div class="estoque-card">
            <div class="estoque-card-header">
                <div><h3>${escapeHTML(p.nome)}</h3><p>${escapeHTML(p.categoria || 'Sem categoria')} · ${escapeHTML(p.unidade || 'un')}</p></div>
                <span class="badge ${st.status==='ok'?'badge-success':st.status==='baixo'?'badge-warning':'badge-danger'}">${st.label}</span>
            </div>
            <div class="estoque-card-body">
                <div class="estoque-qty">${p.qtd}</div>
                <div class="estoque-qty-label">unidades disponíveis</div>
                <div class="estoque-bar-wrap">
                    <div class="estoque-bar-bg"><div class="estoque-bar-fill ${st.cls}" style="width:${pct(p)}%"></div></div>
                </div>
                <div class="estoque-min">Mínimo: <strong>${p.min} ${escapeHTML(p.unidade || 'un')}</strong></div>
                <div class="alerta-gerente ${alertaBaixa?'show':''}">
                    <i class="fas fa-exclamation-triangle"></i> Estoque abaixo do mínimo! Repor urgente.
                </div>
            </div>
            ${isOperator() ? '' : `
            <div class="estoque-card-footer">
                <button class="btn btn-primary btn-sm" onclick="abrirUsar(${p.id})"><i class="fas fa-minus"></i> Usar Peça</button>
                <button class="btn btn-success btn-sm" onclick="abrirRepor(${p.id})"><i class="fas fa-plus"></i> Repor</button>
                <button class="btn-del" onclick="deletePeca(${p.id})" title="Excluir peça" aria-label="Excluir peça"><i class="fas fa-trash"></i></button>
            </div>`}
        </div>`;
    }).join('');
}

// ADICIONAR NOVO ITEM
async function addPeca() {
    const nome = document.getElementById('pecaNome').value.trim();
    const qtd = parseInt(document.getElementById('pecaQtd').value);
    const min = parseInt(document.getElementById('pecaMin').value);
    const categoria = document.getElementById('pecaCategoria').value;
    const unidade = document.getElementById('pecaUnidade').value;

    if (!nome || isNaN(qtd) || isNaN(min)) { alert('Preencha todos os campos obrigatórios.'); return; }

    try {
        const resposta = await fetch(`${API_BASE_URL}/cadastrar-peca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, categoria, qtd, min, unidade })
        });

        if (resposta.status === 201) {
            document.getElementById('pecaNome').value = '';
            document.getElementById('pecaQtd').value = '';
            document.getElementById('pecaMin').value = '';
            renderEstoque(); // Recarrega a lista do banco
        }
    } catch (erro) {
        alert('Erro ao comunicar com o servidor.');
    }
}

// MODAIS
function abrirUsar(id) {
    pecaSelecionada = id;
    document.getElementById('qtdUsar').value = '';
    document.getElementById('erroUsar').style.display = 'none';
    document.getElementById('modalUsar').classList.add('open');
}

function abrirRepor(id) {
    pecaSelecionada = id;
    document.getElementById('qtdRepor').value = '';
    document.getElementById('modalRepor').classList.add('open');
}

// USAR PEÇA (ATUALIZAR BANCO)
async function confirmarUso() {
    const qtdUsada = parseInt(document.getElementById('qtdUsar').value);
    const peca = estoqueAtual.find(p => p.id === pecaSelecionada);
    const erroEl = document.getElementById('erroUsar');

    if (!qtdUsada || qtdUsada <= 0) { erroEl.textContent='Quantidade inválida.'; erroEl.style.display='block'; return; }
    if (qtdUsada > peca.qtd) { erroEl.textContent=`Insuficiente. Disponível: ${peca.qtd}`; erroEl.style.display='block'; return; }

    const novaQtd = peca.qtd - qtdUsada;

    try {
        await fetch(`${API_BASE_URL}/atualizar-peca/${pecaSelecionada}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qtd: novaQtd })
        });
        document.getElementById('modalUsar').classList.remove('open');
        renderEstoque();
    } catch (erro) {
        alert('Erro ao atualizar banco.');
    }
}

// REPOR PEÇA (ATUALIZAR BANCO)
async function confirmarReposicao() {
    const qtdAdicionada = parseInt(document.getElementById('qtdRepor').value);
    if (!qtdAdicionada || qtdAdicionada <= 0) { alert('Quantidade inválida.'); return; }
    
    const peca = estoqueAtual.find(p => p.id === pecaSelecionada);
    const novaQtd = peca.qtd + qtdAdicionada;

    try {
        await fetch(`${API_BASE_URL}/atualizar-peca/${pecaSelecionada}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qtd: novaQtd })
        });
        document.getElementById('modalRepor').classList.remove('open');
        renderEstoque();
    } catch (erro) {
        alert('Erro ao atualizar banco.');
    }
}

// DELETAR PEÇA
async function deletePeca(id) {
    if (!confirm('Excluir esta peça do estoque?')) return;

    try {
        await fetch(`${API_BASE_URL}/deletar-peca/${id}`, { method: 'DELETE' });
        renderEstoque();
    } catch (erro) {
        alert('Erro ao deletar do servidor.');
    }
}
