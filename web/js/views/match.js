import * as api from '../api.js';
import { contexte, majSolde } from '../app.js';
import { esc, quand, dateLisible, nomJeu, toast, barreProba, surClic, frags } from '../ui.js';
import { MISE_MIN, MISE_MAX } from '../core.js';

export async function vueMatch(racine, id) {
  const m = await api.lireMatch(id);
  if (!m) {
    racine.innerHTML = `<div class="vide"><h3>Match introuvable</h3><p><a href="#/matchs">Retour</a></p></div>`;
    return;
  }

  // C'est la saison DU MATCH qui décide si les mises sont ouvertes, pas celle
  // qu'on a sélectionnée dans l'entête : on peut consulter un match d'une autre
  // saison sans que le message affiché devienne faux.
  const saisonMatch = contexte.saisons.find((s) => s.id === m.saison_id) ?? contexte.saison;
  const saisonOuverte = saisonMatch?.statut === 'en_cours';
  const ouvert = saisonOuverte && m.statut === 'a_venir' && new Date(m.debut) > new Date();
  const marches = m.statut === 'termine' ? [] : await api.cotesDuMatch(m.id);
  const mesParis = (await api.mesParis()).filter((p) => p.match_id === m.id);

  const pA = marches.find((x) => x.cle === 'vainqueur')?.choix[0]?.proba ?? 0.5;

  racine.innerHTML = `
    <p><a href="#/matchs">← Tous les matchs</a></p>

    <div class="carte" style="margin-bottom:18px">
      <div class="match__haut" style="border:0;padding:0 0 12px">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(m.jeu)}"></span>
          <span>${esc(nomJeu(m.jeu))} · ${esc(m.evenement)} · BO${m.format}</span>
        </span>
        <span>${esc(dateLisible(m.debut))} (${esc(quand(m.debut))})</span>
      </div>
      <div class="match__corps" style="padding:8px 0 0">
        <div class="equipe">
          <span class="equipe__nom" style="font-size:1.15rem">${esc(m.equipe_a)}</span>
          <span class="equipe__elo">Elo ${m.elo_a}</span>
        </div>
        ${
          m.statut === 'termine'
            ? `<div><span class="score${m.score_a > m.score_b ? '' : ' score--perdant'}">${m.score_a}</span><span class="versus"> – </span><span class="score${m.score_b > m.score_a ? '' : ' score--perdant'}">${m.score_b}</span></div>`
            : `<span class="versus">VS</span>`
        }
        <div class="equipe equipe--droite">
          <span class="equipe__nom" style="font-size:1.15rem">${esc(m.equipe_b)}</span>
          <span class="equipe__elo">Elo ${m.elo_b}</span>
        </div>
      </div>
      ${
        m.statut !== 'termine'
          ? barreProba(pA) +
            `<div style="display:flex;justify-content:space-between;font-size:0.76rem;color:var(--texte-faible);margin-top:6px">
               <span>${Math.round(pA * 100)} % de chances</span><span>${Math.round((1 - pA) * 100)} %</span>
             </div>`
          : ''
      }
    </div>

    ${mesParis.length ? blocMesParis(mesParis) : ''}

    ${
      m.statut === 'termine'
        ? `<div class="encart">Ce match est terminé, les paris ont été réglés.</div>`
        : !saisonOuverte
          ? `<div class="encart encart--alerte">
               Ce match appartient à <strong>${esc(saisonMatch?.nom ?? 'une autre saison')}</strong>,
               qui n'est pas ouverte aux mises.
             </div>`
          : !ouvert
            ? `<div class="encart encart--alerte">Les mises sont fermées : le match a commencé.</div>`
            : marches.map(blocMarche).join('')
    }

    <div id="bulletin"></div>
  `;

  if (!ouvert) return;

  surClic(racine, '.cote[data-choix]', (btn) => {
    racine.querySelectorAll('.cote.selectionne').forEach((e) => e.classList.remove('selectionne'));
    btn.classList.add('selectionne');
    ouvrirBulletin(racine, m, btn.dataset.marche, btn.dataset.choix, btn.dataset.libelle, Number(btn.dataset.cote));
  });
}

function blocMarche(marche) {
  return `
    <div class="carte" style="margin-bottom:14px">
      <h2>${esc(marche.libelle)}</h2>
      <p style="color:var(--texte-faible);font-size:0.84rem;margin-bottom:14px">${esc(marche.aide)}</p>
      <div class="grille grille--3">
        ${marche.choix
          .map(
            (c) => `
          <button class="cote" data-marche="${esc(marche.cle)}" data-choix="${esc(c.cle)}"
                  data-libelle="${esc(c.libelle)}" data-cote="${c.cote}">
            <span class="cote__libelle">${esc(c.libelle)}</span>
            <span class="cote__valeur">${c.cote.toFixed(2)}</span>
          </button>`
          )
          .join('')}
      </div>
    </div>`;
}

function blocMesParis(paris) {
  return `
    <div class="carte" style="margin-bottom:14px">
      <h2>Tes paris sur ce match</h2>
      <table class="tableau">
        <tbody>
          ${paris
            .map(
              (p) => `<tr>
                <td>${esc(p.libelle_marche)} — <strong>${esc(p.libelle_choix)}</strong></td>
                <td class="num">${esc(frags(p.mise))} @ ${p.cote.toFixed(2)}</td>
                <td class="num">${badgePari(p)}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

export function badgePari(p) {
  if (p.statut === 'gagne') return `<span class="badge badge--gagne">+${esc(frags(p.gain))}</span>`;
  if (p.statut === 'perdu') return `<span class="badge badge--perdu">Perdu</span>`;
  return `<span class="badge badge--attente">En cours</span>`;
}

function ouvrirBulletin(racine, m, marche, choix, libelle, cote) {
  const zone = racine.querySelector('#bulletin');

  if (!contexte.utilisateur) {
    zone.innerHTML = `<div class="carte"><h2>Connecte-toi pour miser</h2>
      <p style="color:var(--texte-doux)">Ça prend dix secondes et tu démarres avec 1 000 Frags.</p>
      <a class="btn" href="#/connexion">Créer mon compte</a></div>`;
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const solde = contexte.utilisateur.solde;
  zone.innerHTML = `
    <div class="carte" style="border-color:var(--accent)">
      <h2>Ton pari</h2>
      <p style="color:var(--texte-doux);margin-bottom:16px">
        ${esc(m.equipe_a)} vs ${esc(m.equipe_b)} · <strong style="color:var(--texte)">${esc(libelle)}</strong>
        à la cote <strong style="color:var(--accent)">${cote.toFixed(2)}</strong>
      </p>
      <label class="champ">
        <span class="champ__libelle">Mise (solde : ${esc(frags(solde))})</span>
        <input type="number" id="mise" value="${Math.min(100, Math.max(MISE_MIN, solde))}"
               min="${MISE_MIN}" max="${Math.min(MISE_MAX, solde)}" step="10" />
      </label>
      <div class="mises-rapides">
        ${[50, 100, 250, 500].map((v) => `<button class="puce" data-mise="${v}">${v}</button>`).join('')}
        <button class="puce" data-mise="max">Tapis</button>
      </div>
      <p style="margin:16px 0 12px;font-size:0.95rem">
        Gain potentiel : <strong id="gain" style="color:var(--accent);font-size:1.1rem"></strong>
      </p>
      <button class="btn btn--large" id="valider">Valider le pari</button>
      <p style="font-size:0.74rem;color:var(--texte-faible);margin:12px 0 0">
        La cote est figée au moment de la validation. Les Frags n'ont aucune valeur réelle.
      </p>
    </div>`;

  const champMise = zone.querySelector('#mise');
  const gain = zone.querySelector('#gain');
  const majGain = () => {
    const v = Number(champMise.value) || 0;
    gain.textContent = frags(Math.round(v * cote));
  };
  majGain();
  champMise.addEventListener('input', majGain);

  surClic(zone, '[data-mise]', (btn) => {
    champMise.value = btn.dataset.mise === 'max' ? Math.min(MISE_MAX, solde) : btn.dataset.mise;
    majGain();
  });

  zone.querySelector('#valider').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await api.placerPari({ matchId: m.id, marche, choix, mise: Number(champMise.value) });
      toast(`Pari validé : ${libelle} @ ${cote.toFixed(2)}`, 'succes');
      await majSolde();
      location.hash = `#/matchs/${encodeURIComponent(m.id)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      e.currentTarget.disabled = false;
    }
  });

  zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
