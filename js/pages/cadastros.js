  document.addEventListener('DOMContentLoaded', () => {
    const ok = requireRole(GRUPOS_CARGOS.coordenacao);
    if (!ok) {
      document.body.innerHTML = '';
      goBackOrLogin();
      return;
    }
    try { clearNextUrl && clearNextUrl(); } catch (e) {}
    renderSetores();
    renderMaquinas();
    if (temCargo('admin')) {
      document.getElementById('usuariosPanel').style.display = '';
      document.getElementById('cargosPanel').style.display = '';
      preencherSelectCargos(document.getElementById('usuarioCargo'), 'operario');
      renderUsuarios();
      renderNomesCargos();
    }
  });

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

  // ==========================================
  // SETORES — busca, cria e exclui no banco
  // ==========================================
  async function renderSetores() {
    let setores = [];
    try {
      const resposta = await fetch(`${API_BASE_URL}/setores`);
      setores = await resposta.json();
    } catch (erro) {
      console.error('Erro ao buscar setores:', erro);
      return;
    }

    const container = document.getElementById('setorList');
    const maqSel = document.getElementById('maqSetor');

    maqSel.innerHTML = '<option value="">Selecione o setor</option>';
    setores.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.nome_setor; opt.textContent = s.nome_setor;
      maqSel.appendChild(opt);
    });

    if (!setores.length) {
      container.innerHTML = '<div class="empty-cad">Nenhum setor cadastrado.</div>';
      return;
    }
    container.innerHTML = setores.map(s => `
      <div class="cad-item">
        <div class="cad-item-info">
          <h4>${escapeHTML(s.nome_setor)}</h4>
          <p>Resp: ${escapeHTML(s.responsavel)}</p>
        </div>
        <button class="btn-del" onclick="deleteSetor(${s.id})" title="Excluir setor" aria-label="Excluir setor">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');
  }

  async function addSetor() {
    const nome = document.getElementById('setorNome').value.trim();
    const resp = document.getElementById('setorResp').value.trim();

    if (!nome || !resp) { avisar('Preencha nome e responsável.'); return; }

    try {
      const resposta = await fetch(`${API_BASE_URL}/cadastrar-setor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_setor: nome, responsavel: resp })
      });

      if (resposta.status === 201) {
        document.getElementById('setorNome').value = '';
        document.getElementById('setorResp').value = '';
        renderSetores();
        renderMaquinas();
      } else {
        avisar('Erro ao salvar setor no banco de dados.');
      }
    } catch (erro) {
      console.error('Erro na comunicação com o servidor:', erro);
      avisar('Erro de conexão. O servidor está rodando?');
    }
  }

  async function deleteSetor(id) {
    if (!(await confirmar('Excluir este setor?', { titulo: 'Excluir setor', ok: 'Excluir', perigo: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/deletar-setor/${id}`, { method: 'DELETE' });
      renderSetores();
    } catch (erro) {
      console.error(erro);
      avisar('Erro ao excluir setor no servidor.');
    }
  }

  // ==========================================
  // MÁQUINAS — busca, cria e exclui no banco
  // ==========================================
  async function renderMaquinas() {
    let maquinas = [];
    try {
      const resposta = await fetch(`${API_BASE_URL}/maquinas`);
      maquinas = await resposta.json();
    } catch (erro) {
      console.error('Erro ao buscar máquinas:', erro);
      return;
    }

    const container = document.getElementById('maqList');
    if (!maquinas.length) {
      container.innerHTML = '<div class="empty-cad">Nenhuma máquina cadastrada.</div>';
      return;
    }
    container.innerHTML = maquinas.map(m => `
      <div class="cad-item">
        <div class="cad-item-info">
          <h4>${escapeHTML(m.nome_maquina)}</h4>
          <p>${escapeHTML(m.setor_associado)} ${m.numero_serie ? '| ' + escapeHTML(m.numero_serie) : ''}</p>
        </div>
        <button class="btn-del" onclick="deleteMaquina(${m.id})" title="Excluir máquina" aria-label="Excluir máquina">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');
  }

  async function addMaquina() {
    const nome = document.getElementById('maqNome').value.trim();
    const setor = document.getElementById('maqSetor').value;
    const serie = document.getElementById('maqSerie').value.trim();

    if (!nome || !setor) { avisar('Preencha nome e setor.'); return; }

    try {
      const resposta = await fetch(`${API_BASE_URL}/cadastrar-maquina`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_maquina: nome, setor_associado: setor, numero_serie: serie })
      });

      if (resposta.status === 201) {
        document.getElementById('maqNome').value = '';
        document.getElementById('maqSetor').value = '';
        document.getElementById('maqSerie').value = '';
        renderMaquinas();
      } else {
        avisar('Erro ao salvar máquina no banco de dados.');
      }
    } catch (erro) {
      console.error('Erro na comunicação com o servidor:', erro);
      avisar('Erro de conexão. O servidor está rodando?');
    }
  }

  async function deleteMaquina(id) {
    if (!(await confirmar('Excluir esta máquina?', { titulo: 'Excluir máquina', ok: 'Excluir', perigo: true }))) return;
    try {
      await fetch(`${API_BASE_URL}/deletar-maquina/${id}`, { method: 'DELETE' });
      renderMaquinas();
    } catch (erro) {
      console.error(erro);
      avisar('Erro ao excluir máquina no servidor.');
    }
  }

  async function renderUsuarios() {
    const container = document.getElementById('usuarioList');
    try {
      const resposta = await fetch(`${API_BASE_URL}/usuarios`);
      const usuarios = await resposta.json();
      if (!resposta.ok) throw new Error(usuarios.erro || 'Não foi possível listar as contas.');
      container.replaceChildren();
      if (!usuarios.length) {
        container.textContent = 'Nenhuma conta cadastrada.';
        container.className = 'cad-list empty-cad';
        return;
      }
      container.className = 'cad-list';
      usuarios.forEach(usuario => {
        const item = document.createElement('div');
        item.className = 'cad-item';
        const info = document.createElement('div');
        info.className = 'cad-item-info';
        const nome = document.createElement('h4');
        nome.textContent = usuario.nome;
        const identificacao = document.createElement('p');
        identificacao.textContent = `E-mail: ${usuario.usuario} · ${usuario.ativo ? 'Ativo' : 'Desativado'}`;
        info.append(nome, identificacao);

        const acoes = document.createElement('div');
        acoes.className = 'cad-item-actions';
        const cargo = document.createElement('select');
        cargo.setAttribute('aria-label', `Cargo de ${usuario.nome}`);
        preencherSelectCargos(cargo, usuario.cargo);
        cargo.addEventListener('change', () => atualizarCargo(usuario.id, cargo.value));
        const status = document.createElement('button');
        status.className = usuario.ativo ? 'btn-del' : 'btn btn-success btn-sm';
        status.textContent = usuario.ativo ? 'Desativar' : 'Ativar';
        status.addEventListener('click', () => atualizarStatusUsuario(usuario.id, !usuario.ativo));
        acoes.append(cargo, status);
        item.append(info, acoes);
        container.appendChild(item);
      });
    } catch (erro) {
      console.error('Erro ao carregar contas:', erro);
      container.textContent = erro.message;
    }
  }

  async function criarUsuario() {
    const dados = {
      nome: document.getElementById('usuarioNome').value.trim(),
      usuario: document.getElementById('usuarioLogin').value.trim().toLowerCase(),
      senha: document.getElementById('usuarioSenha').value,
      cargo: document.getElementById('usuarioCargo').value
    };
    if (!dados.nome || !dados.usuario || !document.getElementById('usuarioLogin').validity.valid || dados.senha.length < 8) {
      avisar('Informe nome, um e-mail corporativo válido e uma senha com ao menos 8 caracteres.');
      return;
    }
    try {
      const resposta = await fetch(`${API_BASE_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível criar a conta.');
      document.getElementById('usuarioNome').value = '';
      document.getElementById('usuarioLogin').value = '';
      document.getElementById('usuarioSenha').value = '';
      await renderUsuarios();
    } catch (erro) {
      avisar(erro.message);
    }
  }

  async function atualizarCargo(id, cargo) {
    try {
      const resposta = await fetch(`${API_BASE_URL}/usuarios/${id}/cargo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo })
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível atualizar o cargo.');
      await renderUsuarios();
    } catch (erro) {
      avisar(erro.message);
      await renderUsuarios();
    }
  }

  async function atualizarStatusUsuario(id, ativo) {
    try {
      const resposta = await fetch(`${API_BASE_URL}/usuarios/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo })
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível atualizar a conta.');
      await renderUsuarios();
    } catch (erro) {
      avisar(erro.message);
    }
  }

  // ==========================================
  // CARGOS — opções do select e nomes exibidos
  // ==========================================
  function preencherSelectCargos(select, selecionado) {
    select.replaceChildren();
    CARGOS.forEach(codigo => {
      const option = document.createElement('option');
      option.value = codigo;
      option.textContent = cargoLabel(codigo);
      option.selected = codigo === selecionado;
      select.appendChild(option);
    });
  }

  const DESCRICAO_CARGOS = {
    operario: 'Está na máquina. Avisa que ela parou e qual o problema.',
    operador_linha: 'Coordena a linha. Confirma a parada e designa o engenheiro.',
    engenheiro: 'Conserta. Registra o que fez e as peças usadas e fecha a ocorrência.',
    admin: 'Administra o sistema e as contas.'
  };

  async function renderNomesCargos() {
    const container = document.getElementById('cargosNomes');
    let nomes = { ...NOMES_CARGOS_PADRAO };
    try {
      const resposta = await fetch(`${API_BASE_URL}/config/cargos`);
      if (resposta.ok) nomes = (await resposta.json()).nomes;
    } catch (erro) {
      console.error('Erro ao carregar nomes dos cargos:', erro);
    }
    container.replaceChildren();
    CARGOS.forEach(codigo => {
      const grupo = document.createElement('div');
      grupo.className = 'form-group';
      const label = document.createElement('label');
      label.htmlFor = `nomeCargo_${codigo}`;
      label.textContent = NOMES_CARGOS_PADRAO[codigo];
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `nomeCargo_${codigo}`;
      input.maxLength = 40;
      input.value = nomes[codigo] || '';
      input.placeholder = NOMES_CARGOS_PADRAO[codigo];
      const dica = document.createElement('small');
      dica.className = 'label-hint';
      dica.textContent = DESCRICAO_CARGOS[codigo];
      grupo.append(label, input, dica);
      container.appendChild(grupo);
    });
  }

  async function salvarNomesCargos() {
    const nomes = {};
    CARGOS.forEach(codigo => { nomes[codigo] = document.getElementById(`nomeCargo_${codigo}`).value.trim(); });
    try {
      const resposta = await fetch(`${API_BASE_URL}/config/cargos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomes })
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível salvar os nomes.');
      const sessao = getSessao();
      if (sessao) saveSessao({ ...sessao, nomesCargos: resultado.nomes });
      avisar('Nomes dos cargos salvos.', 'sucesso');
      await renderNomesCargos();
      preencherSelectCargos(document.getElementById('usuarioCargo'), document.getElementById('usuarioCargo').value);
      await renderUsuarios();
      const papel = document.querySelector('.header-user-role');
      if (papel) papel.textContent = cargoLabel(sessao.usuario.cargo);
    } catch (erro) {
      avisar(erro.message);
    }
  }
