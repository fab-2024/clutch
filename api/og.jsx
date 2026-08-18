import { ImageResponse } from '@vercel/og';
import { createElement as h } from 'react';
import { loadPublicObject, publicPresentation } from '../server/public-data.mjs';

export default async function handler(req) {
  const url = new URL(req.url || '/', 'https://clutch.invalid');
  const kind = url.searchParams.get('kind');
  const ref = url.searchParams.get('id') || '';

  let card = null;
  try {
    if (kind === 'challenge' || kind === 'match') {
      const data = await loadPublicObject(kind, ref);
      card = data ? publicPresentation(kind, data) : null;
    }
  } catch (error) {
    console.error('[phase9] og data error', error?.message || error);
  }

  if (!card) card = genericCard();

  return new ImageResponse(render(card), {
    width: 1200,
    height: 630,
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}

function render(card) {
  const finished = card.status === 'termine' && card.scoreA != null && card.scoreB != null;
  const headline = String(card.headline || 'CLUTCH.').slice(0, 72);
  const detail = card.kind === 'challenge' && card.chosenTag
    ? `${card.creator} → ${card.chosenTag} · ${card.conviction}`
    : card.event || 'Esport prediction';

  return h('div', { style: styles.root },
    h('div', { style: styles.glowA }),
    h('div', { style: styles.glowB }),
    h('div', { style: styles.frame },
      h('div', { style: styles.top },
        h('div', { style: styles.brand }, 'CLUTCH', h('span', { style: styles.dot }, '.')),
        h('div', { style: styles.badge }, card.eyebrow || 'ESPORT PREDICTION'),
      ),
      h('div', { style: styles.content },
        h('div', { style: styles.kicker }, card.kind === 'challenge' ? 'TU JOUES CONTRE QUELQU’UN.' : 'PRENDS POSITION.'),
        h('div', { style: styles.headline }, headline),
        h('div', { style: styles.matchup },
          team(card.tagA || 'CL', card.equipeA || 'Clutch'),
          h('div', { style: styles.vs }, finished ? `${card.scoreA} — ${card.scoreB}` : 'VS'),
          team(card.tagB || 'CH', card.equipeB || 'Challenge', true),
        ),
      ),
      h('div', { style: styles.bottom },
        h('div', { style: styles.detail }, detail),
        h('div', { style: styles.cta }, card.kind === 'challenge' ? 'TU PRENDS QUI ?' : 'CLUTCH // MATCH'),
      ),
    ),
  );
}

function team(tag, name, right = false) {
  return h('div', { style: { ...styles.team, alignItems: right ? 'flex-end' : 'flex-start' } },
    h('div', { style: styles.tag }, String(tag || '').slice(0, 8).toUpperCase()),
    h('div', { style: { ...styles.teamName, textAlign: right ? 'right' : 'left' } }, String(name || '').slice(0, 34)),
  );
}

function genericCard() {
  return {
    kind: 'generic',
    eyebrow: 'ESPORT PREDICTION',
    headline: 'CE SOIR, TU PRENDS QUI ?',
    tagA: 'CL',
    equipeA: 'Ton call',
    tagB: 'VS',
    equipeB: 'Tes potes',
    event: 'Clutch · Pronostics gratuits',
    status: 'a_venir',
  };
}

const styles = {
  root: {
    width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden',
    background: '#06080b', color: '#f5f7f2', padding: '34px',
  },
  glowA: {
    position: 'absolute', width: '520px', height: '520px', borderRadius: '999px', left: '-220px', top: '-260px',
    background: 'radial-gradient(circle, rgba(232,255,61,.18), rgba(232,255,61,0) 68%)',
  },
  glowB: {
    position: 'absolute', width: '600px', height: '600px', borderRadius: '999px', right: '-260px', bottom: '-330px',
    background: 'radial-gradient(circle, rgba(124,92,255,.13), rgba(124,92,255,0) 68%)',
  },
  frame: {
    position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    border: '1px solid rgba(232,255,61,.22)', borderRadius: '34px', padding: '34px 40px',
    background: 'linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.012))',
  },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  brand: { display: 'flex', fontSize: '31px', fontWeight: 900, letterSpacing: '-1.8px' },
  dot: { color: '#e8ff3d' },
  badge: {
    display: 'flex', padding: '8px 13px', borderRadius: '999px', border: '1px solid rgba(232,255,61,.23)',
    color: '#e8ff3d', background: 'rgba(232,255,61,.055)', fontSize: '13px', fontWeight: 800, letterSpacing: '1.7px',
  },
  content: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  kicker: { color: '#e8ff3d', fontSize: '14px', fontWeight: 900, letterSpacing: '2.3px', marginBottom: '10px' },
  headline: { fontSize: '67px', lineHeight: 0.92, fontWeight: 900, letterSpacing: '-3.4px', maxWidth: '1020px', marginBottom: '30px' },
  matchup: { display: 'flex', alignItems: 'center', gap: '22px', width: '100%' },
  team: {
    flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: '21px 25px', borderRadius: '20px', border: '1px solid rgba(255,255,255,.095)', background: 'rgba(0,0,0,.16)',
  },
  tag: { color: '#e8ff3d', fontSize: '49px', lineHeight: 0.9, fontWeight: 900, letterSpacing: '-1.4px' },
  teamName: { color: '#9da69a', fontSize: '15px', marginTop: '8px', maxWidth: '390px' },
  vs: { display: 'flex', color: '#f4f6f0', fontSize: '24px', fontWeight: 900, letterSpacing: '1px', whiteSpace: 'nowrap' },
  bottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '20px' },
  detail: { color: '#9ba398', fontSize: '17px', fontWeight: 700, maxWidth: '760px' },
  cta: { color: '#e8ff3d', fontSize: '14px', fontWeight: 900, letterSpacing: '1.6px' },
};
