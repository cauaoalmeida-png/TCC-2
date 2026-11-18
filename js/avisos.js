/* ============================================
   AVISOS — substituem os balões do navegador (alert/confirm)
   avisar(mensagem, tipo)        aviso no canto da tela, some sozinho
   confirmar(mensagem, opcoes)   janela do sistema; devolve Promise<boolean>
   ============================================ */

(function () {
  const ESTILO = `
  .ft-avisos { position: fixed; top: 1rem; right: 1rem; z-index: 10000; display: flex; flex-direction: column; gap: 0.6rem; max-width: min(380px, calc(100vw - 2rem)); pointer-events: none; }
  .ft-aviso { pointer-events: auto; display: flex; align-items: flex-start; gap: 0.7rem; background: #fff; color: #1a2f4e; border-left: 5px solid var(--primary, #1a2f4e); border-radius: 10px; padding: 0.85rem 1rem; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18); font-family: 'DM Sans', sans-serif; font-size: 0.95rem; line-height: 1.4; animation: ft-entra 0.2s ease-out; }
  .ft-aviso.sucesso { border-left-color: var(--success, #22c55e); }
  .ft-aviso.erro { border-left-color: var(--danger, #ef4444); }
  .ft-aviso.alerta { border-left-color: var(--accent, #FF8C42); }
  .ft-aviso i { margin-top: 0.15rem; font-size: 1.05rem; }
  .ft-aviso.sucesso i { color: var(--success, #22c55e); }
  .ft-aviso.erro i { color: var(--danger, #ef4444); }
  .ft-aviso.alerta i { color: var(--accent, #FF8C42); }
  .ft-aviso .ft-aviso-texto { flex: 1; white-space: pre-line; }
  .ft-aviso button { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 0 0.1rem; }
  .ft-aviso.saindo { opacity: 0; transform: translateX(20px); transition: opacity 0.2s, transform 0.2s; }
  .ft-confirmar-fundo { position: fixed; inset: 0; z-index: 10001; background: rgba(15, 23, 42, 0.55); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: ft-fade 0.15s ease-out; }
  .ft-confirmar { background: #fff; border-radius: 14px; width: 100%; max-width: 420px; padding: 1.5rem; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3); font-family: 'DM Sans', sans-serif; color: #1a2f4e; animation: ft-sobe 0.2s ease-out; }
  .ft-confirmar h3 { font-family: 'Rajdhani', sans-serif; font-size: 1.3rem; margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
  .ft-confirmar h3 i { color: var(--accent, #FF8C42); }
  .ft-confirmar.perigo h3 i { color: var(--danger, #ef4444); }
  .ft-confirmar p { margin: 0 0 1.3rem; color: #475569; line-height: 1.5; white-space: pre-line; }
  .ft-confirmar .ft-botoes { display: flex; justify-content: flex-end; gap: 0.6rem; flex-wrap: wrap; }
  .ft-confirmar .ft-botoes button { border: none; border-radius: 8px; padding: 0.65rem 1.2rem; font-weight: 600; font-size: 0.95rem; cursor: pointer; font-family: inherit; }
  .ft-confirmar .ft-cancelar { background: #e2e8f0; color: #1a2f4e; }
  .ft-confirmar .ft-ok { background: var(--accent, #FF8C42); color: #fff; }
  .ft-confirmar.perigo .ft-ok { background: var(--danger, #ef4444); }
  @keyframes ft-entra { from { opacity: 0; transform: translateX(20px); } }
  @keyframes ft-fade { from { opacity: 0; } }
  @keyframes ft-sobe { from { opacity: 0; transform: translateY(12px); } }
  @media (max-width: 600px) { .ft-avisos { left: 1rem; right: 1rem; max-width: none; } }
  `;

  const ICONES = { sucesso: 'fa-circle-check', erro: 'fa-circle-exclamation', alerta: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const CHAVE_PENDENTE = 'ft_aviso_pendente';

  function prepararEstilo() {
    if (document.getElementById('ft-avisos-estilo')) return;
    const style = document.createElement('style');
    style.id = 'ft-avisos-estilo';
    style.textContent = ESTILO;
    document.head.appendChild(style);
  }

  function caixaDeAvisos() {
    let caixa = document.querySelector('.ft-avisos');
    if (!caixa) {
      caixa = document.createElement('div');
      caixa.className = 'ft-avisos';
      caixa.setAttribute('role', 'status');
      caixa.setAttribute('aria-live', 'polite');
      document.body.appendChild(caixa);
    }
    return caixa;
  }

  // Descobre o tipo pelo texto quando quem chama não informa.
  function tipoPeloTexto(texto) {
    if (/sucesso|salv[oa] com|registrad[oa]|feita|conclu/i.test(texto)) return 'sucesso';
    if (/erro|falha|não foi possível|negado|inválid/i.test(texto)) return 'erro';
    return 'alerta';
  }

  // opcoes.depois = true guarda o aviso para mostrar na próxima tela
  // (útil quando a página vai mudar logo em seguida).
  function avisar(mensagem, tipo, opcoes = {}) {
    const texto = String(mensagem ?? '');
    const tipoFinal = tipo || tipoPeloTexto(texto);
    if (opcoes.depois) {
      try { sessionStorage.setItem(CHAVE_PENDENTE, JSON.stringify({ texto, tipo: tipoFinal })); } catch {}
      return;
    }
    prepararEstilo();
    const aviso = document.createElement('div');
    aviso.className = `ft-aviso ${tipoFinal}`;
    const icone = document.createElement('i');
    icone.className = `fas ${ICONES[tipoFinal] || ICONES.info}`;
    const corpo = document.createElement('div');
    corpo.className = 'ft-aviso-texto';
    corpo.textContent = texto;
    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.setAttribute('aria-label', 'Fechar aviso');
    fechar.textContent = '×';
    aviso.append(icone, corpo, fechar);
    caixaDeAvisos().appendChild(aviso);

    const sair = () => {
      if (!aviso.isConnected) return;
      aviso.classList.add('saindo');
      setTimeout(() => aviso.remove(), 200);
    };
    fechar.addEventListener('click', sair);
    setTimeout(sair, tipoFinal === 'erro' ? 7000 : 4000);
  }

  // opcoes: { titulo, ok, cancelar, perigo }
  function confirmar(mensagem, opcoes = {}) {
    prepararEstilo();
    return new Promise(resolve => {
      const anterior = document.activeElement;
      const fundo = document.createElement('div');
      fundo.className = 'ft-confirmar-fundo';
      const janela = document.createElement('div');
      janela.className = `ft-confirmar${opcoes.perigo ? ' perigo' : ''}`;
      janela.setAttribute('role', 'alertdialog');
      janela.setAttribute('aria-modal', 'true');

      const titulo = document.createElement('h3');
      const icone = document.createElement('i');
      icone.className = `fas ${opcoes.perigo ? 'fa-trash-can' : 'fa-circle-question'}`;
      titulo.append(icone, document.createTextNode(opcoes.titulo || 'Confirmar'));
      const texto = document.createElement('p');
      texto.textContent = String(mensagem ?? '');
      const botoes = document.createElement('div');
      botoes.className = 'ft-botoes';
      const cancelar = document.createElement('button');
      cancelar.type = 'button';
      cancelar.className = 'ft-cancelar';
      cancelar.textContent = opcoes.cancelar || 'Cancelar';
      const ok = document.createElement('button');
      ok.type = 'button';
      ok.className = 'ft-ok';
      ok.textContent = opcoes.ok || 'Confirmar';
      botoes.append(cancelar, ok);
      janela.append(titulo, texto, botoes);
      fundo.appendChild(janela);
      document.body.appendChild(fundo);
      cancelar.focus();

      const fechar = resposta => {
        document.removeEventListener('keydown', teclas, true);
        fundo.remove();
        if (anterior && anterior.focus) anterior.focus();
        resolve(resposta);
      };
      const teclas = e => {
        if (e.key === 'Escape') { e.preventDefault(); fechar(false); }
        if (e.key === 'Tab') {
          e.preventDefault();
          (document.activeElement === ok ? cancelar : ok).focus();
        }
      };
      document.addEventListener('keydown', teclas, true);
      cancelar.addEventListener('click', () => fechar(false));
      ok.addEventListener('click', () => fechar(true));
      fundo.addEventListener('click', e => { if (e.target === fundo) fechar(false); });
    });
  }

  // Mostra o aviso que a tela anterior deixou guardado.
  function mostrarPendente() {
    let pendente = null;
    try {
      pendente = JSON.parse(sessionStorage.getItem(CHAVE_PENDENTE) || 'null');
      sessionStorage.removeItem(CHAVE_PENDENTE);
    } catch {}
    if (pendente?.texto) avisar(pendente.texto, pendente.tipo);
  }

  window.avisar = avisar;
  window.confirmar = confirmar;
  // Qualquer alert() que sobrar vira aviso do sistema, sem balão do navegador.
  window.alert = mensagem => avisar(mensagem);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarPendente);
  else mostrarPendente();
  // Voltar com o botão do navegador pode reabrir a página do cache, sem rodar os scripts.
  window.addEventListener('pageshow', e => { if (e.persisted) mostrarPendente(); });
})();
