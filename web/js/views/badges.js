import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, vide } from '../ui.js';
import { FAMILLES_BADGES } from '../core.js';

/**
 * L'onglet badges.
 *
 * Les badges non obtenus sont affichés, pas masqués : un badge qu'on ne voit
 * pas ne donne envie de rien. C'est la liste des choses à tenter, autant que
 * le tableau de chasse.
 */
export async function vueBadges(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée-toi un profil, mise, et les badges viendront.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const donnees = await api.mesBadges();
  if (!donnees) {
    racine.innerHTML = vide('Rien à afficher', 'Impossible de calculer tes badges pour le moment.');
    return;
  }

  const { badges, recap } = donnees;
  const obtenus = badges.filter((b) => b.obtenu);

  racine.innerHTML = `
    <p><a href="#/profil">← Mes paris</a></p>
    <div class="entete-page">
      <div>
        <h1>Mes badges</h1>
        <p>${obtenus.length} sur ${badges.length} — sur toute ta carrière, saisons confondues.</p>
      </div>
    </div>

    <div class="jauge" role="img" aria-label="${obtenus.length} badges sur ${badges.length}">
      <div class="jauge__remplie" style="width:${Math.round((obtenus.length / badges.length) * 100)}%"></div>
    </div>

    <div class="encart" style="margin:20px 0 26px">
      Aucun badge ne récompense le volume. Poser cent paris ne prouve rien —
      seuls l'audace qui paie, la précision et la régularité comptent ici.
    </div>

    ${FAMILLES_BADGES.map((famille) => bloc(famille, badges.filter((b) => b.famille === famille))).join('')}

    <h2 style="margin-top:30px">Où tu en es</h2>
    <div class="grille grille--stats">
      <div class="stat"><div class="stat__valeur">${recap.paris}</div><div class="stat__libelle">Paris réglés</div></div>
      <div class="stat"><div class="stat__valeur">${Number(recap.cote_max_gagnee).toFixed(2)}</div><div class="stat__libelle">Plus grosse cote gagnée</div></div>
      <div class="stat"><div class="stat__valeur">${recap.plus_longue_serie}</div><div class="stat__libelle">Plus longue série</div></div>
      <div class="stat"><div class="stat__valeur">${recap.jours_actifs}</div><div class="stat__libelle">Jours actifs</div></div>
      <div class="stat">
        <div class="stat__valeur ${recap.net >= 0 ? 'positif' : 'negatif'}">${recap.net >= 0 ? '+' : ''}${esc(frags(recap.net))}</div>
        <div class="stat__libelle">Bénéfice net</div>
      </div>
    </div>`;
}

function bloc(famille, liste) {
  const obtenus = liste.filter((b) => b.obtenu).length;
  return `
    <h2 style="margin-top:26px">${esc(famille)} <span class="badge">${obtenus} / ${liste.length}</span></h2>
    <div class="grille grille--3">
      ${liste
        .map(
          (b) => `<div class="badge-carte${b.obtenu ? ' badge-carte--obtenu' : ''}">
            <div class="badge-carte__sceau">${b.obtenu ? '★' : '·'}</div>
            <div>
              <div class="badge-carte__nom">${esc(b.nom)}</div>
              <div class="badge-carte__desc">${esc(b.description)}</div>
            </div>
          </div>`
        )
        .join('')}
    </div>`;
}
