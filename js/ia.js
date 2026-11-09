/* ============================================
   IA — funções comuns das telas que usam o Claude
   (Ocorrência, Painel, Histórico, Estoque, Checklist)
   ============================================ */

let iaStatusPromise = null;

// A IA só aparece quando o servidor tem a chave configurada.
function iaAtiva() {
  if (!iaStatusPromise) {
    iaStatusPromise = fetch(`${API_BASE_URL}/ia/status`)
      .then(r => (r.ok ? r.json() : { ativa: false }))
      .then(s => Boolean(s.ativa))
      .catch(() => false);
  }
  return iaStatusPromise;
}

// Reduz a foto para JPEG com no máximo `maxLado` px, para o envio ficar leve.
function iaReduzirFoto(file, maxLado = 1280) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ mediaType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

// Lê um arquivo (ex.: PDF) inteiro em base64.
function iaLerBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Chama uma rota de IA e devolve { dados } ou { erro } com mensagem pronta.
async function iaChamar(rota, corpo) {
  try {
    const resposta = await fetch(`${API_BASE_URL}${rota}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo || {})
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) return { erro: dados.erro || 'A IA não respondeu. Tente de novo.' };
    return { dados };
  } catch (erro) {
    console.error('Falha ao chamar a IA:', erro);
    return { erro: 'Erro na conexão com o servidor. Tente de novo.' };
  }
}

// Mostra "Analisando..." no botão enquanto a IA trabalha.
function iaCarregando(botao, carregando, texto = 'Analisando...') {
  if (carregando) {
    botao.dataset.textoOriginal = botao.innerHTML;
    botao.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${texto}`;
    botao.disabled = true;
  } else {
    botao.innerHTML = botao.dataset.textoOriginal || botao.innerHTML;
    botao.disabled = false;
  }
}

function iaMostrarErro(caixa, mensagem) {
  caixa.textContent = mensagem || '';
  caixa.hidden = !mensagem;
}

// Monta um texto da IA na tela: linhas com "- " viram lista. Sempre com textContent.
function iaRenderTexto(container, texto) {
  container.replaceChildren();
  let lista = null;
  String(texto || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(linha => {
    if (linha.startsWith('- ')) {
      if (!lista) { lista = document.createElement('ul'); container.appendChild(lista); }
      const li = document.createElement('li');
      li.textContent = linha.slice(2);
      lista.appendChild(li);
    } else {
      lista = null;
      const p = document.createElement('p');
      p.textContent = linha;
      container.appendChild(p);
    }
  });
}

// Cria um bloco "título + lista" com textContent.
function iaRenderLista(container, titulo, itens) {
  if (!itens || !itens.length) return;
  const h = document.createElement('h4');
  h.textContent = titulo;
  const ul = document.createElement('ul');
  itens.forEach(texto => {
    const li = document.createElement('li');
    li.textContent = texto;
    ul.appendChild(li);
  });
  container.append(h, ul);
}
