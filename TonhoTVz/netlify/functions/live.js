// Abre um canal: /live/USUARIO/SENHA/ID.m3u8 -> manda o app para o link original.
const { DATA, autenticar } = require('../lib/comum.js');

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const txt = (status, msg) => ({ statusCode: status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, body: msg });
  if (!autenticar(q.u, q.p)) return txt(403, 'Acesso negado');
  const id = parseInt(String(q.f || '').split('.')[0], 10);
  const s = DATA.streams.find(x => x.stream_id === id);
  if (!s) return txt(404, 'Canal não encontrado');
  return { statusCode: 302, headers: { Location: s._url, 'Cache-Control': 'no-store' }, body: '' };
};
