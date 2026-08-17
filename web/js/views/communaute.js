/**
 * Clutch — Communauté V3.
 *
 * La faction n'est plus un simple compteur : sa forme est permanente, sa
 * vitesse vient des mouvements réels 24 h / 7 j et ses mutations sont des
 * événements partagés par tous les membres.
 */

import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, nomJeu, vide, ecusson } from '../ui.js';
import { formaterFrags } from '../core.js';
import {
  FORMES_COMMUNAUTE,
  palierFaction,
  formeCommunaute,
  teinteFaction,
  croissanceTexte,
} from '../community-progression.js';
import { bombonne } from './bombonne.js';

const pourcent = (p) => Math.max(0, Math.min(100, Math.round((p?.progression ?? 0) * 100)));
const nombre = (n) => formaterFrags(Number(n) || 0);

export async function vueCommunaute(racine) {
  const brut = await api.classementCommunautes();
  const communautes = [...brut].sort(comparerCroissance);

  if (!communautes.length) {
    racine.innerHTML = `
      ${entete([], null)}
      <div class="commu-v2">
        ${vide(
          'Les réacteurs sont encore éteints',
          'Choisis une équipe préférée : sa faction démarrera avec toi et sa Fiole commencera à se remplir.',
          contexte.utilisateur
            ? '<a class="btn" href="#/parametres">Choisir ma faction</a>'
            : '<a class="btn" href="#/connexion">Créer mon compte</a>'
        )}
      </div>`;
    return;
  }

  const mienne = communautes.find((c) => c.moi) ?? null;
  const vedette = mienne ?? communautes[0];
  const rang = communautes.indexOf(vedette) + 1;

  racine.innerHTML = `
    ${entete(communautes, mienne)}
    <div class="commu-v2">
      ${coeurFaction(vedette, rang, Boolean(mienne))}
      ${parcoursMutation(vedette)}
      ${mienne ? contributionPersonnelle(mienne) : ''}
      ${mienne ? historiqueFaction(mienne) : ''}
      ${classementFactions(communautes)}
      ${explication(mienne)}
    </div>`;

  verifierEvenementMutation(vedette);
}

function comparerCroissance(a, b) {
  return (
    (Number(b.croissance_24h) || 0) - (Number(a.croissance_24h) || 0) ||
    (Number(b.croissance_7j) || 0) - (Number(a.croissance_7j) || 0) ||
    (Number(b.membres) || 0) - (Number(a.membres) || 0) ||
    String(a.nom).localeCompare(String(b.nom), 'fr')
  );
}

function etat(c) {
  return palierFaction(c.membres, c.niveau_atteint);
}

function entete(communautes, mienne) {
  const membres = communautes.reduce((t, c) => t + Number(c.membres || 0), 0);
  return `
    <div class="commu-v2-entete">
      <div>
        <div class="sur-titre">Factions Clutch</div>
        <h1>Communautés</h1>
        <p>Choisis ton camp. Chaque nouveau supporter charge le même réacteur et peut déclencher une mutation pour toute la faction.</p>
      </div>
      ${communautes.length ? `
        <div class="commu-v2-entete__signal">
          <span>${mienne ? 'Ta faction est connectée' : 'Réseau des factions'}</span>
          <strong>${esc(nombre(membres))}</strong>
          <small>supporter${membres > 1 ? 's' : ''} relié${membres > 1 ? 's' : ''}</small>
        </div>` : ''}
    </div>`;
}

function coeurFaction(c, rang, estLaMienne) {
  const p = etat(c);
  const f = formeCommunaute(p.niveau);
  const hue = teinteFaction(c.tag, c.nom);
  const pct = pourcent(p);

  return `
    <section class="commu-core commu-core--epure commu-core--v3"
             style="--team-hue:${hue};--charge:${Math.max(.08, p.progression)}">
      <div class="commu-core__grain" aria-hidden="true"></div>
      <div class="commu-core__flare" aria-hidden="true"></div>

      <div class="commu-core__identite">
        <div class="commu-core__eyebrow">
          <span>${estLaMienne ? 'MA FACTION' : 'FACTION EN VEDETTE'}</span>
        </div>
        <div class="commu-core__equipe">
          ${ecusson(c.tag, c.nom, 'm')}
          <div>
            <h2>${esc(c.nom)}</h2>
            <p>${esc(nomJeu(c.jeu))} · ${esc(c.tag)}</p>
          </div>
        </div>

        <div class="commu-core__microstats commu-core__microstats--v3">
          <span><small>24 H</small><strong class="${classeCroissance(c.croissance_24h)}">${esc(croissanceTexte(c.croissance_24h))}</strong></span>
          <span><small>7 J</small><strong class="${classeCroissance(c.croissance_7j)}">${esc(croissanceTexte(c.croissance_7j))}</strong></span>
          <span><small>MEMBRES</small><strong>${esc(nombre(c.membres))}</strong></span>
        </div>

        <p class="commu-core__resume">#${rang} dans la guerre des factions · ${esc(f.phrase)}</p>
        ${estLaMienne ? '<a class="commu-core__gerer" href="#/parametres">Gérer ma faction →</a>' : ''}
      </div>

      <div class="commu-core__reacteur">
        ${reacteur(c, p, hue)}
      </div>

      <div class="commu-core__charge">
        <div class="commu-charge__haut">
          <span>FORME ${esc(f.code)}</span>
          <strong>${p.max ? 'MAX' : `${pct} %`}</strong>
        </div>
        <h3>${esc(f.nom)}</h3>
        <p class="commu-charge__lore">${esc(f.lore)}</p>

        <div class="commu-charge__objectif">
          ${p.max
            ? '<strong>Océan saturé.</strong> Le palier terminal est entièrement chargé.'
            : `<strong>${esc(nombre(c.membres))}</strong> / ${esc(nombre(p.objectif))} supporters`}
        </div>

        <div class="commu-charge__barre"
             role="progressbar"
             aria-label="Progression vers ${esc(p.prochainNom)}"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.max ? 100 : pct}">
          <i style="width:${p.max ? 100 : pct}%"></i>
          <span style="left:${p.max ? 100 : pct}%"></span>
        </div>

        ${p.max ? `
          <p class="commu-charge__reste">Forme terminale atteinte.</p>` : `
          <p class="commu-charge__reste">
            Encore <strong>${esc(nombre(p.restant))}</strong> supporter${p.restant > 1 ? 's' : ''} avant <strong>${esc(p.prochainNom)}</strong>.
          </p>
          ${recompenseSuivante(p)}`}
      </div>
    </section>`;
}

function recompenseSuivante(p) {
  if (!p.suivant) return '';
  return `
    <div class="commu-recompense">
      <span class="commu-recompense__sigil" aria-hidden="true">✦</span>
      <div>
        <small>RÉCOMPENSE DE MUTATION</small>
        <strong>${esc(p.suivant.nom)} · +${esc(nombre(p.recompenseSuivante))} Frags</strong>
        <p>Crédités à tous les membres présents quand le seuil est franchi.</p>
      </div>
    </div>`;
}

function parcoursMutation(c) {
  const p = etat(c);
  const hue = teinteFaction(c.tag, c.nom);
  const courant = formeCommunaute(p.niveau);
  return `
    <section class="commu-evolution commu-evolution--v3" style="--team-hue:${hue}">
      <div class="commu-evolution__haut">
        <div>
          <span>HISTOIRE DU RÉACTEUR</span>
          <strong>${esc(courant.phrase)}</strong>
        </div>
        <small>7 formes permanentes</small>
      </div>
      ${railMutation(p)}
    </section>`;
}

function railMutation(p) {
  return `
    <ol class="commu-rail commu-rail--v3">
      ${FORMES_COMMUNAUTE.map((f) => {
        const franchi = p.niveau >= f.niveau;
        const courant = p.niveau === f.niveau;
        return `<li class="${franchi ? 'est-franchi ' : ''}${courant ? 'est-courant' : ''}">
          <span class="commu-rail__point"><i>${esc(f.code)}</i></span>
          <strong>${esc(f.nom)}</strong>
          <small>${f.niveau === 1 ? 'Départ' : `${esc(nombre(f.seuil))} · +${esc(nombre(f.recompense))}`}</small>
          <em>${esc(f.phrase)}</em>
        </li>`;
      }).join('')}
    </ol>`;
}

function reacteur(c, p, hue, { compact = false, animation = '' } = {}) {
  const f = formeCommunaute(p.niveau);
  const classeCharge = p.max || p.progression >= .75
    ? ' commu-reacteur--critique'
    : p.progression >= .4
      ? ' commu-reacteur--actif'
      : '';

  return `
    <div class="commu-reacteur commu-reacteur--n${p.niveau}${compact ? ' commu-reacteur--compact' : ''}${classeCharge}${animation ? ` ${animation}` : ''}"
         style="--team-hue:${hue};--charge:${Math.max(.08, p.progression)}">
      <span class="commu-reacteur__halo" aria-hidden="true"></span>
      <span class="commu-reacteur__orbite commu-reacteur__orbite--a" aria-hidden="true"></span>
      <span class="commu-reacteur__orbite commu-reacteur__orbite--b" aria-hidden="true"></span>
      <span class="commu-reacteur__vapeur commu-reacteur__vapeur--a" aria-hidden="true"></span>
      <span class="commu-reacteur__vapeur commu-reacteur__vapeur--b" aria-hidden="true"></span>
      <span class="commu-reacteur__motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      ${bombonne({ ...p, nom: f.nom }, { teinte: hue })}
      <span class="commu-reacteur__socle" aria-hidden="true"><i></i></span>
      <span class="commu-reacteur__niveau">${esc(f.code)}</span>
    </div>`;
}

function contributionPersonnelle(c) {
  const depuis = c.membre_depuis ? new Date(c.membre_depuis) : null;
  const date = depuis && Number.isFinite(depuis.getTime())
    ? depuis.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return `
    <section class="commu-contribution">
      <div>
        <span>TA TRACE DANS LA FACTION</span>
        <strong>Présent depuis ${esc(date)}</strong>
      </div>
      <dl>
        <div><dt>Pronos depuis ton arrivée</dt><dd>${esc(nombre(c.pronos_depuis))}</dd></div>
        <div><dt>Mutations vécues</dt><dd>${esc(nombre(c.mutations_vecues))}</dd></div>
        <div><dt>Charge 7 jours</dt><dd class="${classeCroissance(c.croissance_7j)}">${esc(croissanceTexte(c.croissance_7j))}</dd></div>
      </dl>
    </section>`;
}

function historiqueFaction(c) {
  const historique = Array.isArray(c.historique) ? c.historique : [];
  if (!historique.length) return '';
  return `
    <section class="commu-histoire">
      <div class="commu-histoire__haut">
        <div><span>ARCHIVES DE FACTION</span><h2>Mutations majeures</h2></div>
        <small>Les formes acquises ne disparaissent jamais.</small>
      </div>
      <div class="commu-histoire__liste">
        ${historique.map((e) => {
          const d = new Date(e.cree_le);
          const date = Number.isFinite(d.getTime())
            ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
          return `<article>
            <span>FORME ${esc(formeCommunaute(e.niveau).code)}</span>
            <div><strong>${esc(c.nom)} a atteint ${esc(e.nom)}</strong><small>${esc(date)} · ${esc(nombre(e.membres))} membres</small></div>
            <b>+${esc(nombre(e.recompense_frags))} Frags</b>
          </article>`;
        }).join('')}
      </div>
    </section>`;
}

function classementFactions(communautes) {
  return `
    <section class="commu-classement commu-classement--v3">
      <div class="commu-classement__haut">
        <div>
          <div class="sur-titre">Guerre des factions</div>
          <h2>Qui charge le plus vite ?</h2>
          <p>Classement par croissance nette des supporters sur 24 h, puis 7 jours — pas par Elo.</p>
        </div>
        <span>${communautes.length} faction${communautes.length > 1 ? 's' : ''} active${communautes.length > 1 ? 's' : ''}</span>
      </div>
      <div class="commu-factions">
        ${communautes.map((c, i) => carteFaction(c, i + 1)).join('')}
      </div>
    </section>`;
}

function carteFaction(c, rang) {
  const p = etat(c);
  const f = formeCommunaute(p.niveau);
  const pct = pourcent(p);
  const hue = teinteFaction(c.tag, c.nom);
  return `
    <article class="commu-faction commu-faction--v3${c.moi ? ' commu-faction--moi' : ''}" style="--team-hue:${hue}">
      <div class="commu-faction__rang"><span>#</span>${rang}</div>
      <div class="commu-faction__logo">${ecusson(c.tag, c.nom, 's')}</div>
      <div class="commu-faction__identite">
        <div><strong>${esc(c.nom)}</strong>${c.moi ? '<i>TA FACTION</i>' : ''}</div>
        <small>${esc(nomJeu(c.jeu))} · ${esc(f.nom)} ${esc(f.code)}</small>
      </div>
      <div class="commu-faction__vitesse">
        <strong class="${classeCroissance(c.croissance_24h)}">${esc(croissanceTexte(c.croissance_24h))}</strong>
        <small>24 h</small>
        <span>${esc(croissanceTexte(c.croissance_7j))} / 7 j</span>
      </div>
      <div class="commu-faction__progress">
        <div><span>${p.max ? 'MAX' : `${pct} %`}</span><small>${esc(nombre(c.membres))} membre${Number(c.membres) > 1 ? 's' : ''}</small></div>
        <div class="commu-faction__barre"><i style="width:${p.max ? 100 : pct}%"></i></div>
      </div>
    </article>`;
}

function classeCroissance(v) {
  const n = Number(v) || 0;
  return n > 0 ? 'est-positive' : n < 0 ? 'est-negative' : 'est-neutre';
}

function explication(mienne) {
  return `
    <div class="commu-regle">
      <span class="commu-regle__icone">✦</span>
      <div>
        <strong>Une équipe. Une faction. Un réacteur.</strong>
        <p>La Fiole est le niveau I. À 10 supporters, elle mute en Flacon. Les mutations sont permanentes et les récompenses vont aux membres présents au moment exact du passage.</p>
      </div>
      ${contexte.utilisateur
        ? `<a href="#/parametres">${mienne ? 'Gérer ma faction' : 'Choisir ma faction'}</a>`
        : '<a href="#/connexion">Rejoindre Clutch</a>'}
    </div>`;
}

/**
 * L'événement vient de Supabase. localStorage ne sert plus qu'à mémoriser que
 * CE navigateur l'a déjà vu ; il ne décide jamais si une mutation a existé.
 */
function verifierEvenementMutation(c) {
  if (!c?.moi || !contexte.utilisateur?.id || !c.dernier_evenement_id) return;

  const eventId = String(c.dernier_evenement_id);
  const cle = `clutch.community.event_seen.${contexte.utilisateur.id}.${c.equipe_id}`;
  if (localStorage.getItem(cle) === eventId) return;

  const eventDate = new Date(c.dernier_evenement_le).getTime();
  const joinedDate = c.membre_depuis ? new Date(c.membre_depuis).getTime() : NaN;
  if (Number.isFinite(joinedDate) && Number.isFinite(eventDate) && eventDate < joinedDate) {
    localStorage.setItem(cle, eventId);
    return;
  }

  const niveau = Math.max(2, Math.min(7, Number(c.dernier_evenement_niveau) || 2));
  const ancien = palierFaction(FORMES_COMMUNAUTE[niveau - 1].seuil, niveau - 1);
  ancien.progression = .96;
  const nouveau = etat(c);
  nouveau.niveau = niveau;
  nouveau.progression = Math.max(.08, nouveau.progression);
  const hue = teinteFaction(c.tag, c.nom);
  const f = formeCommunaute(niveau);
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const overlay = document.createElement('div');
  overlay.className = `commu-mutation-v3${reduit ? ' est-reduite' : ''}`;
  overlay.style.setProperty('--team-hue', hue);
  overlay.innerHTML = `
    <div class="commu-mutation-v3__flash" aria-hidden="true"></div>
    <section class="commu-mutation-v3__carte" role="dialog" aria-modal="true" aria-label="Mutation de faction">
      <span class="commu-mutation-v3__sur">MUTATION DE FACTION</span>
      <div class="commu-mutation-v3__scene">
        <div class="commu-mutation-v3__ancien">${reacteur(c, ancien, hue, { compact: true, animation: 'mutation-ancien' })}</div>
        <div class="commu-mutation-v3__nouveau">${reacteur(c, nouveau, hue, { compact: true, animation: 'mutation-nouveau' })}</div>
      </div>
      <span class="commu-mutation-v3__niveau">FORME ${esc(f.code)}</span>
      <h2>${esc(f.nom)}</h2>
      <p>${esc(c.nom)} vient de franchir ${esc(nombre(f.seuil))} supporters.</p>
      <div class="commu-mutation-v3__gain">+${esc(nombre(c.dernier_evenement_recompense ?? f.recompense))} Frags <small>pour chaque membre présent</small></div>
      <button class="btn" type="button">Découvrir la nouvelle relique</button>
    </section>`;

  const fermer = () => {
    localStorage.setItem(cle, eventId);
    overlay.classList.add('est-fermee');
    setTimeout(() => overlay.remove(), reduit ? 0 : 260);
  };

  overlay.querySelector('button')?.addEventListener('click', fermer);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fermer(); });
  document.body.appendChild(overlay);

  if (reduit) {
    overlay.classList.add('phase-reveal');
    return;
  }

  requestAnimationFrame(() => overlay.classList.add('phase-charge'));
  setTimeout(() => overlay.classList.add('phase-surcharge'), 720);
  setTimeout(() => overlay.classList.add('phase-flash'), 1320);
  setTimeout(() => overlay.classList.add('phase-reveal'), 1510);
}
