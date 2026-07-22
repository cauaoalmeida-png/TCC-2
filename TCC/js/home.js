// home.js — lógica da página inicial

document.addEventListener('DOMContentLoaded', function () {

  // Lê contadores do localStorage (gerados pelo restante do app)
  function getCount(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.length;
      if (typeof parsed === 'object' && parsed !== null) return Object.keys(parsed).length;
      return fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getPendentes() {
    try {
      const raw = localStorage.getItem('ft_ocorrencias');
      if (!raw) return 3;
      const lista = JSON.parse(raw);
      return lista.filter(o => o.status === 'aberta' || o.status === 'pendente').length || 3;
    } catch (e) {
      return 3;
    }
  }

  // Atualiza os números no DOM
  document.getElementById('cnt-setores').textContent    = getCount('ft_setores', 4);
  document.getElementById('cnt-maquinas').textContent   = getCount('ft_maquinas', 7);
  document.getElementById('cnt-ocorrencias').textContent = getCount('ft_ocorrencias', 5);
  document.getElementById('cnt-pendentes').textContent  = getPendentes();

});
