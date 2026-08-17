/**
 * Match Center V2.
 *
 * Le détail d'un match devient l'endroit où l'on comprend l'affiche et où l'on
 * verrouille un pronostic. Les mots et la hiérarchie sont ceux d'un jeu, pas
 * ceux d'un bookmaker. Le backend conserve ses noms historiques (pari/cote).
 */
import * as api from '../api.js';
import { contexte, majSolde } from '../app.js';
import { esc, quand, dateLisible, nomJeu, toast, surClic, frags, ecusson, jeton } from '../ui.js';
import { MISE_MIN, MISE_MAX, formaterFrags } from '../core.js';

export async function vueMatch(racine, id) {
  const m = await api.lireMatch(id);
  if (!m) {
    racine.innerHTML = `<div class="vide"><h3>Match introuvable</h3><p><a href="#/matchs">Retour aux matchs</a></p></div>`;
    return;
  }

  const saisonMatch = contexte.saisons.find((s) => s.id === m.saison_id) ?? contexte.saison;
  const saisonOuverte = saisonMatch?.statut === 'en_cours';
  const ouvert = saisonOuverte && m.statut === 'a_venir' && new Date(m.debut) > new Date();
  const marches = m.statut === 'termine' ? [] : await api.cotesDuMatch(m.id).catch(() => []);
  let mesPronostics = (await api.mesParis().catch(() => [])).filter((p) => p.match_id === m.id);
  const vainqueur = marches.find((x) => x.cle === 'vainqueur') ?? null;
  const probas = probabilitesNormalisees(vainqueur?.choix ?? []);

  racine.innerHTML = `
    <section class="match-center" data-jeu="${esc(m.jeu)}">
      <a class="match-center__back" href="#/matchs">← Retour à la Match Arena</a>

      ${heroMatchCenter(m, vainqueur, probas)}

      <div class="match-center__layout">
        <main class="match-center__main">
          ${mesPronostics.length ? blocMesPronostics(mesPronostics) : ''}
          ${etatMarches({ m, marches, ouvert, saisonOuverte, saisonMatch })}
        </main>

        <aside class="match-center__side">
          <div class="match-ticket-shell" id="match-ticket">
            ${ticketInitial(m, ouvert, mesPronostics)}
          </div>
          ${blocRepere(vainqueur, probas)}
        </aside>
      </div>
    </section>`;

  if (!ouvert) return;

  surClic(racine, '[data-prono-choice]', (btn) => {
    racine.querySelectorAll('[data-prono-choice].is-selected').forEach((el) => el.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    ouvrirTicket(racine, m, btn, async () => {
      mesPronostics = (await api.mesParis().catch(() => mesPronostics)).filter((p) => p.match_id === m.id);
      rafraichirResume(racine, mesPronostics);
    });
  });
}

function heroMatchCenter(m, vainqueur, probas) {
  const choix = vainqueur?.choix ?? [];
  const pA = choix[0] ? probas.get(choix[0].cle) ?? 50 : 50;
  const pB = choix[1] ? probas.get(choix[1].cle) ?? 50 : 50;
  const termine = m.statut === 'termine';
  const live = !termine && new Date(m.debut).getTime() <= Date.now();
  const gagnantA = termine && Number(m.score_a) > Number(m.score_b);
  const gagnantB = termine && Number(m.score_b) > Number(m.score_a);

  return `
    <section class="match-center__hero">
      <div class="match-center__hero-glow" aria-hidden="true"></div>
      <div class="match-center__meta">
        <span class="arena-game-dot"></span>
        <strong>${esc(nomJeu(m.jeu))}</strong>
        <i></i>
        <span>${esc(m.evenement)}</span>
        <i></i>
        <span>BO${esc(String(m.format))}</span>
        <span class="match-center__date${live ? ' is-live' : ''}">${live ? '● LIVE' : esc(dateLisible(m.debut))}</span>
      </div>

      <div class="match-center__duel">
        <div class="match-center__team${gagnantA ? ' gagnant' : ''}">
          ${ecusson(m.tag_a, m.equipe_a)}
          <span>${esc(m.tag_a)}</span>
          <strong>${esc(m.equipe_a)}</strong>
          ${termine ? `<b class="match-center__score">${esc(String(m.score_a))}</b>` : ''}
        </div>

        <div class="match-center__versus">
          <span>BO${esc(String(m.format))}</span>
          <strong>${termine ? 'FINAL' : 'VS'}</strong>
          <small>${termine ? 'Match terminé' : esc(quand(m.debut))}</small>
        </div>

        <div class="match-center__team match-center__team--right${gagnantB ? ' gagnant' : ''}">
          ${ecusson(m.tag_b, m.equipe_b)}
          <span>${esc(m.tag_b)}</span>
          <strong>${esc(m.equipe_b)}</strong>
          ${termine ? `<b class="match-center__score">${esc(String(m.score_b))}</b>` : ''}
        </div>
      </div>

      ${termine || !choix.length ? '' : `
        <div class="match-center__probability" role="img" aria-label="${pA} % pour ${esc(m.equipe_a)}, ${pB} % pour ${esc(m.equipe_b)}">
          <span><strong>${pA}%</strong> ${esc(m.tag_a)}</span>
          <i><b style="width:${pA}%"></b></i>
          <span>${esc(m.tag_b)} <strong>${pB}%</strong></span>
        </div>`}
    </section>`;
}

function etatMarches({ m, marches, ouvert, saisonOuverte, saisonMatch }) {
  if (m.statut === 'termine') {
    return `
      <section class="match-closed">
        <span class="sur-titre">Terminé</span>
        <h2>Le verdict est tombé.</h2>
        <p>Les pronostics associés à ce match ont été réglés. Ton historique reste visible ci-dessus.</p>
      </section>`;
  }

  if (!saisonOuverte) {
    return `
      <section class="match-closed">
        <span class="sur-titre">Pronostics fermés</span>
        <h2>Cette saison n'est plus active.</h2>
        <p>Ce match appartient à <strong>${esc(saisonMatch?.nom ?? 'une autre saison')}</strong>.</p>
      </section>`;
  }

  if (!ouvert) {
    return `
      <section class="match-closed match-closed--live">
        <span class="sur-titre">Match en cours</span>
        <h2>Les choix sont verrouillés.</h2>
        <p>Une fois le match commencé, aucun nouveau Frag ne peut être engagé.</p>
      </section>`;
  }

  if (!marches.length) {
    return `
      <section class="match-closed">
        <span class="sur-titre">Marchés</span>
        <h2>Les choix arrivent bientôt.</h2>
        <p>Aucun pronostic n'est encore publié pour cette affiche.</p>
      </section>`;
  }

  return `
    <section class="match-markets">
      <div class="match-markets__heading">
        <div>
          <span class="sur-titre">Pronostics</span>
          <h2>Qu'est-ce que tu vois arriver ?</h2>
        </div>
        <span>Les Frags sont fictifs et non convertibles.</span>
      </div>
      ${marches.map((marche) => blocMarche(marche)).join('')}
    </section>`;
}

function blocMarche(marche) {
  const probas = probabilitesNormalisees(marche.choix);
  const principal = marche.cle === 'vainqueur';

  return `
    <section class="match-market${principal ? ' match-market--main' : ''}">
      <header>
        <div>
          <h3>${esc(marche.libelle)}</h3>
          <p>${esc(marche.aide)}</p>
        </div>
        ${principal ? '<span>Choix principal</span>' : ''}
      </header>

      <div class="match-market__choices${marche.choix.length > 3 ? ' match-market__choices--wrap' : ''}">
        ${marche.choix.map((c) => choixMarche(marche, c, probas.get(c.cle))).join('')}
      </div>
    </section>`;
}

function choixMarche(marche, c, proba) {
  const potentiel = Math.round(100 * Number(c.cote || 0));
  return `
    <button class="match-choice" data-prono-choice="1"
            data-marche="${esc(marche.cle)}" data-choix="${esc(c.cle)}"
            data-libelle="${esc(c.libelle)}" data-cote="${esc(String(c.cote))}" type="button">
      <span class="match-choice__label">${esc(c.libelle)}</span>
      ${proba == null ? '' : `<strong>${proba}%</strong>`}
      <small>${jeton(13)} 100 <i>→</i> ${esc(formaterFrags(potentiel))}</small>
    </button>`;
}

function ticketInitial(m, ouvert, pronostics) {
  const principal = pronostics.find((p) => p.marche === 'vainqueur' && p.statut === 'en_cours');
  if (principal) {
    const potentiel = Math.round(Number(principal.mise || 0) * Number(principal.cote || 0));
    return `
      <div class="match-ticket match-ticket--locked">
        <span class="sur-titre">Ton choix principal</span>
        <span class="match-ticket__lock">✓</span>
        <strong>${esc(principal.libelle_choix)}</strong>
        <p>${jeton(14)} ${esc(formaterFrags(principal.mise))} Frags engagés</p>
        <div class="match-ticket__potential"><span>Potentiel</span><b>${esc(formaterFrags(potentiel))}</b></div>
        <small>Tu peux encore explorer les autres pronostics du match tant qu'il n'a pas commencé.</small>
      </div>`;
  }

  if (!ouvert) {
    return `
      <div class="match-ticket match-ticket--idle">
        <span class="sur-titre">Pronostic</span>
        <strong>Choix verrouillés</strong>
        <p>Le Match Center reste consultable, mais l'action est fermée.</p>
      </div>`;
  }

  return `
    <div class="match-ticket match-ticket--idle">
      <span class="sur-titre">Ton pronostic</span>
      <div class="match-ticket__target">+</div>
      <strong>Choisis une issue.</strong>
      <p>Clique sur un choix à gauche. Ton bulletin apparaîtra ici sans quitter le match.</p>
    </div>`;
}

function blocMesPronostics(pronostics) {
  return `
    <section class="match-my-picks" id="mes-pronostics">
      <div class="match-my-picks__heading">
        <div><span class="sur-titre">Déjà posé</span><h2>Tes pronostics</h2></div>
        <span>${pronostics.length}</span>
      </div>
      <div class="match-my-picks__list">
        ${pronostics.map(lignePronostic).join('')}
      </div>
    </section>`;
}

function lignePronostic(p) {
  const potentiel = Math.round(Number(p.mise || 0) * Number(p.cote || 0));
  return `
    <div class="match-my-pick">
      <div><span>${esc(p.libelle_marche)}</span><strong>${esc(p.libelle_choix)}</strong></div>
      <div><span>${jeton(13)} ${esc(formaterFrags(p.mise))} engagés</span><small>${esc(formaterFrags(potentiel))} potentiel</small></div>
      ${badgePronostic(p)}
    </div>`;
}

function badgePronostic(p) {
  if (p.statut === 'gagne') return `<span class="match-pick-status match-pick-status--win">+${esc(formaterFrags(p.gain))}</span>`;
  if (p.statut === 'perdu') return '<span class="match-pick-status match-pick-status--loss">Perdu</span>';
  return '<span class="match-pick-status">En cours</span>';
}

function blocRepere(vainqueur, probas) {
  const choix = vainqueur?.choix ?? [];
  if (choix.length < 2) return '';
  const favori = [...choix].sort((a, b) => Number(a.cote) - Number(b.cote))[0];
  const proba = probas.get(favori.cle);
  return `
    <div class="match-insight">
      <span class="sur-titre">Repère</span>
      <strong>${esc(favori.libelle)} part favori.</strong>
      <p>${proba == null ? 'La tendance est proche.' : `${proba}% dans la répartition calculée à partir des coefficients du match.`}</p>
      <small>Ce repère décrit le modèle de Clutch, pas le vote de la communauté.</small>
    </div>`;
}

function ouvrirTicket(racine, m, btn, apresValidation) {
  const zone = racine.querySelector('#match-ticket');
  const marche = btn.dataset.marche;
  const choix = btn.dataset.choix;
  const libelle = btn.dataset.libelle;
  const cote = Number(btn.dataset.cote || 0);

  if (!contexte.utilisateur) {
    zone.innerHTML = `
      <div class="match-ticket match-ticket--login">
        <span class="sur-titre">${esc(libelle)}</span>
        <strong>Crée ton profil pour jouer.</strong>
        <p>Ton compte démarre avec des Frags fictifs pour participer à la saison.</p>
        <a class="btn" href="#/connexion">Créer mon profil</a>
      </div>`;
    scrollTicket(zone);
    return;
  }

  const solde = Number(contexte.utilisateur.solde || 0);
  const maximum = Math.min(MISE_MAX, solde);
  if (maximum < MISE_MIN) {
    zone.innerHTML = `
      <div class="match-ticket match-ticket--idle">
        <span class="sur-titre">${esc(libelle)}</span>
        <strong>Pas assez de Frags.</strong>
        <p>Il faut au moins ${MISE_MIN} Frags pour engager un pronostic.</p>
      </div>`;
    scrollTicket(zone);
    return;
  }

  const depart = Math.min(100, maximum);
  const rapides = [...new Set([50, 100, 250, 500].filter((v) => v >= MISE_MIN && v <= maximum))];

  zone.innerHTML = `
    <div class="match-ticket match-ticket--active">
      <span class="sur-titre">Ton pronostic</span>
      <div class="match-ticket__selected">
        <small>${esc(m.equipe_a)} vs ${esc(m.equipe_b)}</small>
        <strong>${esc(libelle)}</strong>
      </div>

      <label class="match-ticket__label" for="match-mise">Frags engagés</label>
      <div class="match-ticket__stake">
        ${jeton(20)}
        <input id="match-mise" type="number" min="${MISE_MIN}" max="${maximum}" step="10" value="${depart}" inputmode="numeric" />
      </div>

      <div class="match-ticket__quick">
        ${rapides.map((v) => `<button data-ticket-mise="${v}" type="button">${v}</button>`).join('')}
        <button data-ticket-mise="max" type="button">Max</button>
      </div>

      <div class="match-ticket__potential">
        <span>Gain potentiel</span>
        <b id="match-gain"></b>
      </div>
      <small class="match-ticket__balance">Solde : ${frags(solde)} · coefficient figé à la validation</small>
      <button class="match-ticket__confirm" id="match-valider" type="button">Valider mon pronostic</button>
    </div>`;

  const input = zone.querySelector('#match-mise');
  const gain = zone.querySelector('#match-gain');
  const valider = zone.querySelector('#match-valider');

  const maj = () => {
    const mise = Math.max(0, Number(input.value || 0));
    gain.innerHTML = `${jeton(15)} ${esc(formaterFrags(Math.round(mise * cote)))}`;
    valider.disabled = mise < MISE_MIN || mise > maximum;
  };
  maj();
  input.addEventListener('input', maj);

  zone.querySelectorAll('[data-ticket-mise]').forEach((quick) => {
    quick.addEventListener('click', () => {
      input.value = quick.dataset.ticketMise === 'max' ? maximum : quick.dataset.ticketMise;
      maj();
    });
  });

  valider.addEventListener('click', async () => {
    valider.disabled = true;
    const mise = Number(input.value);
    try {
      const cree = await api.placerPari({ matchId: m.id, marche, choix, mise });
      await majSolde();
      const potentiel = Math.round(Number(cree?.mise ?? mise) * Number(cree?.cote ?? cote));
      zone.innerHTML = `
        <div class="match-ticket match-ticket--success">
          <span class="match-ticket__success-icon">✓</span>
          <span class="sur-titre">Pronostic verrouillé</span>
          <strong>${esc(libelle)}</strong>
          <p>${jeton(14)} ${esc(formaterFrags(mise))} engagés · ${esc(formaterFrags(potentiel))} potentiel</p>
          <small>Ton choix est enregistré. Le résultat du match décidera du reste.</small>
        </div>`;
      toast(`Pronostic validé : ${libelle}`, 'succes');
      await apresValidation();
    } catch (err) {
      toast(err.message, 'erreur');
      valider.disabled = false;
    }
  });

  scrollTicket(zone);
}

function rafraichirResume(racine, pronostics) {
  const existant = racine.querySelector('#mes-pronostics');
  const html = blocMesPronostics(pronostics);
  if (existant) {
    existant.outerHTML = html;
    return;
  }
  const main = racine.querySelector('.match-center__main');
  if (main) main.insertAdjacentHTML('afterbegin', html);
}

function scrollTicket(zone) {
  if (window.matchMedia('(max-width: 760px)').matches) {
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function probabilitesNormalisees(choix) {
  const poids = choix.map((c) => ({ cle: c.cle, v: Number(c.cote) > 0 ? 1 / Number(c.cote) : 0 }));
  const total = poids.reduce((s, x) => s + x.v, 0) || 1;
  return new Map(poids.map((x) => [x.cle, Math.round((x.v / total) * 100)]));
}
