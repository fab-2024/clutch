import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';

import { loadGrowthPresentation, PRIVATE_CACHE_HEADERS } from '../server/growth-public-data.mjs';

export async function GET(request) {
  const url = new URL(request.url || '/', 'https://clutch.invalid');
  let card = null;
  let status = 404;
  try {
    card = await loadGrowthPresentation(url.searchParams.get('kind'), url.searchParams.get('id'), url.searchParams.get('milestone'));
    if (card) status = 200;
  } catch { status = 503; }
  return new ImageResponse(renderGrowthCard(card), { width: 1200, height: 630, status,
    headers: { ...PRIVATE_CACHE_HEADERS, 'X-Robots-Tag': 'noindex, nofollow' } });
}

export function renderGrowthCard(card) {
  const milestone = card?.kind === 'milestone';
  return h('div', { style: { display: 'flex', width: '100%', height: '100%', padding: 38, color: '#F4F7FA', background: 'linear-gradient(135deg,#102B3A,#06101A)', fontFamily: 'sans-serif' } },
    h('div', { style: { display: 'flex', flex: 1, flexDirection: 'column', border: '2px solid #30414E', borderRadius: 30, padding: '36px 44px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', color: '#E8FF3D', fontSize: 24, fontWeight: 700, letterSpacing: 3 } },
        h('span', null, 'CLUTCH'), h('span', null, milestone ? 'JALON VÉRIFIÉ' : card ? 'TA COMMUNAUTÉ' : 'CONTENU PRIVÉ')),
      h('div', { style: { display: 'flex', flex: 1, alignItems: 'center', gap: 36 } },
        milestone ? h('div', { style: { display: 'flex', fontSize: 180, fontWeight: 700, color: '#E8FF3D', letterSpacing: -12 } }, String(card.milestone)) : null,
        h('div', { style: { display: 'flex', flex: 1, flexDirection: 'column', gap: 18 } },
          h('div', { style: { display: 'flex', fontSize: milestone ? 48 : 58, fontWeight: 700, lineHeight: 1.1 } }, milestone ? 'JOURS DE CALLS' : card?.headline ?? 'LIEN INDISPONIBLE'),
          card?.pseudo ? h('div', { style: { display: 'flex', fontSize: card.pseudo.length > 24 ? 30 : 42, color: '#A5AFB9', overflowWrap: 'anywhere' } }, card.pseudo) : null,
          card?.kind === 'showcase' ? h('div', { style: { display: 'flex', color: '#E8FF3D', fontSize: 26 } }, `${card.likes} LIKE${card.likes > 1 ? 'S' : ''}`) : null)),
      h('div', { style: { display: 'flex', borderTop: '1px solid #30414E', paddingTop: 24, color: '#A5AFB9', fontSize: 22 } },
        milestone ? 'UN JOUR. UN CALL. À TON RYTHME.' : card ? 'TA COLLECTION. TON STYLE. TON CERCLE.' : 'Ce contenu est masqué ou indisponible.')));
}
