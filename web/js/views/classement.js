import { contexte, bandeauSaison } from '../app.js';
import { esc, frags, vide } from '../ui.js';
import * as economie from '../economy-api.js';

/** Classement global Economy V2 : une seule vérité compétitive, les Frags. */
export async function vueClassement(racine, { entete = true } = {}) {
  if (!contexte.utilisateur) {
    racine.innerHTML = `
      ${entete ? '<div class="entete-page"><h1>Classement</h1></div>' : ''}
      <div class="carte"><h3>Connecte-toi pour entrer dans le classement.</h3><p>Les Frags sont ton rating compétitif saisonnier : ils ne se dépensent jamais.</p><a class="btn" href="#/connexion">Jouer</a></div>`;
    return;
  }

  const [lignes, rivalite] = await Promise.all([
    economie.classementFrags().catch(() => []),
    economie.rivaliteFrags().catch(() => null),
  ]);

  racine.innerHTML = `
    ${
      entete
        ? `<div class="entete-page">
             <h1>Classement</h1>
             <p>${esc(contexte.saison?.nom ?? '')} — une seule métrique : ton rating Frags.</p>
           </div>
           ${bandeauSaison()}`
        : ''
    }
    ${carteRivalite(rivalite)}
    <div class="carte" id="zone-classement">
      ${lignes.length ? tableauClassement(lignes) : vide('Classement vierge', 'Le premier pronostic classé réglé lancera la saison.')}
    </div>`;
}

export function carteRivalite(r) {
  if (!r?.rival || !r?.moi) return '';
  const devant = Number(r.ecart) >= 0;
  return `
    <div class="carte carte--rivalite">
      <div class="carte-call-pose__haut">
        <strong>Ta rivalité de la semaine</strong>
        <span class="badge">${esc(r.semaine)}</span>
      </div>
      <div class="duel">
        <div class="duel__cote">
          <span class="duel__nom">${esc(r.moi.pseudo)}</span>
          <span class="duel__rang">${esc(String(r.moi.rang))}<sup>e</sup></span>
          <span class="duel__bilan">${esc(frags(r.moi.frags))} Frags</span>
        </div>
        <div class="duel__milieu">
          <span class="duel__vs">VS</span>
          <span class="duel__ecart ${devant ? 'positif' : 'negatif'}">${devant ? '+' : ''}${esc(frags(r.ecart))}</span>
        </div>
        <div class="duel__cote duel__cote--droite">
          <span class="duel__nom">${esc(r.rival.pseudo)}</span>
          <span class="duel__rang">${esc(String(r.rival.rang))}<sup>e</sup></span>
          <span class="duel__bilan">${esc(frags(r.rival.frags))} Frags</span>
        </div>
      </div>
      <p style="color:var(--texte-faible);font-size:0.78rem;margin:14px 0 0;text-align:center">
        ${devant ? `Tu mènes de ${esc(frags(Math.abs(r.ecart)))} Frags.` : `Il te devance de ${esc(frags(Math.abs(r.ecart)))} Frags. Nouveau rival lundi.`}
      </p>
    </div>`;
}

export function tableauClassement(lignes) {
  return `
    <table class="tableau">
      <thead><tr><th class="rang">#</th><th>Joueur</th><th class="num">Pronostics</th><th class="num">Réussite</th><th class="num">Frags</th></tr></thead>
      <tbody>
        ${lignes.map((l) => {
          const reussite = Number(l.taux_reussite ?? 0);
          return `<tr${l.moi ? ' class="moi"' : ''}>
            <td class="rang rang--${l.rang}">${esc(String(l.rang))}</td>
            <td>${esc(l.pseudo)}${l.moi ? ' <span class="badge">toi</span>' : ''}${l.provisoire ? ' <span class="badge">placement</span>' : ''}</td>
            <td class="num">${esc(String(l.pronostics_regles ?? 0))}</td>
            <td class="num">${l.pronostics_regles ? `${reussite.toFixed(1)} %` : '—'}</td>
            <td class="num"><strong>${esc(frags(l.frags))}</strong></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}
