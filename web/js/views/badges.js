import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, vide } from '../ui.js';
import { progressionNiveau } from '../core.js';
import {
  NB_BADGES_PUBLICS,
  FAMILLES_BADGES_V2,
  evaluerBadgesV2,
  xpDetailleeV2,
  xpDuBadgeV2,
  ordreRareteV2,
  rareteBadgeV2,
  libelleRareteV2,
  nomBadgeAffiche,
  descriptionBadgeAffiche,
  conditionBadgeAffiche,
  iconeFamilleBadge,
} from '../badges-v2.js';

export async function vueBadges(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil, pronostique, et l’Arsenal se remplira.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const donneesBrutes = await api.mesBadges();
  if (!donneesBrutes) {
    racine.innerHTML = vide('Rien à afficher', 'Impossible de calculer ton Arsenal pour le moment.');
    return;
  }

  const recap = donneesBrutes.recap ?? {};
  const badges = evaluerBadgesV2(recap);
  const u = contexte.utilisateur;
  const xp = xpDetailleeV2({
    badges,
    recap,
    note: u?.note ?? null,
    note_paris: u?.note_paris ?? recap.paris ?? 0,
  });
  const niveau = progressionNiveau(xp.total);
  const obtenus = badges.filter((b) => b.obtenu);
  const publics = badges.filter((b) => !b.secret);
  const publicsObtenus = publics.filter((b) => b.obtenu);
  const secretsObtenus = badges.filter((b) => b.secret && b.obtenu);

  racine.innerHTML = `
    <p><a href="#/profil">← Mon profil</a></p>

    <div class="entete-page arsenal-entete">
      <div>
        <div class="sur-titre">Collection permanente</div>
        <h1>Arsenal</h1>
        <p>
          ${publicsObtenus.length} / ${NB_BADGES_PUBLICS} distinctions découvertes.
          ${secretsObtenus.length
            ? `Tu as aussi ouvert ${secretsObtenus.length} archive${secretsObtenus.length > 1 ? 's' : ''} classifiée${secretsObtenus.length > 1 ? 's' : ''}.`
            : 'Certaines distinctions ne révèlent même pas leur condition.'}
        </p>
      </div>
      <div class="arsenal-entete__compte">${obtenus.length}</div>
    </div>

    ${bandeauNiveau(niveau, xp)}
    ${vitrine(obtenus)}

    <div class="arsenal-legende" aria-label="Raretés">
      ${['commun', 'rare', 'epique', 'legendaire', 'mythique']
        .map((r) => `<span class="arsenal-legende__item arsenal-legende__item--${r}"><i></i>${esc(libelleRareteV2({ rarete: r }))}</span>`)
        .join('')}
    </div>

    ${FAMILLES_BADGES_V2.map((f) => famille(f, publics.filter((b) => b.famille === f))).join('')}

    ${archivesClassifiees(secretsObtenus)}

    <h2 style="margin-top:34px">Où tu en es</h2>
    <div class="grille grille--stats">
      <div class="stat"><div class="stat__valeur">${recap.paris ?? 0}</div><div class="stat__libelle">Pronostics réglés</div></div>
      <div class="stat"><div class="stat__valeur">${Number(recap.precision_pct ?? 0).toFixed(0)} %</div><div class="stat__libelle">Précision carrière</div></div>
      <div class="stat"><div class="stat__valeur">${Number(recap.cote_max_gagnee ?? 0).toFixed(2)}</div><div class="stat__libelle">Plus gros multiplicateur</div></div>
      <div class="stat"><div class="stat__valeur">${recap.plus_longue_serie ?? 0}</div><div class="stat__libelle">Plus longue série</div></div>
      <div class="stat">
        <div class="stat__valeur ${(recap.net ?? 0) >= 0 ? 'positif' : 'negatif'}">${(recap.net ?? 0) >= 0 ? '+' : ''}${esc(frags(recap.net ?? 0))}</div>
        <div class="stat__libelle">Bénéfice net</div>
      </div>
    </div>`;
}

function bandeauNiveau(n, xp) {
  return `
    <div class="niveau">
      <div class="niveau__haut">
        <div>
          <div class="niveau__rang">Niveau ${n.niveau}</div>
          <div class="niveau__titre">${esc(n.titre)}</div>
        </div>
        <div class="niveau__xp">
          <strong>${n.xp.toLocaleString('fr-FR')}</strong> XP
          <div class="niveau__reste">encore ${n.restant.toLocaleString('fr-FR')} avant le niveau ${n.niveau + 1}</div>
        </div>
      </div>
      <div class="niveau__jauge" role="img" aria-label="${Math.round(n.part * 100)} % du niveau ${n.niveau + 1}">
        <div class="niveau__remplie" style="width:${Math.max(2, Math.round(n.part * 100))}%"></div>
      </div>
      <div class="niveau__sources">
        ${xp.sources.length
          ? xp.sources.map((s) => `<span class="niveau__source"><span class="niveau__source-xp">+${s.xp.toLocaleString('fr-FR')}</span> ${esc(s.libelle)} <span class="niveau__source-detail">${esc(s.detail)}</span></span>`).join('')
          : `<span class="niveau__source niveau__source--vide">L’expérience vient des accomplissements, pas du nombre de clics.</span>`}
      </div>
    </div>`;
}

function medaille(badge, taille = 'standard') {
  const rarete = rareteBadgeV2(badge);
  const secret = badge.secret ? ' badge-medaille--secret' : '';
  const verrou = !badge.obtenu ? ' badge-medaille--verrouillee' : '';
  const classeTaille = taille === 'hero' ? ' badge-medaille--hero' : taille === 'mini' ? ' badge-medaille--mini' : '';
  const famille = badge.secret && !badge.obtenu ? 'Prestige' : badge.famille;
  const icone = badge.secret && !badge.obtenu ? '<span class="badge-medaille__question">?</span>' : iconeFamilleBadge(famille, taille === 'hero' ? 34 : 27);

  return `
    <span class="badge-medaille badge-medaille--${esc(rarete)}${secret}${verrou}${classeTaille}">
      <span class="badge-medaille__corps">
        <span class="badge-medaille__centre">${icone}</span>
      </span>
      <span class="badge-medaille__ruban badge-medaille__ruban--g" aria-hidden="true"></span>
      <span class="badge-medaille__ruban badge-medaille__ruban--d" aria-hidden="true"></span>
    </span>`;
}

function vitrine(obtenus) {
  if (!obtenus.length) {
    return `<div class="encart" style="margin:20px 0 8px">
      L’Arsenal est encore silencieux. Le premier badge arrive dès ton premier pronostic.
    </div>`;
  }

  const quatre = [...obtenus]
    .sort((a, b) => ordreRareteV2(a) - ordreRareteV2(b))
    .slice(0, 4);

  return `
    <h2 style="margin-top:28px">Distinctions majeures</h2>
    <p style="color:var(--texte-faible);font-size:.84rem;margin:-4px 0 14px">
      Les pièces les plus rares de ta collection actuelle.
    </p>
    <div class="arsenal-vitrine">
      ${quatre.map((b) => `
        <article class="arsenal-piece arsenal-piece--${esc(rareteBadgeV2(b))}${b.secret ? ' arsenal-piece--secret' : ''}">
          ${medaille(b, 'hero')}
          <div class="arsenal-piece__nom">${esc(nomBadgeAffiche(b))}</div>
          <div class="arsenal-piece__meta">${b.secret ? 'Légendaire secret' : esc(libelleRareteV2(b))} · ${xpDuBadgeV2(b)} XP</div>
        </article>`).join('')}
    </div>`;
}

function famille(nom, liste) {
  const obtenus = liste.filter((b) => b.obtenu).length;
  const trie = [...liste].sort(
    (a, b) => Number(b.obtenu) - Number(a.obtenu) || ordreRareteV2(a) - ordreRareteV2(b)
  );

  return `
    <section class="arsenal-famille">
      <div class="arsenal-famille__titre">
        <h2>${esc(nom)}</h2>
        <span>${obtenus} / ${liste.length}</span>
      </div>
      <div class="arsenal-grille">
        ${trie.map((b) => `
          <article class="badge-fiche badge-fiche--${esc(rareteBadgeV2(b))}${b.obtenu ? ' badge-fiche--obtenu' : ''}">
            <div class="badge-fiche__visuel">${medaille(b)}</div>
            <div class="badge-fiche__texte">
              <div class="badge-fiche__nom">${esc(nomBadgeAffiche(b))}</div>
              <div class="badge-fiche__rarete">${esc(libelleRareteV2(b))} · ${xpDuBadgeV2(b)} XP</div>
              <div class="badge-fiche__desc">${esc(descriptionBadgeAffiche(b))}</div>
              <div class="badge-fiche__condition">${b.obtenu ? '✓ Décroché' : esc(conditionBadgeAffiche(b))}</div>
            </div>
          </article>`).join('')}
      </div>
    </section>`;
}

function archivesClassifiees(secretsObtenus) {
  return `
    <section class="arsenal-secrets">
      <div class="arsenal-secrets__haut">
        <div>
          <div class="sur-titre">Accès restreint</div>
          <h2>Archives classifiées</h2>
        </div>
        <span>Le nombre total de secrets n’est pas communiqué.</span>
      </div>
      <p class="arsenal-secrets__intro">
        Aucune barre de progression. Aucun indice officiel. Si l’un d’eux tombe, il reste dans ta collection pour toujours.
      </p>
      <div class="arsenal-grille arsenal-grille--secrets">
        ${secretsObtenus.map((b) => `
          <article class="badge-fiche badge-fiche--legendaire badge-fiche--obtenu badge-fiche--secret">
            <div class="badge-fiche__visuel">${medaille(b)}</div>
            <div class="badge-fiche__texte">
              <div class="badge-fiche__nom">${esc(b.nom)}</div>
              <div class="badge-fiche__rarete">Légendaire secret · ${xpDuBadgeV2(b)} XP</div>
              <div class="badge-fiche__desc">${esc(b.description)}</div>
              <div class="badge-fiche__condition">Condition de déblocage classifiée.</div>
            </div>
          </article>`).join('')}
        <article class="badge-fiche badge-fiche--mystere">
          <div class="badge-fiche__visuel">${medaille({ rarete: 'legendaire', secret: true, obtenu: false, famille: 'Prestige' })}</div>
          <div class="badge-fiche__texte">
            <div class="badge-fiche__nom">???</div>
            <div class="badge-fiche__rarete">Légendaire secret</div>
            <div class="badge-fiche__desc">Condition inconnue. Archives classifiées.</div>
            <div class="badge-fiche__condition">???</div>
          </div>
        </article>
      </div>
    </section>`;
}
