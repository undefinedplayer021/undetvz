// Ponte entre a pagina do Montador e a extensao. So roda em arquivos locais com "montador" no caminho.
(function () {
  const versao = chrome.runtime.getManifest().version;
  const ola = () => window.postMessage({ src: 'ext-verificador', tipo: 'ola', versao }, '*');
  window.addEventListener('message', ev => {
    if (ev.source !== window || !ev.data || ev.data.src !== 'montador') return;
    const m = ev.data;
    if (m.tipo === 'ping') { ola(); return; }
    if (m.tipo === 'verificar' && typeof m.url === 'string') {
      chrome.runtime.sendMessage({ tipo: 'verificar', url: m.url, kind: m.kind }, res => {
        const erro = chrome.runtime.lastError;
        window.postMessage({ src: 'ext-verificador', tipo: 'resultado', id: m.id, res: erro || !res ? { s: 'unk', d: 'A extensão não respondeu.' } : res }, '*');
      });
    }
  });
  ola();
})();
