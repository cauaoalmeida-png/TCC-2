// Variável global para guardar os dados que vieram do banco
let estoqueAtual = [];
let pecaSelecionada = null;
// Peças marcadas para excluir em lote (ids)
const pecasMarcadas = new Set();
let pecasVisiveis = [];

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
    if (!isOperator()) document.getElementById('selecaoBar').hidden = false;
    if (!isOperator()) iaAtiva().then(ativa => { document.getElementById('iaNotaBox').hidden = !ativa; });
});

// Mesma lista de Back-end/src/categorias.js
const CATEGORIAS_PECA = ['Fixação', 'Elétrico', 'Mecânico', 'Hidráulico', 'Pneumático', 'Lubrificação', 'Insumo', 'Outro'];

// Busca sem diferenciar acento nem maiúscula ("oleo" acha "Óleo").
function semAcento(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Categoria fora da lista conta como "Outro".
function categoriaDaPeca(p) {
    return CATEGORIAS_PECA.includes(p.categoria) ? p.categoria : 'Outro';
}

// Texto da quantidade conforme a unidade: "32 litros", "1 metro", "500 unidades".
const NOMES_UNIDADE = {
    un: ['unidade', 'unidades'], kg: ['kg', 'kg'], m: ['metro', 'metros'],
    l: ['litro', 'litros'], cx: ['caixa', 'caixas']
};
function rotuloQuantidade(p) {
    const nomes = NOMES_UNIDADE[String(p.unidade || 'un').toLowerCase()];
    const texto = nomes ? nomes[p.qtd === 1 ? 0 : 1] : String(p.unidade);
    return `${texto} ${p.qtd === 1 ? 'disponível' : 'disponíveis'}`;
}

function escapeHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function getStatusEstoque(p) {
    if (!(p.min > 0) && p.qtd > 0) return { label:'Sem mínimo', cls:'bar-ok', status:'sem-minimo' };
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
    const fBusca = semAcento(document.getElementById('filterBusca').value);

    if (fCat) pecas = pecas.filter(p => categoriaDaPeca(p) === fCat);
    if (fStatus === 'sem-minimo') pecas = pecas.filter(p => !(p.min > 0));
    else if (fStatus) pecas = pecas.filter(p => getStatusEstoque(p).status === fStatus);
    if (fBusca) pecas = pecas.filter(p => semAcento(p.nome).includes(fBusca));

    const grid = document.getElementById('estoqueGrid');

    // Esquece seleções de peças que não existem mais
    const idsExistentes = new Set(estoqueAtual.map(p => p.id));
    [...pecasMarcadas].forEach(id => { if (!idsExistentes.has(id)) pecasMarcadas.delete(id); });
    pecasVisiveis = pecas;
    atualizarSelecao();

    if (!pecas.length) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-boxes"></i><p>Nenhuma peça encontrada.</p></div>`;
        return;
    }

    const pct = p => (p.min > 0 ? Math.min(100, Math.round((p.qtd / (p.min * 2)) * 100)) : 100);

    grid.innerHTML = pecas.map(p => {
        const st = getStatusEstoque(p);
        const semMinimo = !(p.min > 0);
        const alertaBaixa = !semMinimo && p.qtd <= p.min;
        return `
        <div class="estoque-card${pecasMarcadas.has(p.id) ? ' selecionada' : ''}">
            <div class="estoque-card-header">
                ${isOperator() ? '' : `<label class="estoque-check" title="Selecionar para excluir"><input type="checkbox" aria-label="Selecionar ${escapeHTML(p.nome)}" onchange="marcarPeca(${p.id}, this.checked)" ${pecasMarcadas.has(p.id) ? 'checked' : ''}></label>`}
                <div style="flex:1"><h3>${escapeHTML(p.nome)}</h3><p>${escapeHTML(categoriaDaPeca(p))} · ${escapeHTML(p.unidade || 'un')}</p></div>
                <span class="badge ${st.status==='ok'?'badge-success':st.status==='baixo'||st.status==='sem-minimo'?'badge-warning':'badge-danger'}">${st.label}</span>
            </div>
            <div class="estoque-card-body">
                <div class="estoque-qty">${p.qtd}</div>
                <div class="estoque-qty-label">${escapeHTML(rotuloQuantidade(p))}</div>
                <div class="estoque-bar-wrap">
                    <div class="estoque-bar-bg"><div class="estoque-bar-fill ${st.cls}" style="width:${pct(p)}%"></div></div>
                </div>
                <div class="estoque-min">Mínimo: <strong>${semMinimo ? 'não definido' : `${p.min} ${escapeHTML(p.unidade || 'un')}`}</strong></div>
                <div class="alerta-gerente ${alertaBaixa?'show':''}">
                    <i class="fas fa-exclamation-triangle"></i> Estoque abaixo do mínimo! Repor urgente.
                </div>
                <div class="alerta-gerente alerta-sem-minimo ${semMinimo?'show':''}">
                    <i class="fas fa-bell-slash"></i> Sem estoque mínimo: esta peça nunca vai gerar alerta.${isOperator() ? '' : ' Defina o mínimo.'}
                </div>
            </div>
            ${isOperator() ? '' : `
            <div class="estoque-card-footer">
                <button class="btn btn-primary btn-sm" onclick="abrirUsar(${p.id})"><i class="fas fa-minus"></i> Usar Peça</button>
                <button class="btn btn-success btn-sm" onclick="abrirRepor(${p.id})"><i class="fas fa-plus"></i> Repor</button>
                <button class="btn-del btn-minimo" onclick="abrirMinimo(${p.id})" title="Definir estoque mínimo" aria-label="Definir estoque mínimo de ${escapeHTML(p.nome)}"><i class="fas fa-bell"></i></button>
                <button class="btn-del" onclick="deletePeca(${p.id})" title="Excluir peça" aria-label="Excluir ${escapeHTML(p.nome)}"><i class="fas fa-trash"></i></button>
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

    if (!nome || isNaN(qtd) || isNaN(min)) { avisar('Preencha todos os campos obrigatórios.'); return; }
    if (min < 1) { avisar('O estoque mínimo precisa ser pelo menos 1, senão a peça nunca gera alerta.'); return; }

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
        } else {
            const dados = await resposta.json().catch(() => ({}));
            avisar(dados.erro || 'Não foi possível cadastrar a peça.', 'erro');
        }
    } catch (erro) {
        avisar('Erro ao comunicar com o servidor.');
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
        avisar('Erro ao atualizar banco.');
    }
}

// ESTOQUE MÍNIMO
function abrirMinimo(id) {
    pecaSelecionada = id;
    const peca = estoqueAtual.find(p => p.id === id);
    document.getElementById('minimoNome').textContent = peca ? peca.nome : '';
    document.getElementById('qtdMinimo').value = peca && peca.min > 0 ? peca.min : '';
    document.getElementById('erroMinimo').style.display = 'none';
    document.getElementById('modalMinimo').classList.add('open');
    document.getElementById('qtdMinimo').focus();
}

async function confirmarMinimo() {
    const min = parseInt(document.getElementById('qtdMinimo').value);
    const erroEl = document.getElementById('erroMinimo');
    if (!(min >= 1)) { erroEl.textContent = 'Informe um mínimo de pelo menos 1.'; erroEl.style.display = 'block'; return; }
    try {
        const resposta = await fetch(`${API_BASE_URL}/atualizar-peca/${pecaSelecionada}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ min })
        });
        if (!resposta.ok) {
            const dados = await resposta.json().catch(() => ({}));
            erroEl.textContent = dados.erro || 'Não foi possível salvar.';
            erroEl.style.display = 'block';
            return;
        }
        document.getElementById('modalMinimo').classList.remove('open');
        renderEstoque();
    } catch (erro) {
        avisar('Erro ao atualizar banco.');
    }
}

// REPOR PEÇA (ATUALIZAR BANCO)
async function confirmarReposicao() {
    const qtdAdicionada = parseInt(document.getElementById('qtdRepor').value);
    if (!qtdAdicionada || qtdAdicionada <= 0) { avisar('Quantidade inválida.'); return; }
    
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
        avisar('Erro ao atualizar banco.');
    }
}

// DELETAR PEÇA
async function deletePeca(id) {
    if (!(await confirmar('Excluir esta peça do estoque?', { titulo: 'Excluir peça', ok: 'Excluir', perigo: true }))) return;

    try {
        await fetch(`${API_BASE_URL}/deletar-peca/${id}`, { method: 'DELETE' });
        renderEstoque();
    } catch (erro) {
        avisar('Erro ao deletar do servidor.');
    }
}

// ==========================================
// EXCLUIR VÁRIAS PEÇAS DE UMA VEZ
// ==========================================
function marcarPeca(id, marcada) {
    if (marcada) pecasMarcadas.add(id); else pecasMarcadas.delete(id);
    renderEstoque();
}

function atualizarSelecao() {
    const total = pecasMarcadas.size;
    document.getElementById('selecaoContagem').textContent = total
        ? `${total} ${total === 1 ? 'peça selecionada' : 'peças selecionadas'}`
        : 'Nenhuma selecionada';
    const botao = document.getElementById('excluirSelecionadosBtn');
    botao.disabled = total === 0;
    botao.innerHTML = `<i class="fas fa-trash"></i> Excluir selecionadas${total ? ` (${total})` : ''}`;
    const todos = document.getElementById('selecionarTodos');
    const marcadasVisiveis = pecasVisiveis.filter(p => pecasMarcadas.has(p.id)).length;
    todos.checked = pecasVisiveis.length > 0 && marcadasVisiveis === pecasVisiveis.length;
    todos.indeterminate = marcadasVisiveis > 0 && marcadasVisiveis < pecasVisiveis.length;
}

// "Selecionar todas" respeita os filtros: marca só as peças que estão na lista
document.getElementById('selecionarTodos').addEventListener('change', e => {
    pecasVisiveis.forEach(p => { if (e.target.checked) pecasMarcadas.add(p.id); else pecasMarcadas.delete(p.id); });
    renderEstoque();
});

document.getElementById('excluirSelecionadosBtn').addEventListener('click', async function() {
    const ids = [...pecasMarcadas];
    if (!ids.length) return;
    const nomes = estoqueAtual.filter(p => pecasMarcadas.has(p.id)).map(p => p.nome);
    const exemplo = nomes.slice(0, 5).join(', ') + (nomes.length > 5 ? ` e mais ${nomes.length - 5}` : '');
    const tudo = ids.length === estoqueAtual.length;
    const ok = await confirmar(
        `${tudo ? 'Isso vai esvaziar o estoque inteiro' : `Excluir ${ids.length} ${ids.length === 1 ? 'peça' : 'peças'}`}: ${exemplo}. Essa ação não pode ser desfeita.`,
        { titulo: tudo ? 'Esvaziar estoque' : 'Excluir peças', ok: `Excluir ${ids.length}`, perigo: true }
    );
    if (!ok) return;

    this.disabled = true;
    try {
        const resposta = await fetch(`${API_BASE_URL}/deletar-pecas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
        });
        const dados = await resposta.json().catch(() => ({}));
        if (!resposta.ok) {
            avisar(dados.erro || 'Erro ao excluir as peças.', 'erro');
        } else {
            pecasMarcadas.clear();
            avisar(`${dados.excluidas} ${dados.excluidas === 1 ? 'peça excluída' : 'peças excluídas'}.`, 'sucesso');
        }
    } catch (erro) {
        avisar('Erro ao comunicar com o servidor.', 'erro');
    }
    renderEstoque();
});

// ==========================================
// ENTRADA PELA NOTA FISCAL (IA)
// A IA lê a nota (foto, PDF ou XML) e sugere as entradas; a chefia confere.
// ==========================================
let iaNotaItens = [];

// Mínimo inicial das peças novas que entram pela nota: 20% do que chegou (pelo menos 1).
function minimoSugerido(qtd) {
    return Math.max(1, Math.ceil(qtd * 0.2));
}

async function lerArquivoNota(file) {
    if (/xml/i.test(file.type) || /\.xml$/i.test(file.name)) {
        return { xml: await file.text() };
    }
    if (file.type === 'application/pdf') {
        if (file.size > 3 * 1024 * 1024) throw new Error('PDF muito grande. Envie até 3 MB.');
        return { arquivo: { mediaType: 'application/pdf', data: await iaLerBase64(file) } };
    }
    // Nota em foto precisa de mais resolução para os números ficarem legíveis.
    return { arquivo: await iaReduzirFoto(file, 2000) };
}

document.getElementById('iaNotaArquivo').addEventListener('change', e => {
    const file = e.target.files[0];
    document.getElementById('iaNotaNome').textContent = file ? file.name : 'Escolher nota fiscal';
});

document.getElementById('iaNotaBtn').addEventListener('click', async function() {
    const file = document.getElementById('iaNotaArquivo').files[0];
    const caixaErro = document.getElementById('iaNotaErro');
    iaMostrarErro(caixaErro, '');
    document.getElementById('iaNotaOk').hidden = true;
    document.getElementById('iaNotaResultado').hidden = true;
    if (!file) {
        iaMostrarErro(caixaErro, 'Escolha a foto, o PDF ou o XML da nota.');
        return;
    }

    let corpo;
    try {
        corpo = await lerArquivoNota(file);
    } catch (erro) {
        iaMostrarErro(caixaErro, erro.message || 'Não foi possível ler esse arquivo.');
        return;
    }

    iaCarregando(this, true, 'Lendo a nota...');
    const { dados, erro } = await iaChamar('/ia/nota-fiscal', corpo);
    iaCarregando(this, false);
    if (erro) {
        iaMostrarErro(caixaErro, erro);
        return;
    }
    if (!dados.itens.length) {
        iaMostrarErro(caixaErro, 'A IA não encontrou peças nessa nota.');
        return;
    }

    iaNotaItens = dados.itens;
    const partes = [dados.fornecedor, dados.numero ? `NF ${dados.numero}` : ''].filter(Boolean);
    document.getElementById('iaNotaCabecalho').textContent = partes.length ? partes.join(' · ') : 'Itens encontrados na nota:';

    // Lista fixa: o que a IA leu não pode ser alterado aqui. A chefia só
    // confirma a entrada de tudo ou cancela.
    const corpoTabela = document.getElementById('iaNotaItens');
    corpoTabela.replaceChildren();
    iaNotaItens.forEach(item => {
        const tr = document.createElement('tr');
        const celula = texto => {
            const td = document.createElement('td');
            td.textContent = texto;
            return td;
        };
        const tdPeca = document.createElement('td');
        if (item.pecaId) {
            tdPeca.textContent = `${item.nomeAtual} (tem ${item.quantidadeAtual}, soma)`;
        } else {
            const novo = document.createElement('span');
            novo.className = 'ia-novo';
            novo.textContent = 'NOVA ';
            tdPeca.append(novo, `${item.nomeSugerido} · ${item.categoria}`);
        }
        const descricao = celula(item.descricao);
        descricao.className = 'nf-descricao';
        tr.append(descricao, tdPeca, celula(String(item.quantidade)), celula(item.unidade));
        corpoTabela.appendChild(tr);
    });
    document.getElementById('iaNotaResultado').hidden = false;
});

document.getElementById('iaNotaCancelarBtn').addEventListener('click', () => {
    iaNotaItens = [];
    document.getElementById('iaNotaResultado').hidden = true;
    document.getElementById('iaNotaArquivo').value = '';
    document.getElementById('iaNotaNome').textContent = 'Escolher nota fiscal';
});

document.getElementById('iaNotaAplicarBtn').addEventListener('click', async function() {
    const caixaErro = document.getElementById('iaNotaErro');
    iaMostrarErro(caixaErro, '');
    const selecionados = iaNotaItens
        .filter(item => item.quantidade > 0)
        .map(item => ({ pecaId: item.pecaId, nome: item.nomeSugerido, categoria: item.categoria, unidade: item.unidade, qtd: item.quantidade }));
    if (!selecionados.length) {
        iaMostrarErro(caixaErro, 'Nenhum item para dar entrada.');
        return;
    }

    iaCarregando(this, true, 'Dando entrada...');
    let feitos = 0;
    try {
        const resposta = await fetch(`${API_BASE_URL}/pecas`);
        const estoque = await resposta.json();
        for (const item of selecionados) {
            const atual = item.pecaId ? estoque.find(p => p.id === item.pecaId) : null;
            const r = atual
                ? await fetch(`${API_BASE_URL}/atualizar-peca/${atual.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qtd: atual.qtd + item.qtd })
                })
                    .then(resp => { if (resp.ok) atual.qtd += item.qtd; return resp; })
                : await fetch(`${API_BASE_URL}/cadastrar-peca`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: item.nome, categoria: item.categoria, qtd: item.qtd, min: minimoSugerido(item.qtd), unidade: item.unidade })
                });
            if (r.ok) feitos++;
        }
    } catch (erro) {
        console.error('Erro ao dar entrada da nota:', erro);
    }
    iaCarregando(this, false);

    document.getElementById('iaNotaResultado').hidden = true;
    const ok = document.getElementById('iaNotaOk');
    ok.textContent = feitos === selecionados.length
        ? `Entrada feita em ${feitos} peça(s). Peças novas ganharam estoque mínimo de 20% da quantidade da nota; ajuste pelo sino de cada peça se precisar.`
        : `Entrada feita em ${feitos} de ${selecionados.length} peça(s). Confira o estoque abaixo.`;
    ok.hidden = false;
    renderEstoque();
});
