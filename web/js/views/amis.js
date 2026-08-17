/** Amis V4 — social graph natif Economy V2. */
import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, vide, toast, surClic, quand } from '../ui.js';

export async function sectionAmis(zone) {
  if (!contexte.utilisateur) {
    zone.innerHTML = `<section class="friends-v4 friends-v4--guest">${vide(
      'Tes rivalités commencent avec des gens que tu connais.',
      'Connecte-toi pour retrouver tes amis, comparer vos ratings et revivre vos pronostics déjà réglés.',
      '<a class="btn" href="#/connexion">Créer mon profil</a>'
    )}</section>`;
    return;
  }

  await rafraichir(zone);

  surClic(zone, '[data-action]', async (btn) => {
    const { action, user } = btn.dataset;
    btn.disabled = true;
    try {
      if (action === 'demander') {
        const r = await api.demanderAmi(user);
        toast(r.statut === 'acceptee' ? 'Vous êtes amis !' : 'Demande envoyée.', 'succes');
      } else if (action === 'accepter') {
        await api.repondreDemande(user, true);
        toast('Demande acceptée.', 'succes');
      } else if (action === 'refuser') {
        await api.repondreDemande(user, false);
        toast('Demande refusée.');
      } else if (action === 'retirer') {
        await api.retirerAmi(user);
        toast('Lien retiré.');
      }
      await rafraichir(zone, zone.querySelector('#recherche')?.value ?? '');
    } catch (e) {
      toast(e.message || 'Action impossible.', 'erreur');
      btn.disabled = false;
    }
  });
}

async function rafraichir(zone, terme = '') {
  const [donnees, activite] = await Promise.all([
    api.mesAmis().catch(() => ({ amis: [], recues: [], envoyees: [] })),
    api.activiteAmis().catch(() => []),
  ]);
  const resultats = terme.trim().length >= 2 ? await api.chercherJoueurs(terme).catch(() => []) : [];

  zone.innerHTML = `
    <section class="friends-v4">
      <header class="friends-v4__hero">
        <div>
          <span class="ligues-v2__kicker">TON CERCLE</span>
          <h2>Les gens derrière les pseudos.</h2>
          <p>Comparez vos ratings, créez des ligues et gardez les pronostics en cours secrets jusqu'au verdict.</p>
        </div>
        <div class="friends-v4__count"><strong>${donnees.amis?.length ?? 0}</strong><span>ami${(donnees.amis?.length ?? 0) > 1 ? 's' : ''}</span></div>
      </header>

      ${blocDemandes(donnees.recues)}

      <section class="friends-v4__search">
        <div class="friends-v4__section-title">
          <span class="ligues-v2__kicker">TROUVER UN JOUEUR</span>
          <h3>Ajoute quelqu'un à ton cercle.</h3>
        </div>
        <label class="friends-v4__searchbox">
          <span aria-hidden="true">⌕</span>
          <input type="text" id="recherche" placeholder="Chercher un pseudo…" autocomplete="off" value="${esc(terme)}" />
        </label>
        <div class="friends-v4__search-results" id="resultats">${listeResultats(resultats, terme)}</div>
      </section>

      ${blocAmis(donnees.amis, donnees.envoyees)}
      ${blocActivite(activite)}
    </section>`;

  const champ = zone.querySelector('#recherche');
  if (champ) {
    let minuteur;
    champ.addEventListener('input', (e) => {
      const v = e.target.value;
      clearTimeout(minuteur);
      minuteur = setTimeout(async () => {
        const liste = v.trim().length >= 2 ? await api.chercherJoueurs(v).catch(() => []) : [];
        const cible = zone.querySelector('#resultats');
        if (cible) cible.innerHTML = listeResultats(liste, v);
      }, 280);
    });
    if (terme) {
      champ.focus();
      champ.setSelectionRange(terme.length, terme.length);
    }
  }
}

function blocDemandes(recues) {
  if (!recues?.length) return '';
  return `<section class="friends-v4__requests">
    <div class="friends-v4__section-title friends-v4__section-title--row"><div><span class="ligues-v2__kicker">EN ATTENTE</span><h3>${recues.length} demande${recues.length > 1 ? 's' : ''} reçue${recues.length > 1 ? 's' : ''}</h3></div><span>${recues.length}</span></div>
    <div class="friends-v4__request-list">${recues.map((d) => `
      <article class="friends-v4__request">
        <span class="friends-v4__avatar">${esc(initiales(d.pseudo))}</span>
        <div><strong>${esc(d.pseudo)}</strong><small>${esc(quand(d.depuis))}</small></div>
        <div class="friends-v4__actions"><button class="btn btn--petit" data-action="accepter" data-user="${esc(d.id)}">Accepter</button><button class="btn btn--petit btn--fantome" data-action="refuser" data-user="${esc(d.id)}">Refuser</button></div>
      </article>`).join('')}</div>
  </section>`;
}

function listeResultats(liste, terme) {
  if (terme.trim().length < 2) return '<p class="friends-v4__hint">Tape au moins deux lettres.</p>';
  if (!liste.length) return '<p class="friends-v4__hint">Aucun joueur trouvé.</p>';
  const bouton = {
    aucune: (id) => `<button class="btn btn--petit" data-action="demander" data-user="${esc(id)}">Ajouter</button>`,
    demande_envoyee: () => '<span class="badge">Demande envoyée</span>',
    demande_recue: (id) => `<button class="btn btn--petit" data-action="accepter" data-user="${esc(id)}">Accepter</button>`,
    ami: () => '<span class="badge">Ami</span>',
  };
  return liste.map((j) => `<div class="friends-v4__result"><span class="friends-v4__avatar friends-v4__avatar--small">${esc(initiales(j.pseudo))}</span><strong>${esc(j.pseudo)}</strong><div>${bouton[j.relation](j.id)}</div></div>`).join('');
}

function blocAmis(amis = [], envoyees = []) {
  const enAttente = envoyees.map((d) => `<article class="friends-v4__friend friends-v4__friend--pending"><span class="friends-v4__avatar">${esc(initiales(d.pseudo))}</span><div class="friends-v4__friend-copy"><strong>${esc(d.pseudo)}</strong><small>Demande envoyée ${esc(quand(d.depuis))}</small></div><button class="btn btn--petit btn--fantome" data-action="retirer" data-user="${esc(d.id)}">Annuler</button></article>`).join('');

  return `<section class="friends-v4__roster">
    <div class="friends-v4__section-title friends-v4__section-title--row"><div><span class="ligues-v2__kicker">MES AMIS</span><h3>Ton cercle de jeu.</h3></div><span>${amis.length}</span></div>
    <div class="friends-v4__grid">${amis.length ? amis.map(carteAmi).join('') : `<div class="friends-v4__empty">${vide('Personne pour l’instant', 'Cherche un pseudo ou partage le code d’une ligue.')}</div>`}${enAttente}</div>
  </section>`;
}

function carteAmi(a) {
  const pronostics = Number(a.paris ?? 0);
  const gagnes = Number(a.gagnes ?? 0);
  const precision = pronostics > 0 ? Math.round((gagnes / pronostics) * 100) : null;
  return `<article class="friends-v4__friend">
    <div class="friends-v4__friend-top"><span class="friends-v4__avatar">${esc(initiales(a.pseudo))}</span>${a.tag_favori ? `<span class="friends-v4__faction">${esc(a.tag_favori)}</span>` : ''}</div>
    <div class="friends-v4__friend-copy"><strong>${esc(a.pseudo)}</strong><span>${esc(frags(a.solde ?? 1000))} Frags</span></div>
    <dl class="friends-v4__stats"><div><dt>Pronostics</dt><dd>${pronostics}</dd></div><div><dt>Réussite</dt><dd>${precision == null ? '—' : `${precision}%`}</dd></div></dl>
    <div class="friends-v4__friend-foot"><span>Rating saisonnier</span><button class="friends-v4__remove" data-action="retirer" data-user="${esc(a.id)}" type="button">Retirer</button></div>
  </article>`;
}

function blocActivite(activite) {
  if (!activite?.length) return '';
  return `<section class="friends-v4__activity">
    <div class="friends-v4__section-title"><span class="ligues-v2__kicker">APRÈS LE VERDICT</span><h3>Ce qu'ils ont tenté.</h3><p>Les choix en cours restent privés. L'activité n'apparaît qu'une fois le match réglé.</p></div>
    <div class="friends-v4__feed">${activite.slice(0, 12).map((e) => {
      const choix = e.choix === 'a' ? e.equipe_a : e.choix === 'b' ? e.equipe_b : e.choix;
      const delta = Number(e.delta_frags ?? 0);
      const gagne = e.statut === 'gagne';
      const proba = Number.isFinite(Number(e.proba_figee)) ? Math.round(Number(e.proba_figee) * 100) : null;
      return `<article class="friends-v4__feed-row"><span class="friends-v4__avatar friends-v4__avatar--small">${esc(initiales(e.pseudo))}</span><div><strong>${esc(e.pseudo)}</strong><p>a choisi <b>${esc(choix)}</b> sur ${esc(e.equipe_a)} – ${esc(e.equipe_b)}${proba == null ? '' : ` · ${proba}% modèle`}.</p><small>${esc(quand(e.quand))}</small></div><span class="friends-v4__delta ${gagne ? 'positif' : 'negatif'}">${gagne ? '+' : '−'}${esc(frags(Math.abs(delta)))}</span></article>`;
    }).join('')}</div>
  </section>`;
}

function initiales(nom = '') {
  const mots = String(nom).trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return `${mots[0][0]}${mots[1][0]}`.toUpperCase();
}
