/* ============================================
   AUTH.JS — Sistema de Usuários - FactoryTrack
   Cargos: chefe_geral, gerente, operador
   ============================================ */

const AUTH_USERS_KEY    = 'ft_usuarios';
const AUTH_SESSION_KEY  = 'ft_sessao';

function getUsuarios() { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]'); }
function saveUsuarios(l) { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(l)); }

function getSessao() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY)); } catch { return null; }
}
function saveSessao(u) { sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(u)); }
function clearSessao() { sessionStorage.removeItem(AUTH_SESSION_KEY); }

function temChefe() {
  return getUsuarios().some(u => u.cargo === 'chefe_geral');
}

function temUsuarios() {
  return getUsuarios().length > 0;
}

function registrarUsuario(nome, senha, cargo) {
  const lista = getUsuarios();
  if (lista.find(u => u.nome.toLowerCase() === nome.toLowerCase())) return { ok: false, msg: 'Já existe um usuário com esse nome.' };
  const novoUser = { id: Date.now(), nome, senha, cargo };
  lista.push(novoUser);
  saveUsuarios(lista);
  return { ok: true, user: novoUser };
}

function loginUsuario(nome, senha) {
  const user = getUsuarios().find(u => u.nome.toLowerCase() === nome.toLowerCase() && u.senha === senha);
  if (!user) return { ok: false, msg: 'Nome ou senha incorretos.' };
  saveSessao(user);
  return { ok: true, user };
}

function atualizarCargo(userId, novoCargo) {
  const lista = getUsuarios();
  const idx = lista.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  lista[idx].cargo = novoCargo;
  saveUsuarios(lista);
  return true;
}

function excluirUsuario(userId) {
  saveUsuarios(getUsuarios().filter(u => u.id !== userId));
}

function cargoLabel(cargo) {
  const map = { chefe_geral: 'Chefe Geral', gerente: 'Gerente', operador: 'Operador', pendente: 'Pendente' };
  return map[cargo] || cargo;
}

function cargoBadgeStyle(cargo) {
  const map = {
    chefe_geral: 'background:#fce7f3;color:#9d174d',
    gerente: 'background:#dbeafe;color:#1d4ed8',
    operador: 'background:#dcfce7;color:#16a34a',
    pendente: 'background:#fef9c3;color:#ca8a04'
  };
  return map[cargo] || '';
}


// Capturando o seu formulário do HTML (Verifique se o ID está correto)
const formCadastro = document.getElementById('form-cadastro');

// Só executa esse código se estivermos na página onde esse formulário existe
if (formCadastro) {
    formCadastro.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        // 1. Pegando apenas o cargo e a senha que o usuário digitou na tela
        // ATENÇÃO: Os IDs 'cargo' e 'senha' precisam ser iguais aos que estão no seu HTML
        const cargoDigitado = document.getElementById('nomeInput').value;
        const senhaDigitada = document.getElementById('senhaInput').value;

        // 2. Empacotando os dados para enviar
        const dadosUsuario = {
            cargo: cargoDigitado,
            senha: senhaDigitada
        };

        try {
            // 3. Enviando para o back-end
            const resposta = await fetch(`${API_BASE_URL}/cadastro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosUsuario)
            });

            if (resposta.status === 201) {
                alert('Usuário cadastrado com sucesso no banco de dados!');
                // Redireciona para o login (descomente a linha abaixo se quiser)
                // window.location.href = "login.html"; 
            } else {
                alert('Ops! Ocorreu um erro ao tentar cadastrar.');
            }
        } catch (erro) {
            console.error('Erro na comunicação com o servidor:', erro);
            alert('Erro ao conectar com o servidor. O "node server.js" está rodando?');
        }
    });
}

// 1. Lógica para o formulário de Setor
const formSetor = document.getElementById('form-setor'); // ID do formulário de setor
if (formSetor) {
    formSetor.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const dadosSetor = {
            nome_setor: document.getElementById('setorNome').value, // ID do input de nome
            responsavel: document.getElementById('setorResp').value // ID do input de resp
        };

        await fetch(`${API_BASE_URL}/cadastrar-setor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosSetor)
        });
        alert('Setor adicionado!');
    });
}

// 2. Lógica para o formulário de Máquina
const formMaquina = document.getElementById('form-maquina'); // ID do formulário de máquina
if (formMaquina) {
    formMaquina.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dadosMaquina = {
            nome_maquina: document.getElementById('maqNome').value,
            setor_associado: document.getElementById('maqSetor').value, // ID do campo setor
            numero_serie: document.getElementById('maqSerie').value
        };

        await fetch(`${API_BASE_URL}/cadastrar-maquina`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosMaquina)
        });
        alert('Máquina adicionada!');
    });
}