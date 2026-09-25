// Responde ao login do IPTV Smarters (padrao Xtream Codes): /player_api.php
const { DATA, autenticar, fimDoDia, hostDe, json, publico } = require('../lib/comum.js');

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const u = autenticar(q.username, q.password);
  if (!u) return json({ user_info: { auth: 0, status: 'Disabled', message: 'Usuário ou senha inválidos' } });

  const acao = q.action || '';
  if (!acao) {
    const agora = new Date();
    const fim = fimDoDia(u.validade);
    const host = hostDe(event);
    return json({
      user_info: {
        username: u.usuario, password: u.senha, message: u.nome ? `Olá, ${u.nome}` : '',
        auth: 1, status: 'Active', exp_date: fim ? String(Math.floor(fim / 1000)) : null,
        is_trial: '0', active_cons: '0', created_at: '0', max_connections: String(u.conexoes || 3),
        allowed_output_formats: ['m3u8', 'ts']
      },
      server_info: {
        url: host, port: '443', https_port: '443', server_protocol: 'https', rtmp_port: '0',
        timezone: 'America/Sao_Paulo', timestamp_now: Math.floor(agora.getTime() / 1000),
        time_now: agora.toISOString().replace('T', ' ').slice(0, 19)
      }
    });
  }
  switch (acao) {
    case 'get_live_categories':
      return json(DATA.cats);
    case 'get_live_streams': {
      const lista = q.category_id ? DATA.streams.filter(s => s.category_id === String(q.category_id)) : DATA.streams;
      return json(lista.map(publico));
    }
    case 'get_short_epg':
    case 'get_simple_data_table':
      return json({ epg_listings: [] });
    case 'get_vod_categories': case 'get_vod_streams': case 'get_series_categories': case 'get_series':
      return json([]);
    case 'get_vod_info': case 'get_series_info':
      return json({});
    default:
      return json([]);
  }
};
