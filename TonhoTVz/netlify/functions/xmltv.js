// Guia de programacao: /xmltv.php -> usa o EPG configurado no Montador, se houver.
const { EPG, autenticar } = require('../lib/comum.js');

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (!autenticar(q.username, q.password)) return { statusCode: 403, body: 'Acesso negado' };
  if (EPG) return { statusCode: 302, headers: { Location: EPG }, body: '' };
  return { statusCode: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8' }, body: '<?xml version="1.0" encoding="UTF-8"?>\n<tv></tv>\n' };
};
