// Abre um canal: /live/USUARIO/SENHA/ID.m3u8 (ou .ts) -> manda o app para o link original.
import { DATA, autenticar, texto } from '../lib/comum.mjs';

export default async (req, context) => {
  const p = context.params || {};
  let { u, p: senha, f } = p;
  if (!u || !senha || !f) {
    const m = new URL(req.url).pathname.match(/\/(?:live\/)?([^/]+)\/([^/]+)\/([^/]+)$/);
    if (m) [, u, senha, f] = m;
  }
  u = decodeURIComponent(u || ''); senha = decodeURIComponent(senha || '');
  if (!autenticar(u, senha)) return texto('Acesso negado', 403);
  const id = parseInt(String(f || '').split('.')[0], 10);
  const s = DATA.streams.find(x => x.stream_id === id);
  if (!s) return texto('Canal não encontrado', 404);
  return new Response(null, { status: 302, headers: { Location: s._url, 'Cache-Control': 'no-store' } });
};

export const config = { path: '/live/:u/:p/:f' };
