import { contexte } from '../app.js';
import { esc, toast } from '../ui.js';
import { progressionNiveau } from '../core.js';
import {
  evaluerBadgesV2,
  xpDetailleeV2,
  ordreRareteV2,
  libelleRareteV2,
  iconeFamilleBadge,
} from '../badges-v2.js';
import { lireProfilPublic, reglerVisibiliteProfil, urlProfilPublic } from '../public-profile-api.js';
import { signatureDepuisRecap, traitsDepuisProfil, signatureCourte, classePrestige, libelleConviction, libelleJeu } from '../profile-identity.js';

export async function vueProfilPublic(racine, pseudo) {
  racine.innerHTML = '<div class="phase12-loading"><span class="spinner"></span><strong>Lecture du profil…</strong></div>';
  let profil;
  try { profil = await lireProfilPublic(pseudo); }
  catch (error) {
    racine.innerHTML = etatErreur(error.message || 'Profil indisponible.');
    return;
  }

  if (!profil) {
    racine.innerHTML = etatErreur('Ce profil est privé, introuvable ou n’est plus disponible.');
    return;
  }

  rendreProfilPublic(racine, profil);
  monterInteractions(racine, profil);
}

export function rendreProfilPublic(racine, profil, { simulation = false } = {}) {
  const recap = profil.recap || {};
  const badges = evaluerBadgesV2(recap);
  const xp = xpDetailleeV2({ badges, recap });
  const niveau = progressionNiveau(xp.total);
  const signature = signatureDepuisRecap(recap);
  const traits = traitsDepuisProfil(profil);
  const selection = selectionBadges(profil, badges);
  const classement = profil.classement || {};
  const precision = Math.round(Number(recap.precision_pct || 0));
  const estMoi = Boolean(profil.viewer?.est_moi);
  const equipe = profil.equipe_favorite;
  const rivalite = profil.viewer?.rivalite;
  const ligue = profil.viewer?.ligue_commune;
  const prestige = classePrestige(niveau.niveau);

  racine.innerHTML = `<div class="phase12-profile phase12-profile--${esc(prestige)}${simulation ? ' phase12-profile--simulation' : ''}">
    <section class="phase12-hero">
      <div class="phase12-hero__mesh" aria-hidden="true"></div>
      <header class="phase12-hero__top">
        <div class="phase12-public-mark"><i></i><span>${simulation ? 'PROFILE SIMULATION' : 'PUBLIC PROFILE'}</span></div>
        <div class="phase12-actions">
          ${estMoi ? `<button type="button" class="phase12-action" data-phase12-privacy aria-pressed="${profil.profil_public !== false}">${profil.profil_public === false ? 'Privé' : 'Public'}</button>` : ''}
          <button type="button" class="phase12-action" data-phase12-share>Partager</button>
        </div>
      </header>

      <div class="phase12-identity-grid">
        <div class="phase12-emblem-wrap">
          ${embleme(niveau.niveau, prestige)}
          <div class="phase12-emblem-caption"><span>NIVEAU ${niveau.niveau}</span><strong>${esc(niveau.titre)}</strong></div>
        </div>

        <div class="phase12-identity">
          <div class="phase12-signature-badge phase12-signature-badge--${esc(signature.cle)}"><span>${esc(signature.symbole)}</span><b>${esc(signature.nom)}</b></div>
          <h1>${esc(profil.pseudo)}</h1>
          <p class="phase12-signature-copy">${esc(signature.texte)}</p>
          <div class="phase12-byline">
            ${equipe ? `<span>${esc(equipe.tag || equipe.nom)} · ${esc(equipe.nom)}</span>` : '<span>Sans faction</span>'}
            <i>•</i><span>Membre depuis ${esc(formatMois(profil.cree_le))}</span>
          </div>
          <div class="phase12-signature-line">${esc(signatureCourte(profil))}</div>
          <div class="phase12-traits">${traits.map(trait).join('')}</div>
        </div>

        <div class="phase12-rating">
          <small>${esc(classement.saison_nom || 'SAISON')}</small>
          <strong>${Number(classement.frags || 1000).toLocaleString('fr-FR')}</strong>
          <span>FRAGS</span>
          <div class="phase12-rank">${classement.rang ? `#${Number(classement.rang).toLocaleString('fr-FR')} CLUTCH` : 'PLACEMENT'}</div>
          ${!estMoi ? '<button type="button" class="phase12-duel-btn" data-phase12-challenge>⚔ DÉFIER CE JOUEUR</button>' : '<a class="phase12-duel-btn" href="#/profil">MODIFIER MON PROFIL</a>'}
        </div>
      </div>

      <div class="phase12-statbar">
        ${stat(`${precision} %`, 'Précision')}
        ${stat(String(recap.paris || 0), 'Pronostics')}
        ${stat(profil.serie_actuelle ? `🔥 ${profil.serie_actuelle}` : '—', 'Série actuelle')}
        ${stat(profil.meilleur_jeu ? libelleJeu(profil.meilleur_jeu.jeu) : '—', 'Terrain')}
        ${stat(profil.conviction_preferee ? libelleConviction(profil.conviction_preferee.conviction) : '—', 'Conviction')}
      </div>
    </section>

    <section class="phase12-section phase12-arsenal-section">
      <header class="phase12-section__head"><div><small>LOADOUT PUBLIC</small><h2>ARSENAL</h2></div><span>${selection.arsenal.length}/5 exposés</span></header>
      <div class="phase12-arsenal">
        ${selection.arsenal.length ? selection.arsenal.map((badge, i) => arsenalItem(badge, i === 0)).join('') : arsenalVide()}
      </div>
    </section>

    <div class="phase12-columns">
      <section class="phase12-section">
        <header class="phase12-section__head"><div><small>DERNIERS VERDICTS</small><h2>FORME</h2></div>${profil.forme_recente?.length ? `<span>${profil.forme_recente.map((p) => p.statut === 'gagne' ? 'W' : 'L').join(' ')}</span>` : ''}</header>
        <div class="phase12-form">${profil.forme_recente?.length ? profil.forme_recente.map(formeItem).join('') : '<div class="phase12-empty">La forme apparaîtra après les premiers verdicts.</div>'}</div>
      </section>

      <section class="phase12-section">
        <header class="phase12-section__head"><div><small>APPARTENANCE</small><h2>ESCOUADES</h2></div></header>
        <div class="phase12-squads">
          ${equipe ? factionItem(equipe) : '<div class="phase12-empty">Aucune faction affichée.</div>'}
          ${ligue ? `<a class="phase12-squad phase12-squad--league" href="#/ligues/${encodeURIComponent(ligue.id)}"><span>CLUTCH LEAGUE</span><strong>${esc(ligue.nom)}</strong><small>${Number(ligue.membres || 0)} membres · ligue commune</small></a>` : ''}
        </div>
      </section>
    </div>

    ${rivalite ? rivaliteSection(profil, rivalite) : ''}

    <section class="phase12-profile-footer">
      <div><small>PROFILE SIGNATURE</small><strong>${esc(profil.pseudo)} · ${esc(signatureCourte(profil))}</strong></div>
      <span>${Number(classement.frags || 1000).toLocaleString('fr-FR')} FRAGS · ${precision} %</span>
    </section>
  </div>`;
}

function embleme(niveau, prestige) {
  return `<div class="phase12-emblem phase12-emblem--${esc(prestige)}">
    <span class="phase12-emblem__orbit phase12-emblem__orbit--a"></span><span class="phase12-emblem__orbit phase12-emblem__orbit--b"></span>
    <span class="phase12-emblem__sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
    <svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="27" fill="var(--accent)"/><path d="M63.6 63.6A19.2 19.2 0 1 1 63.6 36.4" fill="none" stroke="var(--sur-accent)" stroke-width="11.5"/></svg>
    <b>${Number(niveau || 1)}</b>
  </div>`;
}

function trait(t) {
  return `<div class="phase12-trait"><span>${esc(t.symbole)}</span><div><strong>${esc(t.nom)}</strong><small>${esc(t.detail)}</small></div></div>`;
}

function stat(value, label) { return `<div class="phase12-stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`; }

function selectionBadges(profil, badges) {
  const obtenus = badges.filter((b) => b.obtenu).sort((a,b) => ordreRareteV2(a)-ordreRareteV2(b) || a.nom.localeCompare(b.nom,'fr'));
  const parCle = new Map(obtenus.map((b) => [b.cle,b]));
  const arsenal = [];
  for (const cle of profil.arsenal_exposes || []) {
    const badge = parCle.get(cle);
    if (badge && !arsenal.some((x) => x.cle === badge.cle)) arsenal.push(badge);
  }
  for (const badge of obtenus) {
    if (arsenal.length >= 5) break;
    if (!arsenal.some((x) => x.cle === badge.cle)) arsenal.push(badge);
  }
  return { arsenal: arsenal.slice(0,5), vedette: parCle.get(profil.badge_vedette) || arsenal[0] || null };
}

function arsenalItem(badge, vedette=false) {
  return `<article class="phase12-badge${vedette ? ' is-featured' : ''} phase12-badge--${esc(badge.rarete || 'commun')}">
    <div class="phase12-badge__icon">${iconeFamilleBadge(badge.famille, vedette ? 34 : 27)}</div>
    <small>${esc(libelleRareteV2(badge))}</small><strong>${esc(badge.nom)}</strong><p>${esc(badge.description || '')}</p>
  </article>`;
}
function arsenalVide(){ return '<div class="phase12-empty phase12-empty--wide">Les premiers badges viendront remplir cette vitrine.</div>'; }

function formeItem(p) {
  const choixA = p.choix === 'a';
  const tag = choixA ? (p.tag_a || p.equipe_a) : (p.tag_b || p.equipe_b);
  const gagne = p.statut === 'gagne';
  const delta = Number(p.delta_frags || 0);
  return `<a class="phase12-form-row ${gagne ? 'is-win' : 'is-loss'}" href="#/matchs/${encodeURIComponent(p.match_id)}">
    <b>${gagne ? 'W' : 'L'}</b><div><small>${esc(p.evenement || p.jeu || 'Match')}</small><strong>${esc(tag)} · ${esc(libelleConviction(p.conviction))}</strong></div>
    <span>${delta > 0 ? '+' : ''}${delta} Frags</span>
  </a>`;
}

function factionItem(equipe) {
  return `<a class="phase12-squad phase12-squad--faction" href="#/social/faction"><span>FACTION · ${esc(libelleJeu(equipe.jeu))}</span><strong>${esc(equipe.nom)}</strong><small>${esc(equipe.relique || 'Fiole')} · Forme ${roman(equipe.relique_niveau || 1)} · ${Number(equipe.supporters || 0).toLocaleString('fr-FR')} supporter${Number(equipe.supporters||0)>1?'s':''}</small></a>`;
}

function rivaliteSection(profil, r) {
  return `<section class="phase12-rivalry"><div><small>⚔ VOTRE RIVALITÉ</small><h2>TOI ${Number(r.viewer_wins || 0)} — ${Number(r.target_wins || 0)} ${esc(profil.pseudo)}</h2><p>${r.total} duel${Number(r.total)>1?'s':''} terminé${Number(r.total)>1?'s':''}. Le prochain call peut faire bouger la série.</p></div><button type="button" data-phase12-challenge>LE DÉFIER À NOUVEAU</button></section>`;
}

function monterInteractions(racine, profil) {
  racine.querySelector('[data-phase12-share]')?.addEventListener('click', () => void partager(profil));
  racine.querySelectorAll('[data-phase12-challenge]').forEach((btn) => btn.addEventListener('click', () => {
    try { localStorage.setItem('clutch:challenge:rival', JSON.stringify({ pseudo: profil.pseudo, creeLe: Date.now() })); } catch { /* no-op */ }
    toast(`Choisis un match puis défie ${profil.pseudo}.`, 'succes');
    location.hash = '#/matchs';
  }));
  const privacy = racine.querySelector('[data-phase12-privacy]');
  privacy?.addEventListener('click', async () => {
    privacy.disabled = true;
    const visible = privacy.getAttribute('aria-pressed') !== 'true';
    try {
      await reglerVisibiliteProfil(visible);
      privacy.setAttribute('aria-pressed', String(visible));
      privacy.textContent = visible ? 'Public' : 'Privé';
      profil.profil_public = visible;
      if (contexte.utilisateur) contexte.utilisateur.profil_public = visible;
      toast(visible ? 'Profil public activé.' : 'Profil public désactivé.', 'succes');
    } catch (error) { toast(error.message, 'erreur'); }
    finally { privacy.disabled = false; }
  });
}

async function partager(profil) {
  const url = urlProfilPublic(profil.pseudo);
  const text = `${profil.pseudo} · ${signatureCourte(profil)} · ${Number(profil.classement?.frags || 1000).toLocaleString('fr-FR')} Frags`;
  if (navigator.share) {
    try { await navigator.share({ title: `${profil.pseudo} sur Clutch`, text, url }); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast('Lien du profil copié.', 'succes'); }
  catch { window.prompt('Copie ce lien :', url); }
}

function etatErreur(message) {
  return `<section class="phase12-not-found"><span>◌</span><h1>PROFIL INDISPONIBLE.</h1><p>${esc(message)}</p><a class="btn" href="#/accueil">Retour à Clutch</a></section>`;
}

function formatMois(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Clutch';
  return new Intl.DateTimeFormat('fr-FR',{month:'short',year:'numeric'}).format(d);
}
function roman(value){ return ['I','II','III','IV','V','VI','VII'][Math.max(1,Math.min(7,Number(value)||1))-1]; }
