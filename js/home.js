// home.js — lógica da página inicial (contadores buscados do banco de dados)

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const [resSetores, resMaquinas, resOcorrencias] = await Promise.all([
      fetch(`${API_BASE_URL}/setores`),
      fetch(`${API_BASE_URL}/maquinas`),
      fetch(`${API_BASE_URL}/ocorrencias`)
    ]);

    const setores = await resSetores.json();
    const maquinas = await resMaquinas.json();
    const ocorrencias = await resOcorrencias.json();

    document.getElementById('cnt-setores').textContent = setores.length;
    document.getElementById('cnt-maquinas').textContent = maquinas.length;
    document.getElementById('cnt-ocorrencias').textContent = ocorrencias.length;
    document.getElementById('cnt-pendentes').textContent =
      ocorrencias.filter(o => o.status === 'Pendente').length;
  } catch (erro) {
    console.error('Erro ao carregar estatísticas do servidor:', erro);
  }
});
