import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, dateLisible, nomJeu, toast, vide, surClic } from '../ui.js';
import { JEUX, FORMATS, ELO_DEFAUT, ELO_MIN, ELO_MAX } from '../core.js';

/**
 * Console d'administration : c'est ici qu'on saisit les scores et qu'on
 * déclenche le règlement des paris. Tant que la récupération automatique des
 * résultats n'est pas branchée, c'est l'écran le plus important du produit.
 */
export async function vueAdmin(racine) {
  if (!contexte.admin) {
    // On donne la marche à suivre exacte plutôt qu'un simple « accès refusé ».
    // C'est l'écran que voit forcément la première personne qui installe le
    // projet, avant que quiconque n'ait été nommé administrateur.
    racine.innerHTML = `
      <div class="entete-page">
        <h1>Accès réservé</h1>
        <p>Ce compte n’est pas administrateur.</p>
      </div>
      <div class="bloc bloc--info">
        <div class="bloc__titre"><span>Comment se nommer administrateur</span></div>
        <div class="bloc__corps">
          <p style="color:var(--texte-doux)">
            Le droit d’administration vit dans la base, pas dans le code du site.
            Dans le <strong>SQL Editor</strong> de Supabase, retrouve d’abord ton
            adresse exacte :
          </p>
          <pre class="code-bloc">select id, pseudo, email, est_admin from profils;</pre>
          <p style="color:var(--texte-doux)">Puis nomme-toi, avec l’adresse lue ci-dessus :</p>
          <pre class="code-bloc">update profils
   set est_admin = true
 where email = 'ton-adresse@exemple.fr';</pre>
          <p style="color:var(--texte-faible);font-size:0.85rem;margin-bottom:0">
            Supabase doit répondre <em>UPDATE 1</em>. S’il répond <em>UPDATE 0</em>,
            l’adresse ne correspond à aucun profil : reprends celle de la première
            requête, au caractère près. Recharge ensuite la page.
          </p>
        </div>
      </div>`;
    return;
  }

  const [aVenir, termines, evenements, equipes] = await Promise.all([
    api.listerMatchs({ statut: 'a_venir' }),
    api.listerMatchs({ statut: 'termine' }),
    api.listerEvenementsSaison(),
    api.listerEquipes(),
  ]);
  // Pour créer un match il faut TOUS les tournois — y compris ceux qui n'en ont
  // encore aucun, sinon un tournoi neuf reste inutilisable à jamais.
  const tousLesTournois = await api.listerEvenements();

  // Les équipes engagées, tournoi par tournoi : il faut la liste pour proposer
  // un vainqueur. Un tournoi déjà réglé n'a plus besoin de rien.
  const equipesParEvenement = new Map(
    await Promise.all(
      evenements.map(async (ev) => [
        ev.id,
        ev.statut === 'regle' ? [] : await api.cotesEvenement(ev.id).catch(() => []),
      ])
    )
  );

  const maintenant = Date.now();
  const aRegler = aVenir.filter((m) => new Date(m.debut).getTime() < maintenant);
  const prochains = aVenir.filter((m) => new Date(m.debut).getTime() >= maintenant);

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Administration</h1>
        <p>Saisis les scores : les paris se règlent et les Elo se recalculent automatiquement.</p>
      </div>
    </div>

    <div class="encart" style="margin-bottom:22px">
      Le score doit respecter le format : un BO3 se termine forcément à 2 maps gagnées,
      un BO5 à 3. Un score incohérent est refusé.
    </div>

    <h2>Créer la compétition</h2>
    <p style="color:var(--texte-doux);margin-top:-6px">
      Dans l'ordre : le tournoi, les équipes qui y jouent, puis les matchs.
      Tout est rattaché à ${esc(contexte.saison?.nom ?? 'la saison en cours')}.
    </p>

    <div class="grille grille--2" style="margin-bottom:16px">
      <form class="carte" id="form-tournoi">
        <h3>Nouveau tournoi</h3>
        <label class="champ">
          <span class="champ__libelle">Nom</span>
          <input type="text" name="nom" placeholder="Ex : LEC Winter 2027" maxlength="60" required />
        </label>
        <label class="champ">
          <span class="champ__libelle">Jeu</span>
          <select name="jeu">
            ${Object.values(JEUX).map((j) => `<option value="${j.id}">${esc(j.nom)}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn--large">Créer le tournoi</button>
      </form>

      <form class="carte" id="form-equipe">
        <h3>Nouvelle équipe</h3>
        <div style="display:flex;gap:10px">
          <label class="champ" style="flex:2">
            <span class="champ__libelle">Nom</span>
            <input type="text" name="nom" placeholder="Ex : Solary" maxlength="40" required />
          </label>
          <label class="champ" style="flex:1">
            <span class="champ__libelle">Tag</span>
            <input type="text" name="tag" placeholder="SLY" maxlength="6" required />
          </label>
        </div>
        <div style="display:flex;gap:10px">
          <label class="champ" style="flex:2">
            <span class="champ__libelle">Jeu</span>
            <select name="jeu">
              ${Object.values(JEUX).map((j) => `<option value="${j.id}">${esc(j.nom)}</option>`).join('')}
            </select>
          </label>
          <label class="champ" style="flex:1">
            <span class="champ__libelle">Elo de départ</span>
            <input type="number" name="elo" value="${ELO_DEFAUT}" min="${ELO_MIN}" max="${ELO_MAX}" />
          </label>
        </div>
        <button class="btn btn--large">Créer l'équipe</button>
      </form>
    </div>

    <form class="carte" id="form-match" style="margin-bottom:30px">
      <h3>Nouveau match</h3>
      <p style="color:var(--texte-faible);font-size:0.84rem;margin-top:-4px">
        L'Elo des deux équipes fixe les cotes. Une équipe inconnue démarre à ${ELO_DEFAUT}
        et se calera d'elle-même au fil des résultats.
      </p>
      <div class="grille grille--3">
        <label class="champ">
          <span class="champ__libelle">Tournoi</span>
          <select name="event">
            ${tousLesTournois
              .map((e) => `<option value="${esc(e.id)}">${esc(e.nom)} · ${esc(nomJeu(e.jeu))}</option>`)
              .join('')}
          </select>
        </label>
        <label class="champ">
          <span class="champ__libelle">Équipe A</span>
          <select name="a">${optionsEquipes(equipes)}</select>
        </label>
        <label class="champ">
          <span class="champ__libelle">Équipe B</span>
          <select name="b">${optionsEquipes(equipes)}</select>
        </label>
        <label class="champ">
          <span class="champ__libelle">Format</span>
          <select name="format">
            ${FORMATS.map((f) => `<option value="${f}"${f === 3 ? ' selected' : ''}>BO${f}</option>`).join('')}
          </select>
        </label>
        <label class="champ" style="grid-column:span 2">
          <span class="champ__libelle">Coup d'envoi</span>
          <input type="datetime-local" name="debut" required />
        </label>
      </div>
      <button class="btn btn--large">Créer le match</button>
    </form>

    <h2>Matchs commencés, en attente de résultat (${aRegler.length})</h2>
    <div class="grille grille--2" style="margin-bottom:30px">
      ${aRegler.length ? aRegler.map(carteReglement).join('') : vide('Rien à régler', 'Tous les matchs commencés sont réglés.')}
    </div>

    ${
      api.estDemo
        ? `<h2>Simuler un résultat (démo)</h2>
           <div class="encart encart--alerte" style="margin-bottom:14px">
             En mode démo tu peux régler un match qui n'a pas encore eu lieu, pour vérifier
             que le calcul des gains et des Elo fonctionne. En production, cette section
             ne montre que les matchs réellement commencés.
           </div>
           <div class="grille grille--2" style="margin-bottom:30px">
             ${prochains.slice(0, 4).map(carteReglement).join('')}
           </div>`
        : ''
    }

    <h2>Vainqueurs de tournoi (calls de la saison)</h2>
    <div class="encart" style="margin-bottom:14px">
      Désigner le vainqueur d'un tournoi règle d'un coup tous les calls de la saison
      qui le visaient. C'est irréversible : à faire une fois la finale jouée.
    </div>
    <div class="grille grille--2" style="margin-bottom:30px" id="zone-evenements">
      ${
        evenements.length
          ? evenements.map((ev) => carteEvenement(ev, equipesParEvenement.get(ev.id) ?? [])).join('')
          : vide('Aucun tournoi', 'Cette saison ne contient encore aucun match.')
      }
    </div>

    <h2>Prochains matchs (${prochains.length})</h2>
    <div class="carte" style="margin-bottom:30px">
      <table class="tableau">
        <tbody>
          ${prochains
            .slice(0, 12)
            .map(
              (m) => `<tr>
                <td>${esc(nomJeu(m.jeu))}</td>
                <td>${esc(m.equipe_a)} vs ${esc(m.equipe_b)} <span class="badge">BO${m.format}</span></td>
                <td class="num">${esc(dateLisible(m.debut))}</td>
                <td class="num">
                  <button class="btn btn--danger btn--petit" data-annuler="${esc(m.id)}"
                          title="Annule le match et rembourse toutes les mises">Annuler</button>
                </td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <h2>Derniers matchs réglés (${termines.length})</h2>
    <div class="carte">
      <table class="tableau">
        <tbody>
          ${termines
            .slice(-10)
            .reverse()
            .map(
              (m) => `<tr>
                <td>${esc(nomJeu(m.jeu))}</td>
                <td>${esc(m.equipe_a)} <strong>${m.score_a} – ${m.score_b}</strong> ${esc(m.equipe_b)}</td>
                <td class="num">Elo ${m.elo_a} / ${m.elo_b}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;

  const soumettre = (selecteur, action) => {
    racine.querySelector(selecteur)?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bouton = e.target.querySelector('button');
      bouton.disabled = true;
      try {
        await action(Object.fromEntries(new FormData(e.target)));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(err.message, 'erreur');
        bouton.disabled = false;
      }
    });
  };

  soumettre('#form-tournoi', async (v) => {
    const ev = await api.creerEvenement({ nom: v.nom, jeu: v.jeu });
    toast(`Tournoi « ${ev.nom} » créé.`, 'succes');
  });

  soumettre('#form-equipe', async (v) => {
    const eq = await api.creerEquipe({ nom: v.nom, tag: v.tag, jeu: v.jeu, elo: v.elo });
    toast(`${eq.nom} (${eq.tag}) ajoutée.`, 'succes');
  });

  soumettre('#form-match', async (v) => {
    await api.creerMatch({
      eventId: v.event, equipeAId: v.a, equipeBId: v.b,
      format: Number(v.format), debut: new Date(v.debut),
    });
    toast('Match créé, il est ouvert aux mises.', 'succes');
  });

  surClic(racine, '[data-annuler]', async (bouton) => {
    // Pas de confirm() natif : il fige l'onglet et bloque tout le reste.
    if (bouton.dataset.confirme !== '1') {
      bouton.dataset.confirme = '1';
      bouton.textContent = 'Confirmer ?';
      setTimeout(() => {
        if (bouton.isConnected) { bouton.dataset.confirme = '0'; bouton.textContent = 'Annuler'; }
      }, 4000);
      return;
    }
    try {
      const r = await api.annulerMatch(bouton.dataset.annuler, { motif: 'Annulé depuis l’administration' });
      toast(`Match annulé. ${r.rembourses} pari(s) remboursé(s), ${r.total} Frags rendus.`, 'succes');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
    }
  });

  racine.querySelectorAll('[data-evenement]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const equipeId = form.querySelector('[name=equipe]').value;
      if (!equipeId) return toast('Choisis une équipe.', 'erreur');
      try {
        const r = await api.reglerEvenement(form.dataset.evenement, equipeId);
        toast(`${r.regles} call(s) réglé(s).`, 'succes');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(err.message, 'erreur');
      }
    });
  });

  racine.querySelectorAll('[data-regler]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.regler;
      const a = Number(form.querySelector('[name=a]').value);
      const b = Number(form.querySelector('[name=b]').value);
      try {
        const r = await api.reglerMatch(id, a, b);
        toast(`${r.regles} pari(s) réglé(s). Nouveaux Elo : ${r.elo_a} / ${r.elo_b}.`, 'succes');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(err.message, 'erreur');
      }
    });
  });
}

/** Désignation du vainqueur d'un tournoi : c'est ce qui règle les calls. */
function carteEvenement(ev, equipes) {
  const etat =
    ev.statut === 'regle'
      ? `<span class="badge badge--gagne">${esc(ev.vainqueur ?? 'réglé')}</span>`
      : ev.statut === 'ouvert'
        ? '<span class="badge badge--attente">calls ouverts</span>'
        : '<span class="badge">en cours</span>';

  return `
    <form class="carte" data-evenement="${esc(ev.id)}">
      <div class="match__haut" style="border:0;padding:0 0 10px">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(ev.jeu)}"></span>
          <span>${esc(ev.nom)}</span>
        </span>
        ${etat}
      </div>
      <p style="color:var(--texte-faible);font-size:0.8rem;margin:0 0 12px">
        ${ev.nb_matchs} match${ev.nb_matchs > 1 ? 's' : ''} ·
        premier le ${esc(dateLisible(ev.debut))}
      </p>
      ${
        ev.statut === 'regle'
          ? `<p style="margin:0;color:var(--texte-doux);font-size:0.86rem">
               Vainqueur enregistré : <strong>${esc(ev.vainqueur ?? '—')}</strong>.
             </p>`
          : `<label class="champ" style="margin-bottom:12px">
               <span class="champ__libelle">Vainqueur du tournoi</span>
               <select name="equipe">
                 <option value="">À désigner…</option>
                 ${equipes
                   .map((e) => `<option value="${esc(e.id)}">${esc(e.nom)}</option>`)
                   .join('')}
               </select>
             </label>
             <button class="btn btn--large">Désigner et régler les calls</button>`
      }
    </form>`;
}

function carteReglement(m) {
  const max = Math.ceil(m.format / 2);
  return `
    <form class="carte" data-regler="${esc(m.id)}">
      <div class="match__haut" style="border:0;padding:0 0 10px">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(m.jeu)}"></span>
          <span>${esc(m.evenement)} · BO${m.format}</span>
        </span>
        <span>${esc(dateLisible(m.debut))}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 64px 16px 64px 1fr;align-items:center;gap:8px">
        <strong style="font-size:0.9rem">${esc(m.equipe_a)}</strong>
        <input type="number" name="a" min="0" max="${max}" value="0" required />
        <span style="text-align:center;color:var(--texte-faible)">–</span>
        <input type="number" name="b" min="0" max="${max}" value="0" required />
        <strong style="font-size:0.9rem;text-align:right">${esc(m.equipe_b)}</strong>
      </div>
      <button class="btn btn--large" style="margin-top:14px">Régler ce match</button>
    </form>`;
}

/** Les équipes groupées par jeu : sans ça, la liste devient illisible. */
function optionsEquipes(equipes) {
  return Object.values(JEUX)
    .map((j) => {
      const siennes = equipes.filter((e) => e.jeu === j.id);
      if (!siennes.length) return '';
      return `<optgroup label="${esc(j.nom)}">
        ${siennes.map((e) => `<option value="${esc(e.id)}">${esc(e.nom)} · ${esc(e.tag)} (${e.elo})</option>`).join('')}
      </optgroup>`;
    })
    .join('');
}
