import { contexte } from '../app.js';
import { esc, toast } from '../ui.js';
import { dashboardFriendQuests, marquerFriendQuestRevelee } from '../friend-quests-api.js';
import { questMeta, questReward, questTimeLeft, questStatusLabel } from '../friend-quests-model.js';
import { lireProfilPublic } from '../public-profile-api.js';
import { signatureDepuisRecap } from '../profile-identity.js';

let ceremonyOpen = false;

export async function vueFriendQuests(zone) {
  if (!contexte.utilisateur) {
    zone.innerHTML = emptyGuest();
    return;
  }

  zone.innerHTML = '<div class="phase13-loading"><span class="spinner"></span><strong>Synchronisation des missions…</strong></div>';
  let data;
  try { data = await dashboardFriendQuests(); }
  catch (error) {
    zone.innerHTML = `<section class="phase13-error"><span>⚡</span><h2>Missions indisponibles.</h2><p>${esc(error.message || 'Réessaie dans un instant.')}</p></section>`;
    return;
  }

  rendreFriendQuests(zone, data);
  void enrichirStyles(zone, data?.actives || []);
  if (data?.a_reveler) setTimeout(() => void revelerFriendQuest(data.a_reveler), 180);
}

export function rendreFriendQuests(zone, data = {}, { simulation = false } = {}) {
  const actives = Array.isArray(data.actives) ? data.actives.slice(0, 3) : [];
  const history = Array.isArray(data.historique) ? data.historique : [];
  const duos = Array.isArray(data.duos) ? data.duos : [];
  const hero = actives[0] || null;
  const secondaires = actives.slice(1);

  zone.innerHTML = `<section class="phase13-quests${simulation ? ' phase13-quests--simulation' : ''}">
    <header class="phase13-head">
      <div><span class="phase13-kicker">SOCIAL RETENTION // ${actives.length} ACTIVE${actives.length > 1 ? 'S' : ''}</span><h2>Quelqu’un compte sur ton prochain call.</h2><p>Des missions courtes, toujours avec un autre joueur. Aucun bonus Frags : ici tu gagnes de l’XP, des Volts et une histoire à deux.</p></div>
      <div class="phase13-head__count"><strong>${actives.length}</strong><span>/ 3 max</span></div>
    </header>

    ${hero ? grandeQuete(hero, simulation) : emptyNoFriends()}
    ${secondaires.length ? `<div class="phase13-secondary">${secondaires.map((q) => petiteQuete(q)).join('')}</div>` : ''}

    ${duos.length ? `<section class="phase13-section"><header><div><small>LIEN PERMANENT</small><h3>DUO STREAKS</h3></div><span>${duos.length} duo${duos.length > 1 ? 's' : ''}</span></header><div class="phase13-duos">${duos.map(duo).join('')}</div></section>` : ''}

    <section class="phase13-section phase13-history"><header><div><small>DERNIÈRES MISSIONS</small><h3>HISTORIQUE</h3></div><span>${history.length}</span></header>${history.length ? `<div class="phase13-history__list">${history.slice(0, 8).map(historyRow).join('')}</div>` : '<div class="phase13-empty">Tes premières missions terminées apparaîtront ici.</div>'}</section>
  </section>`;

  zone.querySelectorAll('[data-phase13-rival]').forEach((el) => el.addEventListener('click', () => memoriserRival(el.dataset.phase13Rival)));
  if (simulation && data?.a_reveler) {
    zone.querySelector('[data-phase13-sim-ceremony]')?.addEventListener('click', () => void revelerFriendQuest(data.a_reveler, { simulation: true }));
  }
}

export function friendQuestCompact(q) {
  if (!q) return '';
  const m = questMeta(q);
  return `<section class="phase13-hub-quest">
    <div class="phase13-hub-quest__pulse" aria-hidden="true"></div>
    <div class="phase13-hub-quest__copy"><small>${esc(m.eyebrow)} · AVEC ${esc(q.partenaire?.pseudo || 'UN POTE')}</small><h2>${esc(m.title)}</h2><p>${esc(m.description)}</p><div class="phase13-hub-quest__progress"><span><i style="width:${m.percent}%"></i></span><b>${m.progress} / ${m.target}</b></div><div class="phase13-hub-quest__meta"><strong>${esc(questReward(q))}</strong><span>⏱ ${esc(questTimeLeft(q.expire_le))}</span></div></div>
    <a class="phase13-hub-quest__cta" href="${esc(m.href)}" data-phase13-rival="${esc(q.partenaire?.pseudo || '')}">${esc(m.cta)} →</a>
  </section>`;
}

function grandeQuete(q, simulation) {
  const m = questMeta(q);
  const partner = q.partenaire?.pseudo || 'Ton pote';
  const partnerState = q.partenaire_fait ? `${partner} a déjà avancé la mission.` : `${partner} attend encore son prochain call.`;
  return `<article class="phase13-primary">
    <div class="phase13-primary__aura" aria-hidden="true"></div>
    <header><span class="phase13-primary__icon">${esc(m.icon)}</span><div><small>${esc(m.eyebrow)}</small><h3>${esc(m.title)}</h3></div><a class="phase13-profile-link" href="#/u/${encodeURIComponent(partner)}"><span data-phase13-partner-style="${esc(partner)}">PLAYER ID</span><strong>${esc(partner)}</strong></a></header>
    <p class="phase13-primary__desc">${esc(m.description)}</p>
    <div class="phase13-primary__status"><span>${esc(partnerState)}</span>${q.moi_fait ? '<b>TA PART ✓</b>' : '<b>À TOI DE JOUER</b>'}</div>
    <div class="phase13-primary__progress"><div><i style="width:${m.percent}%"></i></div><strong>${m.progress}<span>/ ${m.target}</span></strong></div>
    <footer><div><small>RÉCOMPENSE · CHACUN</small><strong>${esc(questReward(q))}</strong><span>⏱ ${esc(questTimeLeft(q.expire_le))}</span></div><a href="${esc(m.href)}" data-phase13-rival="${esc(partner)}">${esc(m.cta)}</a></footer>
    ${simulation ? '<button class="phase13-sim-ceremony" type="button" data-phase13-sim-ceremony>Voir la cérémonie de complétion</button>' : ''}
  </article>`;
}

function petiteQuete(q) {
  const m = questMeta(q);
  return `<article class="phase13-card"><div class="phase13-card__top"><span>${esc(m.icon)}</span><div><small>${esc(m.eyebrow)}</small><strong>${esc(m.title)}</strong></div><time>⏱ ${esc(questTimeLeft(q.expire_le))}</time></div><p>${esc(m.description)}</p><div class="phase13-card__bar"><i style="width:${m.percent}%"></i></div><div class="phase13-card__foot"><span>${m.progress} / ${m.target} · ${esc(questReward(q))}</span><a href="${esc(m.href)}" data-phase13-rival="${esc(q.partenaire?.pseudo || '')}">${esc(m.cta)} →</a></div></article>`;
}

function duo(d) {
  const pseudo = d.pseudo || 'Duo';
  return `<a class="phase13-duo" href="#/u/${encodeURIComponent(pseudo)}"><span class="phase13-duo__avatar">${esc(initiales(pseudo))}</span><div><strong>${esc(pseudo)}</strong><small>${Number(d.missions_terminees || 0)} mission${Number(d.missions_terminees || 0) > 1 ? 's' : ''} ensemble</small></div><b>🔥 ${Number(d.serie_semaines || 0)} sem.</b></a>`;
}

function historyRow(q) {
  const m = questMeta(q);
  return `<div class="phase13-history-row phase13-history-row--${esc(q.statut || 'expiree')}"><span>${esc(m.icon)}</span><div><strong>${esc(m.title)}</strong><small>avec ${esc(q.partenaire?.pseudo || 'un joueur')} · ${esc(questStatusLabel(q))}</small></div><b>${q.statut === 'terminee' ? esc(questReward(q)) : '—'}</b></div>`;
}

export async function revelerFriendQuest(q, { simulation = false } = {}) {
  if (!q || ceremonyOpen) return;
  ceremonyOpen = true;
  const meta = questMeta(q);
  const overlay = document.createElement('div');
  overlay.className = 'phase13-ceremony';
  overlay.innerHTML = `<div class="phase13-ceremony__noise" aria-hidden="true"></div><section><span class="phase13-ceremony__eyebrow">DUO COMPLETE</span><div class="phase13-ceremony__link"><strong>${esc(contexte.utilisateur?.pseudo || 'TOI')}</strong><i>×</i><strong>${esc(q.partenaire?.pseudo || 'RIVAL')}</strong></div><div class="phase13-ceremony__icon">${esc(meta.icon)}</div><h2>${esc(meta.title)}</h2><p>${Number(q.progression || q.objectif || 1)} / ${Number(q.objectif || 1)} · mission terminée</p><div class="phase13-ceremony__rewards"><strong>+${Number(q.recompense_xp || 0)} XP</strong>${Number(q.recompense_volts || 0) ? `<strong>+${Number(q.recompense_volts)} ⚡ VOLTS</strong>` : ''}</div><div class="phase13-ceremony__streak"><span>DUO STREAK</span><b>🔥 ${Number(q.serie_semaines || 1)} semaine${Number(q.serie_semaines || 1) > 1 ? 's' : ''}</b><small>${Number(q.missions_terminees || 1)} mission${Number(q.missions_terminees || 1) > 1 ? 's' : ''} terminée${Number(q.missions_terminees || 1) > 1 ? 's' : ''} ensemble</small></div><button type="button" data-phase13-close>CONTINUER</button></section>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-visible'));

  const fermer = async () => {
    overlay.classList.remove('is-visible');
    setTimeout(() => overlay.remove(), 260);
    ceremonyOpen = false;
    if (!simulation) {
      try { await marquerFriendQuestRevelee(q.id); }
      catch { toast('La mission est terminée, mais son reçu sera reproposé plus tard.', 'erreur'); }
    }
  };
  overlay.querySelector('[data-phase13-close]')?.addEventListener('click', () => void fermer(), { once: true });
}

async function enrichirStyles(zone, quests) {
  const pseudos = [...new Set(quests.map((q) => q.partenaire?.pseudo).filter(Boolean))];
  await Promise.all(pseudos.map(async (pseudo) => {
    try {
      const profile = await lireProfilPublic(pseudo);
      if (!profile) return;
      const sig = signatureDepuisRecap(profile.recap || {});
      zone.querySelectorAll(`[data-phase13-partner-style="${cssEscape(pseudo)}"]`).forEach((el) => { el.textContent = sig.nom.toUpperCase(); });
    } catch { /* identité optionnelle */ }
  }));
}

function memoriserRival(pseudo) {
  if (!pseudo) return;
  try { localStorage.setItem('clutch:challenge:rival', JSON.stringify({ pseudo, creeLe: Date.now(), source: 'friend_quest' })); } catch { /* no-op */ }
}

function emptyGuest() {
  return '<section class="phase13-empty-state"><span>⚡</span><h2>TES MISSIONS COMMENCENT AVEC UN RIVAL.</h2><p>Connecte-toi, ajoute un ami ou termine ton premier duel pour créer une mission sociale.</p><a class="btn" href="#/connexion">Créer mon profil</a></section>';
}
function emptyNoFriends() {
  return '<section class="phase13-empty-state phase13-empty-state--inside"><span>⚔</span><h3>Personne à entraîner dans une mission.</h3><p>Ajoute un ami ou défie quelqu’un. Dès qu’un lien existe, Clutch te proposera jusqu’à trois missions contextuelles.</p><a class="btn" href="#/social/amis">Trouver un rival</a></section>';
}
function initiales(value='') { const p=String(value).trim().split(/[\s._-]+/).filter(Boolean); return !p.length?'?':p.length===1?p[0].slice(0,2).toUpperCase():(p[0][0]+p[1][0]).toUpperCase(); }
function cssEscape(value) { return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g,'\\$&'); }
