const isLocalLiveServer =
  ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
  window.location.port === '5500';

const API_BASE_URL = isLocalLiveServer
  ? 'http://localhost:3000'
  : window.location.origin;
const API_URL = API_BASE_URL;
