// Verifica se um canal esta transmitindo: lista -> qualidade -> trecho de video -> lista andando (ao vivo).
const UA = 'VLC/3.0.21 LibVLC/3.0.21';

// Faz os pedidos da extensao parecerem os de um player (sem Origin/Referer de navegador).
async function regras() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [1],
      addRules: [{
        id: 1, priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: [
          { header: 'user-agent', operation: 'set', value: UA },
          { header: 'origin', operation: 'remove' },
          { header: 'referer', operation: 'remove' }
        ] },
        condition: { tabIds: [-1], resourceTypes: ['xmlhttprequest', 'other', 'media'] }
      }]
    });
  } catch (e) {}
}
chrome.runtime.onInstalled.addListener(regras);
chrome.runtime.onStartup.addListener(regras);
regras();

const dormir = ms => new Promise(r => setTimeout(r, ms));
const texto = b => new TextDecoder().decode(b);

async function baixar(url, ms, max) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: ctl.signal });
    let buf = new Uint8Array(0);
    if (r.ok && r.body) {
      const rd = r.body.getReader();
      while (buf.length < max) {
        const { done, value } = await rd.read();
        if (done) break;
        const n = new Uint8Array(buf.length + value.length); n.set(buf); n.set(value, buf.length); buf = n;
      }
      try { rd.cancel(); } catch (e) {}
    }
    return { r, buf, url: r.url || url };
  } finally { clearTimeout(t); ctl.abort(); }
}
const semResposta = (e, alvo) => ({ s: 'off', d: e && e.name === 'AbortError' ? `${alvo} não respondeu a tempo.` : `${alvo} não responde (fora do ar ou link errado).` });
const segmentos = txt => [...txt.matchAll(/#EXTINF[^\n]*\n\s*([^#\s][^\n]*)/g)].map(m => m[1].trim());
const sequencia = txt => (txt.match(/#EXT-X-MEDIA-SEQUENCE:\s*(\d+)/) || [])[1] || '';

async function verificar(url, kind) {
  if (!/^https?:\/\//i.test(url)) return { s: 'unk', d: 'Links RTMP/UDP não podem ser verificados.' };
  let p;
  try { p = await baixar(url, 12000, 262144); } catch (e) { return semResposta(e, 'O canal'); }
  if (!p.r.ok) return { s: 'off', d: `O canal respondeu com erro ${p.r.status}.` };
  if (!p.buf.length) return { s: 'off', d: 'O canal respondeu vazio.' };
  let lista = texto(p.buf);
  if (!/^\s*#EXTM3U/.test(lista)) {
    if (/^\s*</.test(lista)) return { s: 'off', d: 'O link abre uma página, não um vídeo.' };
    return { s: 'ok', d: 'O canal está enviando vídeo.' };
  }
  let base = p.url, listaUrl = p.url;
  if (/#EXT-X-STREAM-INF/.test(lista)) {
    const vars = [...lista.matchAll(/#EXT-X-STREAM-INF:([^\n]*)\n\s*([^#\s][^\n]*)/g)]
      .map(m => ({ bw: parseInt((m[1].match(/BANDWIDTH=(\d+)/) || [])[1] || '0', 10), uri: m[2].trim() }))
      .sort((a, b) => a.bw - b.bw);
    if (!vars.length) return { s: 'off', d: 'A lista do canal está sem vídeo.' };
    listaUrl = new URL(vars[0].uri, base).href;
    try { p = await baixar(listaUrl, 12000, 524288); } catch (e) { return semResposta(e, 'A qualidade de vídeo'); }
    if (!p.r.ok) return { s: 'off', d: `A qualidade de vídeo dá erro ${p.r.status}.` };
    lista = texto(p.buf); base = listaUrl = p.url;
  }
  const segs = segmentos(lista);
  if (!segs.length) return { s: 'off', d: 'A lista do canal está sem vídeo.' };
  const seg = new URL(segs[segs.length - 1], base).href;
  let s;
  try { s = await baixar(seg, 15000, 4096); } catch (e) { return semResposta(e, 'O vídeo do canal'); }
  if (!s.r.ok) return { s: 'off', d: `O vídeo do canal dá erro ${s.r.status}.` };
  if (!s.buf.length) return { s: 'off', d: 'O vídeo do canal veio vazio.' };
  if (/#EXT-X-ENDLIST/.test(lista)) return { s: 'ok', d: 'Vídeo disponível (gravado, não é ao vivo).' };
  if (kind && kind !== 'live') return { s: 'ok', d: 'O vídeo respondeu corretamente.' };

  // Ao vivo (kind === 'live'): a lista precisa andar (novos trechos chegando).
  const seq0 = sequencia(lista), ult0 = segs[segs.length - 1];
  const td = Math.min(Math.max(parseFloat((lista.match(/#EXT-X-TARGETDURATION:\s*([\d.]+)/) || [])[1]) || 6, 2), 10);
  for (let i = 0; i < 2; i++) {
    await dormir((td + 1) * 1000);
    try {
      const q = await baixar(listaUrl, 12000, 524288);
      if (!q.r.ok) continue;
      const l2 = texto(q.buf), s2 = segmentos(l2);
      if (sequencia(l2) !== seq0 || (s2.length && s2[s2.length - 1] !== ult0)) return { s: 'ok', d: 'Transmitindo ao vivo.' };
    } catch (e) {}
  }
  return { s: 'off', d: 'A transmissão está parada: a lista do canal não recebe vídeo novo.' };
}

chrome.runtime.onMessage.addListener((msg, _sender, responder) => {
  if (msg && msg.tipo === 'verificar' && typeof msg.url === 'string') {
    verificar(msg.url, msg.kind).then(responder, () => responder({ s: 'unk', d: 'Não deu para verificar.' }));
    return true;
  }
  return false;
});
