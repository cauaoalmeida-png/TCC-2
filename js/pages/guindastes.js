let guindastesAtuais = [];
let guindasteSelecionadoId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireSupervisor()) return;
    try { clearNextUrl && clearNextUrl(); } catch (e) {}

    renderGuindastes();
    renderHistorico();
});

function podeGerenciar() {
    const sess = getSessao();
    return sess && (sess.usuario.cargo === 'gerente' || sess.usuario.cargo === 'chefe_geral');
}

// Escapa texto do usuário antes de injetar no HTML (evita XSS).
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function formatDataCurta(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
}

// BUSCAR guindastes do banco e renderizar
async function renderGuindastes() {
    try {
        const resposta = await fetch(`${API_BASE_URL}/guindastes`);
        guindastesAtuais = await resposta.json();
    } catch (erro) {
        console.error('Erro ao buscar guindastes do servidor:', erro);
        return;
    }

    // Também busca os aluguéis ativos para mostrar cliente/data na tela
    let alugueisAtivos = [];
    try {
        const respAlug = await fetch(`${API_BASE_URL}/alugueis`);
        const todos = await respAlug.json();
        alugueisAtivos = todos.filter(a => a.status === 'Ativo');
    } catch (erro) {
        console.error('Erro ao buscar aluguéis do servidor:', erro);
    }

    // Atualiza o filtro de modelos dinamicamente
    const selModelo = document.getElementById('filterModelo');
    const modeloAtual = selModelo.value;
    const modelosUnicos = [...new Set(guindastesAtuais.map(g => g.modelo))];
    selModelo.innerHTML = '<option value="">Todos os Modelos</option>' +
        modelosUnicos.map(m => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`).join('');
    selModelo.value = modeloAtual;

    let lista = [...guindastesAtuais];
    const fModelo = document.getElementById('filterModelo').value;
    const fStatus = document.getElementById('filterStatus').value;
    if (fModelo) lista = lista.filter(g => g.modelo === fModelo);
    if (fStatus) lista = lista.filter(g => g.status === fStatus);

    const grid = document.getElementById('guindastesGrid');

    if (!lista.length) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-truck-pickup"></i><p>Nenhum guindaste encontrado.</p></div>`;
        return;
    }

    const gerenciar = podeGerenciar();

    grid.innerHTML = lista.map(g => {
        const disponivel = g.status === 'Disponível';
        const aluguel = alugueisAtivos.find(a => a.guindasteId === g.id);

        const bodyHtml = disponivel
            ? `<p class="sem-aluguel">Nenhum aluguel ativo no momento.</p>`
            : aluguel
                ? `<div class="aluguel-info">
                     <p><strong>Cliente:</strong> ${escapeHTML(aluguel.cliente)}</p>
                     <p><strong>Saiu em:</strong> ${formatDataCurta(aluguel.dataLocacao)}</p>
                     <p><strong>Devolução prevista:</strong> ${formatDataCurta(aluguel.dataPrevistaDevolucao)}</p>
                   </div>`
                : `<p class="sem-aluguel">Marcado como alugado, sem registro de aluguel encontrado.</p>`;

        const footerHtml = gerenciar
            ? (disponivel
                ? `<button class="btn btn-primary btn-sm" onclick="abrirModalAlugar(${g.id})"><i class="fas fa-truck-pickup"></i> Alugar</button>
                   <button class="btn-del" onclick="deleteGuindaste(${g.id})" title="Excluir guindaste" aria-label="Excluir guindaste"><i class="fas fa-trash"></i></button>`
                : `<button class="btn btn-success btn-sm" onclick="devolverGuindaste(${aluguel ? aluguel.id : ''})"><i class="fas fa-check"></i> Marcar como Devolvido</button>`)
            : '';

        return `
        <div class="guindaste-card">
            <div class="guindaste-card-header">
                <div><h3>${escapeHTML(g.modelo)}</h3><p>${escapeHTML(g.identificacao || 'Sem identificação')}</p></div>
                <span class="badge ${disponivel ? 'badge-success' : 'badge-danger'}">${g.status}</span>
            </div>
            <div class="guindaste-card-body">${bodyHtml}</div>
            <div class="guindaste-card-footer">${footerHtml}</div>
        </div>`;
    }).join('');
}

// HISTÓRICO
async function renderHistorico() {
    let alugueis = [];
    try {
        const resposta = await fetch(`${API_BASE_URL}/alugueis`);
        alugueis = await resposta.json();
    } catch (erro) {
        console.error('Erro ao buscar histórico de aluguéis:', erro);
        return;
    }

    const tbody = document.getElementById('historicoBody');
    if (!alugueis.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="historico-vazio">Nenhum aluguel registrado ainda.</td></tr>`;
        return;
    }

    tbody.innerHTML = alugueis.map(a => {
        const nomeGuindaste = a.guindaste ? `${escapeHTML(a.guindaste.modelo)} (${escapeHTML(a.guindaste.identificacao || 's/ id')})` : '—';
        const statusBadge = a.status === 'Ativo'
            ? '<span class="badge badge-warning">Ativo</span>'
            : '<span class="badge badge-success">Concluído</span>';
        return `
        <tr>
            <td>${nomeGuindaste}</td>
            <td>${escapeHTML(a.cliente)}</td>
            <td>${formatDataCurta(a.dataLocacao)}</td>
            <td>${formatDataCurta(a.dataPrevistaDevolucao)}</td>
            <td>${a.dataDevolucaoReal ? formatDataCurta(a.dataDevolucaoReal) : '-'}</td>
            <td>${statusBadge}</td>
        </tr>`;
    }).join('');
}

// CADASTRAR NOVO GUINDASTE
async function addGuindaste() {
    const modelo = document.getElementById('guindasteModelo').value.trim();
    const identificacao = document.getElementById('guindasteIdentificacao').value.trim();

    if (!modelo) { alert('Informe o modelo do guindaste.'); return; }

    try {
        const resposta = await fetch(`${API_BASE_URL}/cadastrar-guindaste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelo, identificacao })
        });

        if (resposta.status === 201) {
            document.getElementById('guindasteModelo').value = '';
            document.getElementById('guindasteIdentificacao').value = '';
            renderGuindastes();
        } else {
            alert('Erro ao cadastrar guindaste.');
        }
    } catch (erro) {
        console.error(erro);
        alert('Erro de conexão com o servidor.');
    }
}

// MODAL DE ALUGUEL
function abrirModalAlugar(id) {
    guindasteSelecionadoId = id;
    const g = guindastesAtuais.find(x => x.id === id);
    document.getElementById('modalAlugarGuindasteInfo').textContent = g
        ? `Guindaste: ${g.modelo} (${g.identificacao || 's/ identificação'})`
        : '';
    document.getElementById('aluguelCliente').value = '';
    document.getElementById('aluguelDataDevolucao').value = '';
    document.getElementById('erroAlugar').style.display = 'none';
    document.getElementById('modalAlugar').classList.add('open');
}

async function confirmarAluguel() {
    const cliente = document.getElementById('aluguelCliente').value.trim();
    const dataDevolucao = document.getElementById('aluguelDataDevolucao').value;
    const erroEl = document.getElementById('erroAlugar');

    if (!cliente || !dataDevolucao) {
        erroEl.textContent = 'Preencha o cliente e a data prevista de devolução.';
        erroEl.style.display = 'block';
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE_URL}/alugar-guindaste`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guindasteId: guindasteSelecionadoId,
                cliente,
                dataPrevistaDevolucao: dataDevolucao
            })
        });

        if (resposta.status === 201) {
            document.getElementById('modalAlugar').classList.remove('open');
            renderGuindastes();
            renderHistorico();
        } else {
            const erro = await resposta.json();
            erroEl.textContent = erro.erro || 'Erro ao registrar aluguel.';
            erroEl.style.display = 'block';
        }
    } catch (erro) {
        erroEl.textContent = 'Erro de conexão com o servidor.';
        erroEl.style.display = 'block';
    }
}

// DEVOLVER GUINDASTE
async function devolverGuindaste(aluguelId) {
    if (!aluguelId) { alert('Não foi possível localizar o registro de aluguel deste guindaste.'); return; }
    if (!confirm('Confirmar a devolução deste guindaste?')) return;

    try {
        await fetch(`${API_BASE_URL}/devolver-aluguel/${aluguelId}`, { method: 'PUT' });
        renderGuindastes();
        renderHistorico();
    } catch (erro) {
        alert('Erro ao registrar devolução no servidor.');
    }
}

// DELETAR GUINDASTE
async function deleteGuindaste(id) {
    if (!confirm('Excluir este guindaste do cadastro?')) return;

    try {
        await fetch(`${API_BASE_URL}/deletar-guindaste/${id}`, { method: 'DELETE' });
        renderGuindastes();
    } catch (erro) {
        alert('Erro ao deletar guindaste no servidor.');
    }
}
