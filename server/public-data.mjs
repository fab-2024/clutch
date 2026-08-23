import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../web/js/config.js';

const BASE = String(process.env.SUPABASE_URL || SUPABASE_URL || '').replace(/\/+$/, '');
const ANON = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
const TIMEOUT_MS = 5000;

function safeRef(value) {
  const ref = String(value || '').trim();
  if (!ref || ref.length > 160) return null;
  if (!/^[a-zA-Z0-9._~%-]+$/.test(ref)) return null;
  return ref;
}

async function supabaseFetch(path, init = {}) {
  if (!BASE || !ANON) throw new Error('public_data_unconfigured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        Accept: 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; }
    catch { body = null; }
    if (!res.ok) throw new Error(`public_data_${res.status}`);
    return body;
  } finally { clearTimeout(timer); }
}

export async function loadPublicObject(kind, rawRef) {
  const ref = safeRef(rawRef);
  if (!ref) return null;

  if (kind === 'challenge') {
    return supabaseFetch('/rest/v1/rpc/clutch_defi_match_public', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: decodeURIComponent(ref) }),
    });
  }

  if (kind === 'league') {
    return supabaseFetch('/rest/v1/rpc/clutch_ligue_public', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_code: decodeURIComponent(ref) }),
    });
  }

  if (kind === 'match') {
    const params = new URLSearchParams({
      select: 'id,jeu,format,debut,statut,score_a,score_b,equipe_a,equipe_b,tag_a,tag_b,evenement',
      id: `eq.${decodeURIComponent(ref)}`,
      limit: '1',
    });
    const rows = await supabaseFetch(`/rest/v1/v_matchs?${params.toString()}`);
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  return null;
}

export function publicPresentation(kind, data) {
  if (!data) return null;
  if (kind === 'challenge') return challengePresentation(data);
  if (kind === 'match') return matchPresentation(data);
  if (kind === 'league') return leaguePresentation(data);
  return null;
}

function leaguePresentation(d) {
  const nom = text(d.nom, 'Ligue GRIFF');
  const createur = text(d.createur_pseudo, 'Un joueur');
  const leader = text(d.leader_pseudo, 'À prendre');
  const membres = Math.max(0, Number(d.nb_membres || 0));
  const leaderFrags = Number.isFinite(Number(d.leader_frags)) ? Number(d.leader_frags) : 1000;
  const saison = text(d.saison_nom, 'Saison en cours');
  return {
    kind: 'league',
    title: `${nom} · Ligue GRIFF`,
    headline: `${nom.toUpperCase()} T’ATTEND.`,
    description: `${createur} t’invite dans une ligue privée de ${membres} joueur${membres > 1 ? 's' : ''}. Leader : ${leader} · ${leaderFrags.toLocaleString('fr-FR')} Frags.`,
    eyebrow: 'INVITATION DE LIGUE',
    tagA: String(membres),
    equipeA: membres > 1 ? 'MEMBRES' : 'MEMBRE',
    tagB: '#1',
    equipeB: leader,
    event: saison,
    format: 'GRIFF LEAGUE',
    date: null,
    status: 'active',
    cta: 'Rejoindre la ligue',
    spaPath: `/#/ligues/invite/${encodeURIComponent(text(d.code, ''))}`,
    leagueName: nom,
    members: membres,
    leader,
    leaderFrags,
    separator: '//',
  };
}

function challengePresentation(d) {
  const pseudo = text(d.createur_pseudo, 'Un joueur');
  const equipeA = text(d.equipe_a, 'Équipe A');
  const equipeB = text(d.equipe_b, 'Équipe B');
  const tagA = text(d.tag_a, equipeA);
  const tagB = text(d.tag_b, equipeB);
  const choisi = d.createur_choix === 'b' ? equipeB : equipeA;
  const choisiTag = d.createur_choix === 'b' ? tagB : tagA;
  const conv = convictionLabel(d.createur_conviction);
  const statut = text(d.statut, 'en_attente');
  const locked = statut === 'accepte' || statut === 'termine';
  const finished = statut === 'termine';
  const headline = finished ? 'LE DUEL A RENDU SON VERDICT.' : locked ? 'DUEL VERROUILLÉ.' : `${pseudo.toUpperCase()} T’A DÉFIÉ.`;
  const description = finished
    ? `${tagA} ${scoreText(d.score_a)} — ${scoreText(d.score_b)} ${tagB}. Le duel est terminé sur GRIFF.`
    : locked
      ? `${pseudo} a pris ${choisiTag}. Le duel ${tagA} vs ${tagB} est verrouillé.`
      : `${pseudo} a pris ${choisiTag} · ${conv}. Tu prends qui sur ${tagA} vs ${tagB} ?`;
  return {
    kind:'challenge', title:`${pseudo} te défie · ${tagA} vs ${tagB} | GRIFF`, headline, description,
    eyebrow: finished ? 'VERDICT 1V1' : locked ? 'CHALLENGE 1V1' : 'INVITATION 1V1',
    tagA,tagB,equipeA,equipeB,scoreA:d.score_a,scoreB:d.score_b,event:text(d.evenement,text(d.jeu,'E-sport')),
    date:d.debut||null,chosenTag:choisiTag,conviction:conv,creator:pseudo,status:statut,
    cta:finished||locked?'Voir le duel':'Répondre au défi',spaPath:`/#/defis/${encodeURIComponent(text(d.token,''))}`,
  };
}

function matchPresentation(m) {
  const equipeA=text(m.equipe_a,'Équipe A'); const equipeB=text(m.equipe_b,'Équipe B');
  const tagA=text(m.tag_a,equipeA); const tagB=text(m.tag_b,equipeB); const status=text(m.statut,'a_venir');
  const finished=status==='termine'; const live=!finished&&m.debut&&new Date(m.debut).getTime()<=Date.now();
  const headline=finished?'LE VERDICT EST TOMBÉ.':live?'ÇA SE JOUE MAINTENANT.':'CE SOIR, TU PRENDS QUI ?';
  const description=finished?`${tagA} ${scoreText(m.score_a)} — ${scoreText(m.score_b)} ${tagB} · ${text(m.evenement,'Match e-sport')}`:`${equipeA} vs ${equipeB} · ${text(m.evenement,'Match e-sport')}. Prends position sur GRIFF.`;
  return { kind:'match',title:`${tagA} vs ${tagB} · ${text(m.evenement,'Match')} | GRIFF`,headline,description,eyebrow:finished?'RÉSULTAT':live?'LIVE':'MATCH GRIFF',tagA,tagB,equipeA,equipeB,scoreA:m.score_a,scoreB:m.score_b,event:text(m.evenement,text(m.jeu,'E-sport')),date:m.debut||null,format:m.format?`BO${m.format}`:null,status,cta:finished?'Voir le résultat':'Prendre position',spaPath:`/#/matchs/${encodeURIComponent(text(m.id,''))}` };
}

function convictionLabel(value){ if(value==='faible')return 'Faible'; if(value==='fort')return 'Fort'; return 'Normal'; }
function scoreText(value){ return Number.isFinite(Number(value))?String(Number(value)):'—'; }
function text(value,fallback=''){ const s=String(value??'').trim(); return s||fallback; }
