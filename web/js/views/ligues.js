import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, toast, vide } from '../ui.js';

export async function vueLigues(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Connecte-toi',
      'Les ligues, c’est le cœur du jeu : crée la tienne et invite tes potes.',
      '<a class="btn" href="#/connexion">Créer mon compte</a>'
    );
    return;
  }

  const ligues = await api.mesLigues();

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Mes ligues</h1>
        <p>Un pari saisi une fois compte dans toutes tes ligues.</p>
      </div>
    </div>

    <div class="grille grille--2" style="margin-bottom:26px">
      <div class="carte">
        <h2>Créer une ligue</h2>
        <label class="champ">
          <span class="champ__libelle">Nom de la ligue</span>
          <input type="text" id="nom-ligue" placeholder="Ex : Les potes du Discord" maxlength="40" />
        </label>
        <button class="btn btn--large" id="creer">Créer</button>
      </div>
      <div class="carte">
        <h2>Rejoindre une ligue</h2>
        <label class="champ">
          <span class="champ__libelle">Code d'invitation</span>
          <input type="text" id="code-ligue" placeholder="Ex : K7XPQ2" maxlength="6"
                 style="text-transform:uppercase;letter-spacing:0.2em" />
        </label>
        <button class="btn btn--large btn--fantome" id="rejoindre">Rejoindre</button>
      </div>
    </div>

    <h2>Mes ligues (${ligues.length})</h2>
    <div class="grille grille--2" id="liste-ligues">
      ${
        ligues.length
          ? ligues
              .map(
                (l) => `
        <a class="match" href="#/ligues/${encodeURIComponent(l.id)}" style="padding:18px">
          <h3 style="margin-bottom:4px">${esc(l.nom)}</h3>
          <p style="color:var(--texte-faible);font-size:0.85rem;margin:0">
            ${l.nb_membres} membre${l.nb_membres > 1 ? 's' : ''} · code ${esc(l.code)}
          </p>
        </a>`
              )
              .join('')
          : vide('Aucune ligue', 'Crée la première, ça prend 5 secondes.')
      }
    </div>`;

  racine.querySelector('#creer').addEventListener('click', async () => {
    try {
      const l = await api.creerLigue(racine.querySelector('#nom-ligue').value);
      toast(`Ligue créée ! Code : ${l.code}`, 'succes');
      location.hash = `#/ligues/${encodeURIComponent(l.id)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      toast(e.message, 'erreur');
    }
  });

  racine.querySelector('#rejoindre').addEventListener('click', async () => {
    try {
      const l = await api.rejoindreLigue(racine.querySelector('#code-ligue').value);
      toast(`Bienvenue dans ${l.nom} !`, 'succes');
      location.hash = `#/ligues/${encodeURIComponent(l.id)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      toast(e.message, 'erreur');
    }
  });
}
