// Base do servidor: le usuarios e canais, confere login e monta as respostas.
import USUARIOS from '../../dados/usuarios.json';
import DADOS from '../../dados/canais.json';

const CANAIS = Array.isArray(DADOS) ? DADOS : (DADOS.canais || []);
export const EPG = Array.isArray(DADOS) ? '' : (DADOS.epg || '');

function fnv(s) {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// IDs estaveis: o mesmo canal mantem o mesmo numero mesmo se a ordem da lista mudar.
function montar() {
  const cats = [], streams = [], catIds = new Map(), usados = new Set(), catUsados = new Set();
  CANAIS.forEach(c => {
    if (!c || !c.url || !c.nome) return;
    const grupo = String(c.grupo || 'Sem grupo').trim();
    if (!catIds.has(grupo)) {
      let id = 1000 + fnv('g:' + norm(grupo)) % 9000;
      while (catUsados.has(id)) id++;
      catUsados.add(id); catIds.set(grupo, id);
      cats.push({ category_id: String(id), category_name: grupo, parent_id: 0 });
    }
    let sid = Number.isInteger(c.id) && c.id > 0 ? c.id : 100000 + fnv('c:' + norm(c.nome)) % 900000;
    while (usados.has(sid)) sid++;
    usados.add(sid);
    const cat = catIds.get(grupo);
    streams.push({
      num: streams.length + 1, name: c.nome, stream_type: 'live', stream_id: sid,
      stream_icon: c.logo || '', epg_channel_id: c.epg || null, added: '0', is_adult: '0',
      category_id: String(cat), category_ids: [cat], custom_sid: '', tv_archive: 0,
      direct_source: '', tv_archive_duration: 0, _url: c.url
    });
  });
  return { cats, streams };
}
export const DATA = montar();

// ---------- Filmes e series ----------
const FILMES = Array.isArray(DADOS) ? [] : (DADOS.filmes || []);
const SERIES = Array.isArray(DADOS) ? [] : (DADOS.series || []);
const extensao = url => { const m = String(url).split('?')[0].match(/\.([a-z0-9]{2,4})$/i); return m ? m[1].toLowerCase() : 'mp4'; };
function idUnico(base, usados) { let id = base; while (usados.has(id)) id++; usados.add(id); return id; }
function categorias(itens, prefixo) {
  const cats = [], ids = new Map(), usados = new Set();
  itens.forEach(x => {
    const g = String(x.grupo || 'Outros').trim();
    if (!ids.has(g)) { const id = idUnico(1000 + fnv(prefixo + norm(g)) % 9000, usados); ids.set(g, id); cats.push({ category_id: String(id), category_name: g, parent_id: 0 }); }
  });
  return { cats, ids };
}
function montarFilmes() {
  const itens = FILMES.filter(f => f && f.nome && f.url);
  const { cats, ids } = categorias(itens, 'fg:');
  const usados = new Set(), lista = [], porId = new Map();
  itens.forEach(f => {
    const g = String(f.grupo || 'Outros').trim(), cat = ids.get(g);
    const id = idUnico(200000 + fnv('f:' + norm(f.nome) + '|' + norm(g)) % 700000, usados);
    const item = {
      num: lista.length + 1, name: f.nome, stream_type: 'movie', stream_id: id, stream_icon: f.logo || '',
      rating: '', rating_5based: 0, added: '0', is_adult: '0', category_id: String(cat), category_ids: [cat],
      container_extension: extensao(f.url), custom_sid: '', direct_source: '',
      _url: f.url, _ano: f.ano || '', _sinopse: f.sinopse || ''
    };
    lista.push(item); porId.set(id, item);
  });
  return { cats, lista, porId };
}
function montarSeries() {
  const itens = SERIES.filter(s => s && s.nome && Array.isArray(s.episodios) && s.episodios.length);
  const { cats, ids } = categorias(itens, 'sg:');
  const usados = new Set(), epUsados = new Set(), lista = [], detalhes = new Map(), epUrl = new Map();
  itens.forEach(s => {
    const g = String(s.grupo || 'Outros').trim(), cat = ids.get(g);
    const sid = idUnico(300000 + fnv('s:' + norm(s.nome) + '|' + norm(g)) % 600000, usados);
    const info = {
      num: lista.length + 1, name: s.nome, series_id: sid, cover: s.logo || '', plot: s.sinopse || '',
      cast: '', director: '', genre: '', releaseDate: '', release_date: '', last_modified: '0',
      rating: '0', rating_5based: 0, backdrop_path: [], youtube_trailer: '', episode_run_time: '0',
      category_id: String(cat), category_ids: [cat]
    };
    lista.push(info);
    const porTemp = {};
    s.episodios.forEach(e => {
      if (!e || !e.url) return;
      const t = parseInt(e.temporada, 10) || 1, n = parseInt(e.episodio, 10) || 1;
      const eid = idUnico(1000000 + fnv('e:' + sid + '|' + t + '|' + n) % 8000000, epUsados);
      epUrl.set(eid, e.url);
      (porTemp[t] = porTemp[t] || []).push({
        id: String(eid), episode_num: n, title: e.titulo || `Episódio ${n}`, container_extension: extensao(e.url),
        info: { movie_image: s.logo || '', plot: '', duration_secs: 0, duration: '' },
        custom_sid: '', added: '0', season: t, direct_source: ''
      });
    });
    Object.values(porTemp).forEach(l => l.sort((a, b) => a.episode_num - b.episode_num));
    const temporadas = Object.keys(porTemp).map(Number).sort((a, b) => a - b).map(t => ({
      air_date: '', episode_count: porTemp[t].length, id: t, name: `Temporada ${t}`, overview: '',
      season_number: t, cover: s.logo || '', cover_big: s.logo || ''
    }));
    detalhes.set(sid, { seasons: temporadas, info: { ...info }, episodes: porTemp });
  });
  return { cats, lista, detalhes, epUrl };
}
export const VOD = montarFilmes();
export const SER = montarSeries();

export function fimDoDia(data) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || '');
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], 26, 59, 59); // 23:59:59 no horario de Brasilia
}
export function autenticar(usuario, senha) {
  if (!usuario || !senha) return null;
  const u = USUARIOS.find(x => x && x.usuario === usuario && x.senha === senha);
  if (!u || u.ativo === false) return null;
  const fim = fimDoDia(u.validade);
  if (fim && Date.now() > fim) return null;
  return u;
}
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
});
export const texto = (msg, status = 200, tipo = 'text/plain; charset=utf-8') => new Response(msg, {
  status, headers: { 'Content-Type': tipo, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
});
export const publico = s => Object.fromEntries(Object.entries(s).filter(([k]) => !k.startsWith('_')));
