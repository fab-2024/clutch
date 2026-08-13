import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, toast, vide, surClic } from '../ui.js';
import { texteCarte, CARTE_COTE_MIN, CARTE_GAIN_MIN } from '../core.js';

/**
 * Les cartes « je l'avais dit ».
 *
 * La carte est dessinée en SVG, puis rastérisée dans un canvas pour produire
 * un PNG. Aucune dépendance, aucun service d'image : tout se fait dans le
 * navigateur, ce qui évite d'avoir à héberger un générateur et garantit que
 * ça marchera encore dans deux ans.
 *
 * Format 1200 × 630 : c'est le ratio attendu par Discord, Twitter et iMessage
 * pour un aperçu en grand. Une carte carrée s'y afficherait rognée.
 */
export async function vueCartes(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Il faut avoir gagné pour avoir quelque chose à raconter.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const cartes = await api.mesCartes();
  const pseudo = contexte.utilisateur.pseudo || contexte.utilisateur.email || 'Joueur';

  racine.innerHTML = `
    <p><a href="#/profil">← Mes paris</a></p>
    <div class="entete-page">
      <div>
        <h1>Je l'avais dit</h1>
        <p>Tes paris qui méritent d'être racontés — à envoyer sur le Discord.</p>
      </div>
    </div>

    ${
      cartes.length
        ? `<div class="encart" style="margin-bottom:22px">
             Un pari entre ici s'il a été gagné à une cote d'au moins
             ${CARTE_COTE_MIN.toFixed(2)}, ou s'il t'a rapporté ${frags(CARTE_GAIN_MIN)} ou plus.
             Une carte qu'on peut produire pour n'importe quoi ne vaut plus rien.
           </div>
           <div class="grille">
             ${cartes.map((p, i) => `<div class="carte-part" data-carte="${i}">${dessiner(texteCarte(p, pseudo))}
               <div class="carte-part__actions">
                 <button class="btn btn--petit" data-telecharger="${i}">Télécharger en image</button>
                 <button class="btn btn--fantome btn--petit" data-copier="${i}">Copier</button>
               </div>
             </div>`).join('')}
           </div>`
        : vide(
            'Rien à raconter pour l’instant',
            `Gagne un pari à ${CARTE_COTE_MIN.toFixed(2)} ou plus, ou encaisse ${frags(CARTE_GAIN_MIN)} d'un coup, et ta première carte apparaîtra ici.`,
            '<a class="btn" href="#/matchs">Voir les matchs</a>'
          )
    }`;

  const svgDe = (i) => racine.querySelector(`[data-carte="${i}"] svg`);

  surClic(racine, '[data-telecharger]', async (bouton) => {
    const i = bouton.dataset.telecharger;
    try {
      const blob = await enPng(svgDe(i));
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(blob);
      lien.download = `clutch-je-lavais-dit-${i}.png`;
      lien.click();
      setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
    } catch (e) {
      toast("Impossible de produire l'image sur ce navigateur.", 'erreur');
      console.error('[Clutch] génération de carte', e);
    }
  });

  surClic(racine, '[data-copier]', async (bouton) => {
    const i = bouton.dataset.copier;
    try {
      const blob = await enPng(svgDe(i));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('Carte copiée, plus qu’à coller.', 'succes');
    } catch {
      // Safari et Firefox refusent encore l'écriture d'images dans le presse-papier.
      toast('Ton navigateur refuse la copie d’image : utilise « Télécharger ».', 'erreur');
    }
  });
}

/** Le dessin de la carte, en SVG pur. */
function dessiner(t) {
  const ligne = (y, texte, taille, couleur, poids = 400, ancre = 'start') =>
    `<text x="${ancre === 'end' ? 1140 : 60}" y="${y}" fill="${couleur}" font-size="${taille}"
           font-weight="${poids}" text-anchor="${ancre}"
           font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif">${esc(texte)}</text>`;

  return `
    <svg viewBox="0 0 1200 630" width="100%" role="img"
         aria-label="Carte : ${esc(t.pari)} à la cote ${esc(t.cote)}"
         xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#080b10"/>
      <rect x="0" y="0" width="1200" height="6" fill="#e8ff3d"/>
      <circle cx="1040" cy="470" r="230" fill="#e8ff3d" opacity="0.05"/>

      ${ligne(96, 'CLUTCH', 26, '#6b7688', 800)}
      ${ligne(96, t.date, 24, '#6b7688', 400, 'end')}

      ${ligne(190, t.accroche, 62, '#e8ff3d', 800)}
      ${ligne(250, `par ${t.pseudo}`, 28, '#98a2b3')}

      ${ligne(360, t.affiche, 34, '#98a2b3')}
      ${ligne(416, t.pari, 46, '#f5f7fa', 700)}
      ${ligne(456, t.marche, 24, '#6b7688')}

      <rect x="60" y="500" width="1080" height="1" fill="#212b3a"/>
      ${ligne(560, `COTE ${t.cote}`, 34, '#e8ff3d', 800)}
      ${ligne(560, `${t.mise} misés · ${t.gain} Frags`, 30, '#f5f7fa', 600, 'end')}

      ${ligne(600, 'Monnaie fictive, sans valeur. Jeu de pronostics gratuit.', 18, '#6b7688')}
    </svg>`;
}

/**
 * SVG -> PNG, sans bibliothèque.
 *
 * On sérialise le SVG en data URL, on le charge dans une Image, on le peint
 * dans un canvas, et on en sort un blob. Le facteur 1,5 donne du 1800 × 945,
 * assez net pour un partage en plein écran.
 */
function enPng(svg, echelle = 1.5) {
  return new Promise((resolve, rejeter) => {
    const source = new XMLSerializer().serializeToString(svg);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200 * echelle;
      canvas.height = 630 * echelle;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => (b ? resolve(b) : rejeter(new Error('canvas vide'))), 'image/png');
    };
    image.onerror = () => rejeter(new Error('SVG illisible'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  });
}
