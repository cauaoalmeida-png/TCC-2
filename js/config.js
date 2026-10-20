const isLocalLiveServer =
  ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  window.location.port === '5500';

const API_BASE_URL = isLocalLiveServer
  ? 'http://localhost:3000'
  : window.location.origin;
const API_URL = API_BASE_URL;

// Página de login. Pelo servidor (local ou Vercel) fica em /sistema,
// porque a raiz do site abre a apresentação. No Live Server usa o arquivo.
const LOGIN_URL = isLocalLiveServer
  ? (window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html')
  : '/sistema';
