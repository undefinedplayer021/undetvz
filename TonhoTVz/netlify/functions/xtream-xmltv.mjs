// Guia de programacao: /xmltv.php -> usa o EPG configurado no Montador, se houver.
import { EPG, autenticar, texto } from '../lib/comum.mjs';

export default async (req) => {
  const q = new URL(req.url).searchParams;
  if (!autenticar(q.get('username'), q.get('password'))) return texto('Acesso negado', 403);
  if (EPG) return new Response(null, { status: 302, headers: { Location: EPG } });
  return texto('<?xml version="1.0" encoding="UTF-8"?>\n<tv></tv>\n', 200, 'application/xml; charset=utf-8');
};

export const config = { path: '/xmltv.php' };
