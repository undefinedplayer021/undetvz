// Login do IPTV Smarters (padrao Xtream Codes): /player_api.php
import { DATA, VOD, SER, autenticar, fimDoDia, json, publico } from '../lib/comum.mjs';

export default async (req) => {
  const url = new URL(req.url), q = url.searchParams;
  const u = autenticar(q.get('username'), q.get('password'));
  if (!u) return json({ user_info: { auth: 0, status: 'Disabled', message: 'Usuário ou senha inválidos' } });

  const acao = q.get('action') || '';
  if (!acao) {
    const agora = new Date(), fim = fimDoDia(u.validade);
    return json({
      user_info: {
        username: u.usuario, password: u.senha, message: u.nome ? `Olá, ${u.nome}` : '',
        auth: 1, status: 'Active', exp_date: fim ? String(Math.floor(fim / 1000)) : null,
        is_trial: '0', active_cons: '0', created_at: '0', max_connections: String(u.conexoes || 3),
        allowed_output_formats: ['m3u8', 'ts']
      },
      server_info: {
        url: url.hostname, port: '443', https_port: '443', server_protocol: 'https', rtmp_port: '0',
        timezone: 'America/Sao_Paulo', timestamp_now: Math.floor(agora.getTime() / 1000),
        time_now: agora.toISOString().replace('T', ' ').slice(0, 19)
      }
    });
  }
  switch (acao) {
    case 'get_live_categories': return json(DATA.cats);
    case 'get_live_streams': {
      const cat = q.get('category_id');
      return json((cat ? DATA.streams.filter(s => s.category_id === cat) : DATA.streams).map(publico));
    }
    case 'get_short_epg': case 'get_simple_data_table': return json({ epg_listings: [] });
    case 'get_vod_categories': return json(VOD.cats);
    case 'get_vod_streams': {
      const cat = q.get('category_id');
      return json((cat ? VOD.lista.filter(s => s.category_id === cat) : VOD.lista).map(publico));
    }
    case 'get_vod_info': {
      const f = VOD.porId.get(parseInt(q.get('vod_id'), 10));
      if (!f) return json({ info: {}, movie_data: {} });
      return json({
        info: {
          name: f.name, o_name: f.name, cover_big: f.stream_icon, movie_image: f.stream_icon, releasedate: f._ano,
          youtube_trailer: '', director: '', actors: '', cast: '', description: f._sinopse, plot: f._sinopse,
          age: '', country: '', genre: '', duration_secs: 0, duration: '', rating: '', tmdb_id: ''
        },
        movie_data: { stream_id: f.stream_id, name: f.name, added: '0', category_id: f.category_id, container_extension: f.container_extension, custom_sid: '', direct_source: '' }
      });
    }
    case 'get_series_categories': return json(SER.cats);
    case 'get_series': {
      const cat = q.get('category_id');
      return json(cat ? SER.lista.filter(s => s.category_id === cat) : SER.lista);
    }
    case 'get_series_info': {
      const d = SER.detalhes.get(parseInt(q.get('series_id'), 10));
      return json(d || { seasons: [], info: {}, episodes: {} });
    }
    default: return json([]);
  }
};

export const config = { path: '/player_api.php' };
