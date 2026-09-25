// Base do servidor: le usuarios e canais, confere login e monta as respostas.
const USUARIOS = require('../../dados/usuarios.json');
const DADOS = require('../../dados/canais.json');

const CANAIS = Array.isArray(DADOS) ? DADOS : (DADOS.canais || []);
const EPG = Array.isArray(DADOS) ? '' : (DADOS.epg || '');

function fnv(s) {
  let h = 0x811c9dc5;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// IDs estaveis: o mesmo canal mantem o mesmo numero mesmo se a ordem da lista mudar.
function montar() {
  const cats = [], streams = [], catIds = new Map(), usados = new Set(), catUsados = new Set();
  CANAIS.forEach((c, i) => {
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
const DATA = montar();

function fimDoDia(data) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || '');
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], 23 + 3, 59, 59); // 23:59:59 no horario de Brasilia
}
function autenticar(usuario, senha) {
  if (!usuario || !senha) return null;
  const u = USUARIOS.find(x => x && x.usuario === usuario && x.senha === senha);
  if (!u || u.ativo === false) return null;
  const fim = fimDoDia(u.validade);
  if (fim && Date.now() > fim) return null;
  return u;
}
function hostDe(event) {
  const h = event.headers || {};
  return h['x-forwarded-host'] || h.host || '';
}
const json = (obj, status = 200) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
  body: JSON.stringify(obj)
});
const publico = s => { const { _url, ...resto } = s; return resto; };

module.exports = { DATA, EPG, autenticar, fimDoDia, hostDe, json, publico };
