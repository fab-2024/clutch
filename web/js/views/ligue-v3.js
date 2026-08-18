import { contexte } from '../app.js';
import { dashboardLigue, reagirLigue, urlPubliqueLigue } from '../league-v3-api.js';
import { esc, nomJeu, toast } from '../ui.js';

const REACTIONS = [
  ['fire', '🔥'], ['eyes', '👀'], ['skull', '💀'], ['w', 'W'], ['l', 'L'],
];

export async function vueLigueV3(racine, id) {
  if (!contexte.utilisateur || !contexte.saison?.id) {
    racine.innerHTML = '<div class="vide"><h3>Connecte-toi pour entrer dans cette ligue.</h3><p><a href="#/connexion">Se connecter</a></p></div>';
    return;
  }

  racine.innerHTML = '<div class="phase10-loading"><span class="spinner"></span><strong>Ouverture du QG…</strong></div>';
  let data;
  try {
    data = await dashboardLigue(id, contexte.saison.id);
  } catch (error) {
    racine.innerHTML = `<div class="vide"><h3>QG indisponible</h3><p>${esc(error.message)}</p><p><a href="#/ligues">Retour aux ligues</a></p></div>`;
    return;
  }
  if (!data?.ligue) {
    racine.innerHTML = '<div class="vide"><h3>Ligue introuvable</h3><p><a href="#/ligues">Retour</a></p></div>';
    return;
  }

  rendre(racine, data);
  brancher(racine, data);
}

export function rendreLigueV3(racine, data, { simulation = false } = {}) {
  rendre(racine, data, { simulation });
}

function rendre(racine, data, { simulation = false } = {}) {
  const l = data.ligue;
  const moi = data.moi;
  const cible = data.cible;
  const poursuivant = data.poursuivant;
  const classement = Array.isArray(data.classement) ? data.classement : [];
  const top = classement.slice(0, 3);
  const publicUrl = simulation ? '#' : urlPubliqueLigue(l.code);

  racine.innerHTML = `
    <section class="phase10-league${simulation ? ' phase10-league--simulation' : ''}" data-phase10-league="${esc(l.id)}">
      <header class="phase10-topbar">
        <a href="#/ligues">← Mes ligues</a>
        <div class="phase10-topbar__actions">
          <button type="button" data-phase10-copy="${esc(l.code)}">Code · ${esc(l.code)}</button>
          <button type="button" class="is-primary" data-phase10-share="${esc(l.code)}" data-url="${esc(publicUrl)}">Partager la ligue</button>
        </div>
      </header>

      <section class="phase10-hero">
        <div class="phase10-hero__glow" aria-hidden="true"></div>
        <div class="phase10-hero__identity">
          <span class="phase10-crest">${esc(initiales(l.nom))}</span>
          <div><small>CLUTCH LEAGUE · ${esc(contexte.saison?.nom || 'SAISON')}</small><h1>${esc(l.nom)}</h1><p>${Number(l.nb_membres || classement.length)} membres · un classement qui bouge à chaque résultat.</p></div>
        </div>
        <div class="phase10-rank-core">
          <small>TA POSITION</small>
          <strong>${moi ? `#${moi.rang}` : '—'}</strong>
          <span>${moi ? `${formatFrags(moi.frags)} FRAGS` : 'Fais ton premier prono'}</span>
          ${moi ? movementBadge(moi.mouvement, moi.net_7j) : ''}
        </div>
        <div class="phase10-warline">
          ${warNode(cible, 'TA CIBLE', cible ? `${formatFrags(cible.ecart)} à reprendre` : 'Personne devant', 'target')}
          ${warNode(moi, 'TOI', moi ? `${formatFrags(moi.frags)} Frags` : 'Non classé', 'me')}
          ${warNode(poursuivant, 'À TES TROUSSES', poursuivant ? `${formatFrags(poursuivant.ecart)} derrière` : 'Personne derrière', 'pursuer')}
        </div>
        ${cible ? `<a class="phase10-hunt" href="#/matchs"><span>⚔</span><div><small>PROCHAINE CIBLE</small><strong>Dépasser ${esc(cible.pseudo)}</strong><em>${formatFrags(cible.ecart)} Frags vous séparent</em></div><b>Voir les matchs ›</b></a>` : ''}
      </section>

      <section class="phase10-section phase10-podium-section">
        <div class="phase10-heading"><div><small>PODIUM VIVANT</small><h2>Les trois à faire tomber.</h2></div><span>7 JOURS</span></div>
        ${podium(top)}
      </section>

      <section class="phase10-section">
        <div class="phase10-heading"><div><small>CE SOIR DANS TA LIGUE</small><h2>Les prochains points de bascule.</h2></div><a href="#/matchs">Tous les matchs</a></div>
        ${matchs(data.matchs || [], cible)}
      </section>

      <section class="phase10-split">
        <section class="phase10-section phase10-section--compact">
          <div class="phase10-heading"><div><small>RIVALITÉS</small><h2>Les comptes se règlent ici.</h2></div><a href="#/defis">Mes duels</a></div>
          ${rivalites(data.rivalites || [], moi)}
        </section>
        <section class="phase10-section phase10-section--compact">
          <div class="phase10-heading"><div><small>ACTIVITÉ</small><h2>Ça bouge dans le groupe.</h2></div><span>7 JOURS</span></div>
          ${feed(data.feed || [])}
        </section>
      </section>

      <section class="phase10-section">
        <div class="phase10-heading"><div><small>CLASSEMENT COMPLET</small><h2>Personne ne se cache.</h2></div><span>${classement.length} JOUEURS</span></div>
        ${ranking(classement)}
      </section>
    </section>`;
}

function brancher(racine, data) {
  racine.querySelectorAll('[data-phase10-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    const code = btn.dataset.phase10Copy;
    try { await navigator.clipboard.writeText(urlPubliqueLigue(code)); toast('Lien public de la ligue copié.', 'succes'); }
    catch { toast(`Code : ${code}`); }
  }));

  racine.querySelectorAll('[data-phase10-share]').forEach((btn) => btn.addEventListener('click', async () => {
    const url = urlPubliqueLigue(btn.dataset.phase10Share);
    const text = `Rejoins ${data.ligue.nom} sur Clutch.`;
    if (navigator.share) {
      try { await navigator.share({ title: data.ligue.nom, text, url }); return; }
      catch (e) { if (e?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Lien de ligue copié.', 'succes'); }
    catch { toast(url); }
  }));

  racine.querySelectorAll('[data-phase10-reaction]').forEach((btn) => btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    try {
      const result = await reagirLigue(data.ligue.id, btn.dataset.eventKey, btn.dataset.phase10Reaction);
      const row = btn.closest('[data-feed-event]');
      row?.querySelectorAll('[data-phase10-reaction]').forEach((b) => {
        const key = b.dataset.phase10Reaction;
        const count = Number(result?.reactions?.[key] || 0);
        b.classList.toggle('is-active', result?.ma_reaction === key);
        const n = b.querySelector('i');
        if (n) n.textContent = count ? String(count) : '';
      });
    } catch (error) { toast(error.message, 'erreur'); }
    finally { btn.disabled = false; }
  }));
}

function podium(top) {
  if (!top.length) return '<div class="phase10-empty">Le podium est encore vide.</div>';
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;
  return `<div class="phase10-podium phase10-podium--${top.length}">${order.map((j) => {
    const rank = j.rang;
    return `<article class="phase10-podium__player is-${rank}${j.moi ? ' is-me' : ''}"><span class="phase10-avatar">${esc(initiales(j.pseudo))}</span><small>#${rank}</small><strong>${esc(j.pseudo)}</strong><b>${formatFrags(j.frags)}</b>${movementBadge(j.mouvement,j.net_7j,true)}</article>`;
  }).join('')}</div>`;
}

function warNode(j, label, detail, type) {
  return `<div class="phase10-war-node is-${type}${j ? '' : ' is-empty'}"><small>${esc(label)}</small><strong>${j ? esc(j.pseudo || 'TOI') : '—'}</strong><span>${esc(detail)}</span>${j && type !== 'me' ? `<em>#${j.rang}</em>` : ''}</div>`;
}

function movementBadge(move, net, compact = false) {
  const m = Number(move || 0); const n = Number(net || 0);
  const cls = m > 0 ? 'is-up' : m < 0 ? 'is-down' : 'is-flat';
  const txt = m > 0 ? `↑ ${m}` : m < 0 ? `↓ ${Math.abs(m)}` : '—';
  return `<span class="phase10-movement ${cls}${compact ? ' is-compact' : ''}"><b>${txt}</b><i>${n >= 0 ? '+' : '−'}${formatFrags(Math.abs(n))} · 7j</i></span>`;
}

function matchs(rows, cible) {
  if (!rows.length) return '<div class="phase10-empty"><strong>Rien dans les 36 prochaines heures.</strong><span>La prochaine bataille apparaîtra ici automatiquement.</span></div>';
  return `<div class="phase10-match-grid">${rows.map((m) => {
    const locked = Boolean(m.mon_choix);
    const targetOpposite = locked && m.cible_choix && m.cible_choix !== m.mon_choix;
    return `<a class="phase10-match" href="#/matchs/${encodeURIComponent(m.id)}"><div class="phase10-match__meta"><span>${esc(nomJeu(m.jeu))} · ${esc(m.evenement || '')}</span><time>${heure(m.debut)}</time></div><div class="phase10-match__teams"><strong>${esc(m.tag_a || m.equipe_a)}</strong><i>VS</i><strong>${esc(m.tag_b || m.equipe_b)}</strong></div><div class="phase10-match__pulse"><span>${Number(m.participants || 0)} membre${Number(m.participants || 0)>1?'s':''} ont pris position</span>${locked ? `<b>${Number(m.choix_a||0)} ${esc(m.tag_a||'A')} · ${Number(m.choix_b||0)} ${esc(m.tag_b||'B')}</b>` : '<b>Choix masqués jusqu’à ton call</b>'}</div>${targetOpposite && cible ? `<div class="phase10-match__rival">⚔ ${esc(cible.pseudo)} a pris le camp opposé.</div>` : ''}</a>`;
  }).join('')}</div>`;
}

function rivalites(rows, moi) {
  if (!rows.length) return '<div class="phase10-empty phase10-empty--small"><strong>Aucun duel interne terminé.</strong><span>Crée le premier depuis un match.</span><a href="#/matchs">Créer un défi</a></div>';
  return `<div class="phase10-rivalries">${rows.map((r) => {
    let a=r.joueur_a,b=r.joueur_b,sa=r.score_a,sb=r.score_b;
    if (moi && r.joueur_b_id===moi.id) { [a,b]=[b,a]; [sa,sb]=[sb,sa]; }
    return `<article><div><small>${r.moi?'TA RIVALITÉ':'RIVALITÉ'}</small><strong>${esc(a)} <b>${sa} — ${sb}</b> ${esc(b)}</strong><span>${r.duels} duel${r.duels>1?'s':''}</span></div>${r.moi?'<a href="#/matchs">Rejouer ›</a>':''}</article>`;
  }).join('')}</div>`;
}

function feed(rows) {
  if (!rows.length) return '<div class="phase10-empty phase10-empty--small"><strong>Le feed est calme.</strong><span>Le prochain résultat ou nouveau membre apparaîtra ici.</span></div>';
  return `<div class="phase10-feed">${rows.slice(0,10).map((e) => `<article data-feed-event="${esc(e.event_key)}"><div class="phase10-feed__icon">${e.type==='duel'?'⚔':e.type==='join'?'＋':Number(e.payload?.delta_frags||0)>=0?'▲':'◆'}</div><div class="phase10-feed__copy">${feedText(e)}<time>${tempsRelatif(e.moment)}</time><div class="phase10-reactions">${REACTIONS.map(([key,label]) => `<button type="button" data-phase10-reaction="${key}" data-event-key="${esc(e.event_key)}" class="${e.ma_reaction===key?'is-active':''}"><span>${label}</span><i>${Number(e.reactions?.[key]||0)||''}</i></button>`).join('')}</div></div></article>`).join('')}</div>`;
}

function feedText(e) {
  if (e.type==='join') return `<strong>${esc(e.acteur_pseudo)} rejoint la ligue.</strong><span>Un nouveau rival entre dans la course.</span>`;
  if (e.type==='duel') return `<strong>${esc(e.payload?.gagnant || e.acteur_pseudo)} bat ${esc(e.payload?.perdant || 'son rival')}.</strong><span>${esc(e.payload?.tag_a||'')} vs ${esc(e.payload?.tag_b||'')} · duel réglé</span>`;
  const delta=Number(e.payload?.delta_frags||0); const win=e.payload?.statut==='gagne';
  return `<strong>${esc(e.acteur_pseudo)} ${win?'frappe fort':'lâche du terrain'}.</strong><span>${esc(e.payload?.tag_a||'')} vs ${esc(e.payload?.tag_b||'')} · ${delta>=0?'+':'−'}${formatFrags(Math.abs(delta))} Frags</span>`;
}

function ranking(rows) {
  if (!rows.length) return '<div class="phase10-empty">Aucun joueur classé.</div>';
  return `<div class="phase10-ranking">${rows.map((r) => {
    const rate=r.pronostics_regles?Math.round((r.pronostics_gagnes/r.pronostics_regles)*100):0;
    return `<div class="phase10-ranking__row${r.moi?' is-me':''}"><span class="phase10-ranking__rank">${r.rang}</span><span class="phase10-avatar">${esc(initiales(r.pseudo))}</span><span class="phase10-ranking__name"><strong>${esc(r.pseudo)}${r.moi?' <em>TOI</em>':''}</strong><small>${r.pronostics_regles} pronostics · ${rate}% réussite</small></span>${movementBadge(r.mouvement,r.net_7j,true)}<b>${formatFrags(r.frags)}</b></div>`;
  }).join('')}</div>`;
}

function initiales(v='') { const w=String(v).trim().split(/\s+/).filter(Boolean); return (w.length>1?`${w[0][0]}${w.at(-1)[0]}`:w[0]?.slice(0,2)||'CL').toUpperCase(); }
function formatFrags(v) { return Math.round(Number(v)||0).toLocaleString('fr-FR'); }
function heure(v) { const d=new Date(v); return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(d); }
function tempsRelatif(v) { const ms=Date.now()-new Date(v).getTime(); if(!Number.isFinite(ms)) return ''; const min=Math.max(0,Math.floor(ms/60000)); if(min<1)return 'maintenant'; if(min<60)return `il y a ${min} min`; const h=Math.floor(min/60); if(h<24)return `il y a ${h} h`; return `il y a ${Math.floor(h/24)} j`; }
