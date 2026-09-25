// Lista M3U com login: /get.php?username=...&password=...&type=m3u_plus
const { DATA, EPG, autenticar, hostDe } = require('../lib/comum.js');

const attr = s => String(s || '').replace(/"/g, "'");
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const u = autenticar(q.username, q.password);
  if (!u) return { statusCode: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'Acesso negado' };
  const base = `https://${hostDe(event)}/live/${encodeURIComponent(u.usuario)}/${encodeURIComponent(u.senha)}/`;
  const ext = q.output === 'ts' ? 'ts' : 'm3u8';
  const nomes = new Map(DATA.cats.map(c => [c.category_id, c.category_name]));
  const linhas = [EPG ? `#EXTM3U x-tvg-url="${attr(EPG)}"` : '#EXTM3U'];
  DATA.streams.forEach(s => {
    linhas.push(`#EXTINF:-1 tvg-id="${attr(s.epg_channel_id)}" tvg-name="${attr(s.name)}" tvg-logo="${attr(s.stream_icon)}" group-title="${attr(nomes.get(s.category_id))}",${s.name}`);
    linhas.push(`${base}${s.stream_id}.${ext}`);
  });
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'audio/x-mpegurl; charset=utf-8', 'Content-Disposition': 'inline; filename="lista.m3u"', 'Cache-Control': 'no-store' },
    body: linhas.join('\n') + '\n'
  };
};
