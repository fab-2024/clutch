/**
 * Matchs V2 — « Match Arena ».
 *
 * La liste n'est plus une grille de bookmaker : un match héros concentre
 * l'action, puis une timeline compacte permet de parcourir le calendrier.
 * Toute la logique métier reste dans api.js / core.js.
 */
import * as api from '../api.js';
import { contexte, bandeauSaison, majSolde } from '../app.js';
import { esc, quand, nomJeu, vide, surClic, ecusson, jeton, toast } from '../ui.js';
import { MISE_MIN, MISE_MAX, formaterFrags } from '../core.js';

const FILTRES = [
  { cle: '', libelle: 'Tous' },
  { cle: 'lol', libelle: 'LoL' },
  { cle: 'valorant', libelle: 'VALORANT' },
  { cle: 'cs2', libelle: 'CS2' },
];

let jeuActif = '';
let statutActif = 'a_venir';
let favoriSeul = false;

export async function vueMatchs(racine) {
  const favorite = contexte.utilisateur?.equipe_favorite ?? null;
  if (!favorite) favoriSeul = false;

  let paris = contexte.utilisateur ? await api.mesParis().catch(() => []) : [];
  let heroActuel = null;

  racine.innerHTML = `
    <section class="matchs-v2">
      ${bandeauSaison()}
      <header class="matchs-v2__entete">
        <div>
          <span class="sur-titre">Match Arena</span>
          <h1>Choisis ton camp.</h1>
          <p>Un pronostic, quelques secondes, puis le match fait le reste.</p>
        </div>
        <button class="matchs-v2__historique" data-statut="termine" type="button">Historique</button>
      </header>

      <div class="matchs-v2__barre">
        <div class="arena-filtres" id="filtres-jeu" aria-label="Filtrer par jeu"></div>
        <div class="arena-filtres arena-filtres--droite" id="filtres-meta"></div>
      </div>

      <div id="matchs-v2-zone">
        <div class="chargement"><span class="spinner"></span></div>
      </div>
    </section>`;

  const filtresJeu = racine.querySelector('#filtres-jeu');
  const filtresMeta = racine.querySelector('#filtres-meta');
  const zone = racine.querySelector('#matchs-v2-zone');

  const rendreFiltres = () => {
    filtresJeu.innerHTML = FILTRES.map(
      (f) => `<button class="arena-filter${f.cle === jeuActif ? ' actif' : ''}" data-jeu="${esc(f.cle)}" type="button">${esc(f.libelle)}</button>`
    ).join('');

    filtresMeta.innerHTML = `
      <button class="arena-filter${statutActif === 'a_venir' ? ' actif' : ''}" data-statut="a_venir" type="button">À venir</button>
      ${favorite ? `<button class="arena-filter${favoriSeul ? ' actif' : ''}" data-favori="1" type="button">★ ${esc(favorite.tag)}</button>` : ''}`;

    const historique = racine.querySelector('.matchs-v2__historique');
    historique.classList.toggle('actif', statutActif === 'termine');
    historique.textContent = statutActif === 'termine' ? 'Voir les prochains' : 'Historique';
    historique.dataset.statut = statutActif === 'termine' ? 'a_venir' : 'termine';
  };

  const chargerEtRendre = async () => {
    rendreFiltres();
    zone.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';

    const matchs = await api.listerMatchs({
      jeu: jeuActif || null,
      statut: statutActif,
      equipe: favoriSeul ? favorite?.id ?? null : null,
    }).catch(() => []);

    if (!matchs.length) {
      heroActuel = null;
      zone.innerHTML = vide(
        statutActif === 'termine' ? 'Aucun résultat' : 'Aucun match',
        favoriSeul && favorite
          ? `Rien pour ${favorite.nom} dans cette sélection. Retire le filtre étoilé pour revoir tout le calendrier.`
          : statutActif === 'termine'
            ? "L'historique apparaîtra ici dès qu'un match sera réglé."
            : 'Le prochain calendrier apparaîtra ici dès sa publication.'
      );
      return;
    }

    const enrichis = await Promise.all(matchs.map(enrichirPourAffichage));
    const ordonnes = [...enrichis].sort((a, b) => new Date(a.debut) - new Date(b.debut));

    if (statutActif === 'termine') {
      heroActuel = null;
      const recents = ordonnes.reverse();
      zone.innerHTML = `
        <section class="arena-results-intro">
          <span class="sur-titre">Historique</span>
          <h2>Ce qui est joué reste lisible.</h2>
          <p>Résultat, ton choix et les Frags associés — sans encombrer le calendrier à venir.</p>
        </section>
        ${timeline(recents, paris, true)}`;
      return;
    }

    heroActuel = ordonnes[0];
    const reste = ordonnes.slice(1);
    const call = await rappelDuCall();

    zone.innerHTML = `
      ${heroArena(heroActuel, paris)}
      ${call}
      <section class="arena-timeline-section">
        <div class="arena-section-title">
          <div>
            <span class="sur-titre">À suivre</span>
            <h2>Le reste du calendrier</h2>
          </div>
          <span>${reste.length} match${reste.length > 1 ? 's' : ''}</span>
        </div>
        ${reste.length ? timeline(reste, paris, false) : '<p class="arena-fin">C’est la dernière affiche programmée pour le moment.</p>'}
      </section>`;
  };

  surClic(racine, '[data-jeu]', async (btn) => {
    jeuActif = btn.dataset.jeu || '';
    await chargerEtRendre();
  });

  surClic(racine, '[data-statut]', async (btn) => {
    statutActif = btn.dataset.statut || 'a_venir';
    await chargerEtRendre();
  });

  surClic(racine, '[data-favori]', async () => {
    favoriSeul = !favoriSeul;
    await chargerEtRendre();
  });

  surClic(racine, '[data-arena-choix]', (btn, e) => {
    e.preventDefault();
    if (!heroActuel) return;
    ouvrirDockArena(racine, heroActuel, btn, async () => {
      paris = contexte.utilisateur ? await api.mesParis().catch(() => paris) : [];
      await chargerEtRendre();
    });
  });

  await chargerEtRendre();
}

async function enrichirPourAffichage(match) {
  if (match.statut === 'termine') return { ...match, vainqueur: null, probas: new Map() };
  const marches = await api.cotesDuMatch(match.id).catch(() => []);
  const vainqueur = marches.find((m) => m.cle === 'vainqueur') ?? null;
  return { ...match, vainqueur, probas: probabilitesNormalisees(vainqueur?.choix ?? []) };
}

function heroArena(m, paris) {
  const choix = m.vainqueur?.choix ?? [];
  const choixA = choix[0] ?? null;
  const choixB = choix[1] ?? null;
  const prono = paris.find((p) => p.match_id === m.id && p.marche === 'vainqueur' && p.statut === 'en_cours');
  const debut = new Date(m.debut);
  const ouvert = m.statut === 'a_venir' && debut.getTime() > Date.now();
  const live = !ouvert && m.statut !== 'termine';
  const heure = debut.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const coteA = choixA ? Number(choixA.cote) : null;
  const coteB = choixB ? Number(choixB.cote) : null;
  const pA = choixA ? m.probas.get(choixA.cle) ?? null : null;
  const pB = choixB ? m.probas.get(choixB.cle) ?? null : null;

  return `
    <section class="arena-hero" data-jeu="${esc(m.jeu)}">
      <div class="arena-hero__grain" aria-hidden="true"></div>
      <div class="arena-hero__glow arena-hero__glow--a" aria-hidden="true"></div>
      <div class="arena-hero__glow arena-hero__glow--b" aria-hidden="true"></div>

      <div class="arena-hero__meta">
        <div>
          <span class="arena-game-dot"></span>
          <strong>${esc(nomJeu(m.jeu))}</strong>
          <i></i>
          <span>${esc(m.evenement)}</span>
          <i></i>
          <span>BO${esc(String(m.format))}</span>
        </div>
        <span class="arena-countdown${live ? ' arena-countdown--live' : ''}">
          ${live ? '<b></b> LIVE' : `${esc(quand(m.debut))} · ${esc(heure)}`}
        </span>
      </div>

      <div class="arena-versus">
        ${heroCamp({
          nom: m.equipe_a,
          tag: m.tag_a,
          choix: choixA,
          proba: pA,
          cote: coteA,
          droite: false,
          ouvert: ouvert && !prono,
        })}

        <div class="arena-versus__centre" aria-hidden="true">
          <span>VERSUS</span>
          <strong>VS</strong>
          <i></i>
        </div>

        ${heroCamp({
          nom: m.equipe_b,
          tag: m.tag_b,
          choix: choixB,
          proba: pB,
          cote: coteB,
          droite: true,
          ouvert: ouvert && !prono,
        })}
      </div>

      <div class="arena-hero__footer">
        ${prono ? resumeProno(prono) : etatHero({ ouvert, live, choix })}
        <a class="arena-details" href="#/matchs/${encodeURIComponent(m.id)}">
          <span>${prono ? 'Ouvrir mon pronostic' : 'Voir le Match Center'}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
        </a>
      </div>

      <div class="arena-dock" id="arena-dock" aria-live="polite"></div>
    </section>`;
}

function heroCamp({ nom, tag, choix, proba, cote, droite, ouvert }) {
  const exemple = cote ? Math.round(100 * cote) : null;
  const attrs = choix && ouvert
    ? `data-arena-choix="1" data-marche="vainqueur" data-cle="${esc(choix.cle)}" data-libelle="${esc(choix.libelle)}" data-cote="${esc(String(choix.cote))}"`
    : '';

  return `
    <button class="arena-team${droite ? ' arena-team--right' : ''}${ouvert ? '' : ' arena-team--locked'}" ${attrs} type="button" ${ouvert ? '' : 'disabled'}>
      <span class="arena-team__logo">${ecusson(tag, nom)}</span>
      <span class="arena-team__copy">
        <small>${esc(tag)}</small>
        <strong>${esc(nom)}</strong>
        <span>${proba == null ? 'Choix disponible' : `${proba} % ${proba >= 50 ? 'favori' : 'outsider'}`}</span>
      </span>
      ${exemple == null ? '' : `<span class="arena-team__return">${jeton(16)} 100 <i>→</i> ${esc(formaterFrags(exemple))}</span>`}
    </button>`;
}

function etatHero({ ouvert, live, choix }) {
  if (!choix.length) return `<p class="arena-hero__hint">Les choix seront disponibles dès que le marché du match sera publié.</p>`;
  if (live) return `<p class="arena-hero__hint"><span class="arena-live-pulse"></span> Le match a commencé : les pronostics sont verrouillés.</p>`;
  if (!ouvert) return `<p class="arena-hero__hint">Les pronostics sont fermés sur cette affiche.</p>`;
  return `<p class="arena-hero__hint"><span class="arena-live-pulse"></span> Clique directement sur une équipe pour préparer ton pronostic.</p>`;
}

function resumeProno(p) {
  const potentiel = Math.round(Number(p.mise || 0) * Number(p.cote || 0));
  return `
    <div class="arena-my-pick">
      <span>Ton choix est verrouillé</span>
      <strong>${esc(p.libelle_choix)}</strong>
      <small>${jeton(14)} ${esc(formaterFrags(p.mise))} engagés · ${esc(formaterFrags(potentiel))} potentiel</small>
    </div>`;
}

function timeline(matchs, paris, resultats) {
  const groupes = grouperMatchs(matchs, resultats);
  return `<div class="arena-timeline">${groupes.map(({ libelle, matchs: items }) => `
    <section class="arena-day">
      <div class="arena-day__label"><span>${esc(libelle)}</span><i></i></div>
      <div class="arena-day__matches">
        ${items.map((m) => ligneMatch(m, paris, resultats)).join('')}
      </div>
    </section>`).join('')}</div>`;
}

function grouperMatchs(matchs, resultats) {
  const groupes = [];
  const index = new Map();
  for (const m of matchs) {
    const libelle = groupeTemporel(m, resultats);
    if (!index.has(libelle)) {
      index.set(libelle, groupes.length);
      groupes.push({ libelle, matchs: [] });
    }
    groupes[index.get(libelle)].matchs.push(m);
  }
  return groupes;
}

function groupeTemporel(m, resultats) {
  const date = new Date(m.debut);
  if (resultats) {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  const now = new Date();
  const delta = date.getTime() - now.getTime();
  if (delta <= 0) return 'EN DIRECT';
  if (delta < 60 * 60 * 1000) return 'BIENTÔT';
  if (memeJour(date, now)) return "AUJOURD'HUI";

  const demain = new Date(now);
  demain.setDate(demain.getDate() + 1);
  if (memeJour(date, demain)) return 'DEMAIN';

  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function memeJour(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function ligneMatch(m, paris, resultats) {
  const prono = paris.find((p) => p.match_id === m.id && p.marche === 'vainqueur');
  const heure = new Date(m.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const live = !resultats && new Date(m.debut).getTime() <= Date.now();
  const choix = m.vainqueur?.choix ?? [];
  const pA = choix[0] ? m.probas.get(choix[0].cle) ?? null : null;
  const pB = choix[1] ? m.probas.get(choix[1].cle) ?? null : null;
  const gagnantA = resultats && Number(m.score_a) > Number(m.score_b);
  const gagnantB = resultats && Number(m.score_b) > Number(m.score_a);

  return `
    <a class="arena-row${live ? ' arena-row--live' : ''}${prono ? ' arena-row--picked' : ''}" href="#/matchs/${encodeURIComponent(m.id)}" data-jeu="${esc(m.jeu)}">
      <div class="arena-row__when">
        <strong>${live ? 'LIVE' : esc(heure)}</strong>
        <span>${esc(nomJeu(m.jeu))}</span>
      </div>

      <div class="arena-row__event">
        <span>${esc(m.evenement)}</span>
        <small>BO${esc(String(m.format))}</small>
      </div>

      <div class="arena-row__duel">
        <span class="arena-row__team${gagnantA ? ' gagnant' : ''}">
          ${ecusson(m.tag_a, m.equipe_a, 's')}
          <strong>${esc(m.equipe_a)}</strong>
          ${resultats ? `<b>${esc(String(m.score_a))}</b>` : ''}
        </span>
        <span class="arena-row__vs">${resultats ? '—' : 'VS'}</span>
        <span class="arena-row__team arena-row__team--right${gagnantB ? ' gagnant' : ''}">
          ${resultats ? `<b>${esc(String(m.score_b))}</b>` : ''}
          <strong>${esc(m.equipe_b)}</strong>
          ${ecusson(m.tag_b, m.equipe_b, 's')}
        </span>
      </div>

      ${resultats
        ? `<div class="arena-row__state">${etatPronoResultat(prono)}</div>`
        : `<div class="arena-row__prob">
            <span>${pA == null ? '—' : `${pA}%`}</span>
            <i><b style="width:${pA == null ? 50 : pA}%"></b></i>
            <span>${pB == null ? '—' : `${pB}%`}</span>
          </div>`}

      <div class="arena-row__action">
        ${prono
          ? `<span><b>Ton choix</b>${esc(prono.libelle_choix)}</span>`
          : resultats
            ? '<span>Voir le détail</span>'
            : `<span>${live ? 'Suivre' : 'Pronostiquer'} <b>→</b></span>`}
      </div>
    </a>`;
}

function etatPronoResultat(p) {
  if (!p) return '<span class="arena-result-badge">Pas de prono</span>';
  if (p.statut === 'gagne') return `<span class="arena-result-badge arena-result-badge--win">+${esc(formaterFrags(p.gain))}</span>`;
  if (p.statut === 'perdu') return '<span class="arena-result-badge arena-result-badge--loss">Perdu</span>';
  return '<span class="arena-result-badge">En attente</span>';
}

function probabilitesNormalisees(choix) {
  const poids = choix.map((c) => ({ cle: c.cle, v: Number(c.cote) > 0 ? 1 / Number(c.cote) : 0 }));
  const total = poids.reduce((s, x) => s + x.v, 0) || 1;
  return new Map(poids.map((x) => [x.cle, Math.round((x.v / total) * 100)]));
}

function ouvrirDockArena(racine, match, btn, apresValidation) {
  const dock = racine.querySelector('#arena-dock');
  if (!dock) return;

  racine.querySelectorAll('.arena-team.is-selected').forEach((el) => el.classList.remove('is-selected'));
  btn.classList.add('is-selected');

  const libelle = btn.dataset.libelle || '';
  const cote = Number(btn.dataset.cote || 0);
  const choix = btn.dataset.cle || '';
  const marche = btn.dataset.marche || 'vainqueur';

  if (!contexte.utilisateur) {
    dock.innerHTML = `
      <div class="arena-ticket arena-ticket--login">
        <div>
          <span>Ton choix</span>
          <strong>${esc(libelle)}</strong>
          <small>Crée ton profil pour engager des Frags.</small>
        </div>
        <a class="btn" href="#/connexion">Créer mon profil</a>
      </div>`;
    return;
  }

  const solde = Number(contexte.utilisateur.solde || 0);
  if (solde < MISE_MIN) {
    dock.innerHTML = `
      <div class="arena-ticket arena-ticket--login">
        <div><span>${esc(libelle)}</span><strong>Pas assez de Frags</strong><small>Il faut au moins ${esc(String(MISE_MIN))} Frags pour valider ce choix.</small></div>
      </div>`;
    return;
  }

  const maximum = Math.min(MISE_MAX, solde);
  const depart = Math.min(100, maximum);
  const rapides = [...new Set([50, 100, 250, 500].filter((v) => v >= MISE_MIN && v <= maximum))];

  dock.innerHTML = `
    <div class="arena-ticket">
      <div class="arena-ticket__pick">
        <span>Ton pronostic</span>
        <strong>${esc(libelle)}</strong>
        <small>${esc(match.equipe_a)} vs ${esc(match.equipe_b)}</small>
      </div>

      <div class="arena-ticket__stake">
        <label for="arena-mise">Frags engagés</label>
        <div class="arena-ticket__input">
          ${jeton(18)}
          <input id="arena-mise" type="number" min="${MISE_MIN}" max="${maximum}" step="10" value="${depart}" inputmode="numeric" />
        </div>
        <div class="arena-ticket__quick">
          ${rapides.map((v) => `<button data-arena-mise="${v}" type="button">${v}</button>`).join('')}
          <button data-arena-mise="max" type="button">Max</button>
        </div>
      </div>

      <div class="arena-ticket__return">
        <span>Potentiel</span>
        <strong id="arena-gain"></strong>
        <small>Solde : ${esc(formaterFrags(solde))} Frags</small>
      </div>

      <button class="arena-ticket__confirm" id="arena-valider" type="button">Valider mon pronostic</button>
    </div>`;

  const input = dock.querySelector('#arena-mise');
  const gain = dock.querySelector('#arena-gain');
  const valider = dock.querySelector('#arena-valider');

  const maj = () => {
    const mise = Math.max(0, Number(input.value || 0));
    gain.innerHTML = `${jeton(15)} ${esc(formaterFrags(Math.round(mise * cote)))}`;
    valider.disabled = mise < MISE_MIN || mise > maximum;
  };
  maj();
  input.addEventListener('input', maj);

  dock.querySelectorAll('[data-arena-mise]').forEach((quick) => {
    quick.addEventListener('click', () => {
      input.value = quick.dataset.arenaMise === 'max' ? maximum : quick.dataset.arenaMise;
      maj();
    });
  });

  valider.addEventListener('click', async () => {
    valider.disabled = true;
    const mise = Number(input.value);
    try {
      const cree = await api.placerPari({ matchId: match.id, marche, choix, mise });
      await majSolde();
      const potentiel = Math.round(Number(cree?.mise ?? mise) * Number(cree?.cote ?? cote));
      dock.innerHTML = `
        <div class="arena-lock">
          <span class="arena-lock__icon">✓</span>
          <div><span>PRONOSTIC VERROUILLÉ</span><strong>${esc(libelle)}</strong><small>${jeton(14)} ${esc(formaterFrags(mise))} engagés · ${esc(formaterFrags(potentiel))} potentiel</small></div>
        </div>`;
      toast(`Pronostic validé : ${libelle}`, 'succes');
      setTimeout(() => apresValidation(), 900);
    } catch (err) {
      toast(err.message, 'erreur');
      valider.disabled = false;
    }
  });
}

async function rappelDuCall() {
  if (!contexte.utilisateur) return '';
  try {
    const [call, evenements] = await Promise.all([api.monCall(), api.listerEvenementsSaison()]);
    if (call) return '';
    const ouverts = evenements.filter((e) => e.statut === 'ouvert');
    if (!ouverts.length) return '';
    return `
      <aside class="arena-call">
        <div class="arena-call__mark">C</div>
        <div>
          <span class="sur-titre">Call de saison</span>
          <strong>Un choix pour tout le tournoi.</strong>
          <small>${ouverts.length} tournoi${ouverts.length > 1 ? 's' : ''} encore ouvert${ouverts.length > 1 ? 's' : ''}.</small>
        </div>
        <a href="#/call">Poser mon call →</a>
      </aside>`;
  } catch {
    return '';
  }
}
