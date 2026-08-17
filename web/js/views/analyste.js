import * as api from '../api.js';
import * as economie from '../economy-api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, frags, nomJeu, vide } from '../ui.js';

/** Profil d'analyste V2 : précision, difficulté et impact rating — jamais ROI. */
export async function vueAnalyste(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide('Pas encore de compte', 'Crée ton profil, pronostique, et Clutch te montrera où ton jugement est le plus solide.', '<a class="btn" href="#/connexion">Commencer</a>');
    return;
  }

  const pronostics = (await economie.mesPronosticsClasses().catch(() => [])).filter((p) => p.statut === 'gagne' || p.statut === 'perdu');
  if (!pronostics.length) {
    racine.innerHTML = `<div class="entete-page"><div><h1>Mon profil d'analyste</h1></div></div>${bandeauSaison()}${vide('Aucun pronostic réglé', "Reviens quand tes premiers résultats seront tombés : sans résultat, il n'y a rien à analyser.", '<a class="btn" href="#/matchs">Voir les matchs</a>')}`;
    return;
  }

  const ids = [...new Set(pronostics.map((p) => p.match_id))];
  const matches = new Map((await Promise.all(ids.map((id) => api.lireMatch(id).catch(() => null)))).filter(Boolean).map((m) => [m.id, m]));
  const enrichis = pronostics.map((p) => ({ ...p, match: matches.get(p.match_id) ?? null }));
  const total = bilan(enrichis);
  const parJeu = agreger(enrichis, (p) => p.match?.jeu ?? 'autre');
  const parFormat = agreger(enrichis, (p) => `BO${p.match?.format ?? '?'}`);
  const parDifficulte = agreger(enrichis, difficulte);
  const favorite = contexte.utilisateur.equipe_favorite;
  const avecFavorite = favorite ? enrichis.filter((p) => [p.match?.equipe_a_id, p.match?.equipe_b_id].includes(favorite.id)) : [];
  const sansFavorite = favorite ? enrichis.filter((p) => ![p.match?.equipe_a_id, p.match?.equipe_b_id].includes(favorite.id)) : [];

  racine.innerHTML = `
    <p><a href="#/profil">← Mon profil</a></p>
    <div class="entete-page"><div><h1>Mon profil d'analyste</h1><p>${esc(contexte.saison?.nom ?? '')} — ${total.paris} pronostic${total.paris > 1 ? 's' : ''} réglé${total.paris > 1 ? 's' : ''}, ${total.precision}% de précision, ${formatDelta(total.delta)} Frags de mouvement cumulé.</p></div></div>
    ${bandeauSaison()}
    <div class="grille" style="margin-bottom:26px">${constats(enrichis, parJeu).map((texte) => `<div class="constat">${texte}</div>`).join('')}</div>
    <p style="color:var(--texte-faible);font-size:0.82rem">Le delta Frags tient compte de la difficulté : réussir un outsider compte davantage qu'un favori attendu. Il n'y a ni mise, ni rendement financier.</p>
    ${bloc('Par format', parFormat)}
    ${bloc('Par jeu', parJeu, (c) => nomJeu(c))}
    ${bloc('Par difficulté du choix', parDifficulte, libelleDifficulte)}
    ${favorite ? blocFavorite(favorite, bilan(avecFavorite), bilan(sansFavorite)) : ''}`;
}

function bilan(lignes) {
  const paris = lignes.length;
  const gagnes = lignes.filter((p) => p.statut === 'gagne').length;
  const delta = lignes.reduce((s, p) => s + Number(p.delta_frags ?? 0), 0);
  return { paris, gagnes, precision: paris ? Math.round((gagnes / paris) * 100) : 0, delta };
}

function agreger(lignes, cle) {
  const groupes = new Map();
  for (const p of lignes) {
    const k = cle(p);
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k).push(p);
  }
  return [...groupes].map(([cleGroupe, valeurs]) => ({ cle: cleGroupe, ...bilan(valeurs) })).sort((a, b) => b.paris - a.paris);
}

function difficulte(p) {
  const proba = Number(p.proba_figee ?? 0.5);
  if (proba <= 0.4) return 'outsider';
  if (proba >= 0.6) return 'favori';
  return 'equilibre';
}
function libelleDifficulte(cle) { return { outsider: 'Outsider ≤ 40 %', equilibre: 'Équilibré 40–60 %', favori: 'Favori ≥ 60 %' }[cle] ?? cle; }

function constats(lignes, parJeu) {
  const r = [];
  const total = bilan(lignes);
  r.push(total.precision >= 65 ? `🎯 Ta précision globale est de <strong>${total.precision}%</strong>.` : `🧭 Ta précision globale est de <strong>${total.precision}%</strong> : ton rating dira mieux que le volume si tes choix sont réellement difficiles.`);
  const significatifs = parJeu.filter((x) => x.paris >= 3).sort((a, b) => b.precision - a.precision);
  if (significatifs[0]) r.push(`🧠 Ton meilleur terrain pour l'instant : <strong>${esc(nomJeu(significatifs[0].cle))}</strong> à ${significatifs[0].precision}% sur ${significatifs[0].paris} résultats.`);
  const upsets = lignes.filter((p) => p.statut === 'gagne' && Number(p.proba_figee) <= 0.4).length;
  if (upsets) r.push(`⚡ Tu as déjà converti <strong>${upsets} choix outsider</strong> à 40 % ou moins.`);
  return r;
}

function bloc(titre, lignes, formate = (x) => x) {
  if (!lignes?.length) return '';
  return `<h2 style="margin-top:26px">${esc(titre)}</h2><div class="carte"><table class="tableau"><thead><tr><th>${esc(titre.replace('Par ', '').replace(/^./, (c) => c.toUpperCase()))}</th><th class="num">Pronostics</th><th class="num">Réussite</th><th class="num">∆ Frags</th></tr></thead><tbody>${lignes.map((l) => `<tr><td>${esc(formate(l.cle))}</td><td class="num">${l.paris}</td><td class="num">${l.precision}%</td><td class="num ${l.delta >= 0 ? 'positif' : 'negatif'}">${formatDelta(l.delta)}</td></tr>`).join('')}</tbody></table></div>`;
}

function blocFavorite(fav, avec, sans) {
  const ligne = (titre, b) => `<tr><td>${esc(titre)}</td><td class="num">${b.paris}</td><td class="num">${b.precision}%</td><td class="num ${b.delta >= 0 ? 'positif' : 'negatif'}">${formatDelta(b.delta)}</td></tr>`;
  return `<h2 style="margin-top:26px">Le biais du supporter</h2><div class="carte"><table class="tableau"><thead><tr><th>Périmètre</th><th class="num">Pronostics</th><th class="num">Réussite</th><th class="num">∆ Frags</th></tr></thead><tbody>${ligne(`Matchs de ${fav.nom}`, avec)}${ligne('Tous les autres matchs', sans)}</tbody></table></div>`;
}
function formatDelta(n) { const v = Number(n ?? 0); return `${v >= 0 ? '+' : '−'}${frags(Math.abs(v))}`; }
