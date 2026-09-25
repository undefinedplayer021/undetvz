// Abre filme ou episodio: /movie/USUARIO/SENHA/ID.mp4 e /series/USUARIO/SENHA/ID.mp4
import { VOD, SER, autenticar, texto } from '../lib/comum.mjs';

export default async (req, context) => {
  const caminho = new URL(req.url).pathname;
  const p = context.params || {};
  let { u, p: senha, f } = p;
  if (!u || !senha || !f) {
    const m = caminho.match(/\/(?:movie|series)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (m) [, u, senha, f] = m;
  }
  u = decodeURIComponent(u || ''); senha = decodeURIComponent(senha || '');
  if (!autenticar(u, senha)) return texto('Acesso negado', 403);
  const id = parseInt(String(f || '').split('.')[0], 10);
  const url = caminho.startsWith('/series/') ? SER.epUrl.get(id) : (VOD.porId.get(id) || {})._url;
  if (!url) return texto('Vídeo não encontrado', 404);
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });
};

export const config = { path: ['/movie/:u/:p/:f', '/series/:u/:p/:f'] };
