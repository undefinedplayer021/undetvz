// Lista M3U com login: /get.php?username=...&password=...&type=m3u_plus
import { DATA, EPG, autenticar, texto } from '../lib/comum.mjs';

const attr = s => String(s || '').replace(/"/g, "'");
export default async (req) => {
  const url = new URL(req.url), q = url.searchParams;
  const u = autenticar(q.get('username'), q.get('password'));
  if (!u) return texto('Acesso negado', 403);
  const base = `https://${url.host}/live/${encodeURIComponent(u.usuario)}/${encodeURIComponent(u.senha)}/`;
  const ext = q.get('output') === 'ts' ? 'ts' : 'm3u8';
  const nomes = new Map(DATA.cats.map(c => [c.category_id, c.category_name]));
  const linhas = [EPG ? `#EXTM3U x-tvg-url="${attr(EPG)}"` : '#EXTM3U'];
  DATA.streams.forEach(s => {
    linhas.push(`#EXTINF:-1 tvg-id="${attr(s.epg_channel_id)}" tvg-name="${attr(s.name)}" tvg-logo="${attr(s.stream_icon)}" group-title="${attr(nomes.get(s.category_id))}",${s.name}`);
    linhas.push(`${base}${s.stream_id}.${ext}`);
  });
  return texto(linhas.join('\n') + '\n', 200, 'audio/x-mpegurl; charset=utf-8');
};

export const config = { path: '/get.php' };
