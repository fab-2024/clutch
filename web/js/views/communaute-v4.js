/**
 * Phase 11 — Communauté V4 mobile-first.
 * La relique est le centre émotionnel ; les stats passent au second niveau.
 */
import { contexte } from '../app.js';
import { esc, ecusson, nomJeu } from '../ui.js';
import { formaterFrags } from '../core.js';
import { communauteDashboardV4 } from '../community-api-v4.js';
import {
  FORMES_COMMUNAUTE,
  palierFaction,
  formeCommunaute,
  teinteFaction,
  croissanceTexte,
} from '../community-progression.js';
import { bombonne } from './bombonne.js';

const nombre = (n) => formaterFrags(Number(n) || 0);
const clampPct = (p) => Math.max(0, Math.min(100, Math.round((Number(p?.progression) || 0) * 100)));

export async function vueCommunauteV4(racine, { donnees = null, simulation = false } = {}) {
  racine.innerHTML = '<div class="phase11-loading"><span class="spinner"></span><strong>Connexion à la faction…</strong></div>';
  let payload = donnees;
  try {
    payload = payload || await communauteDashboardV4();
  } catch (e) {
    racine.innerHTML = `<section class="phase11-empty"><span>✦</span><h2>Réacteur indisponible</h2><p>${esc(e.message || 'Impossible de charger les factions.')}</p></section>`;
    return;
  }

  const factions = Array.isArray(payload?.factions) ? payload.factions : [];
  if (!factions.length) {
    racine.innerHTML = `<section class="phase11-empty"><span>✦</span><h2>Les réacteurs sont éteints</h2><p>Choisis une équipe favorite pour allumer une Fiole et rejoindre une faction.</p><a href="${contexte.utilisateur ? '#/parametres' : '#/connexion'}">${contexte.utilisateur ? 'Choisir ma faction' : 'Créer mon profil'}</a></section>`;
    return;
  }

  const mienne = factions.find((f) => f.moi) || null;
  const vedette = mienne || factions[0];
  const moi = mienne ? payload?.moi || null : null;
  const p = palierFaction(vedette.membres, vedette.niveau_atteint);
  const hue = teinteFaction(vedette.tag, vedette.nom);
  const rang = Math.max(1, factions.findIndex((f) => f.equipe_id === vedette.equipe_id) + 1);

  racine.innerHTML = `
    <div class="phase11-community${simulation ? ' phase11-community--simulation' : ''}" style="--team-hue:${hue};--charge:${Math.max(.08,p.progression)}">
      ${heroFaction(vedette, p, moi, rang, Boolean(mienne))}
      <nav class="phase11-subnav" aria-label="Détails de la faction">
        <button type="button" data-phase11-jump="war">Guerre</button>
        <button type="button" data-phase11-jump="impact">Contributions</button>
        <button type="button" data-phase11-jump="archives">Archives</button>
      </nav>
      ${guerreFactions(factions, vedette)}
      ${mienne ? contributions(moi, vedette) : rejoindreFaction()}
      ${archivesMutation(moi, vedette, p)}
      ${collectionFormes(p)}
    </div>`;

  if (!simulation) verifierEvenementMutation(vedette, p);
}

function heroFaction(c, p, moi, rang, estMienne) {
  const f = formeCommunaute(p.niveau);
  const pct = clampPct(p);
  const etat = p.max ? 'max' : p.progression >= .9 ? 'critical' : p.progression >= .75 ? 'near' : p.progression >= .4 ? 'active' : 'stable';
  const signal = p.max ? 'FORME TERMINALE' : etat === 'critical' ? 'INSTABILITÉ DÉTECTÉE' : etat === 'near' ? 'MUTATION IMMINENTE' : etat === 'active' ? 'CHARGE EN HAUSSE' : 'RÉACTEUR STABLE';
  const prochaine = p.suivant;

  return `<section class="phase11-hero phase11-hero--${etat}">
    <div class="phase11-hero__noise" aria-hidden="true"></div>
    <div class="phase11-hero__halo" aria-hidden="true"></div>
    <header class="phase11-identity">
      <div class="phase11-identity__team">${ecusson(c.tag,c.nom,'m')}<div><small>${estMienne ? 'MA FACTION' : 'FACTION EN VEDETTE'}</small><h1>${esc(c.nom)}</h1><span>${esc(nomJeu(c.jeu))} · ${esc(c.tag)} · Guerre #${rang}</span></div></div>
      ${estMienne ? '<a href="#/parametres">Gérer</a>' : '<a href="#/parametres">Choisir</a>'}
    </header>

    <div class="phase11-signal"><i></i><span>${esc(signal)}</span>${!p.max ? `<b>${esc(nombre(p.restant))} avant ${esc(p.prochainNom)}</b>` : ''}</div>

    <div class="phase11-relic-stage">
      <span class="phase11-relic-stage__ring phase11-relic-stage__ring--a" aria-hidden="true"></span>
      <span class="phase11-relic-stage__ring phase11-relic-stage__ring--b" aria-hidden="true"></span>
      <span class="phase11-relic-stage__spark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
      ${relique(c,p)}
      <div class="phase11-relic-name"><small>FORME ${esc(f.code)}</small><strong>${esc(f.nom)}</strong><span>${esc(f.phrase)}</span></div>
    </div>

    <div class="phase11-progress">
      <div class="phase11-progress__headline"><div><small>${p.max ? 'SATURATION' : 'CHARGE COLLECTIVE'}</small><strong>${p.max ? 'MAX' : `${esc(nombre(c.membres))} / ${esc(nombre(p.objectif))}`}</strong></div><b>${p.max ? '100' : pct}<i>%</i></b></div>
      <div class="phase11-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p.max ? 100 : pct}" aria-label="Progression vers ${esc(p.prochainNom)}"><span style="width:${p.max ? 100 : pct}%"></span><i style="left:${p.max ? 100 : pct}%"></i></div>
      ${p.max ? '<p>La faction a atteint son environnement terminal.</p>' : `<p><strong>${esc(nombre(p.restant))}</strong> supporter${p.restant>1?'s':''} avant la mutation en <strong>${esc(p.prochainNom)}</strong>.</p>`}
    </div>

    ${prochaine ? `<div class="phase11-next"><div class="phase11-next__silhouette">${relique(c,{...p,niveau:prochaine.niveau,nom:prochaine.nom,progression:.12},{mini:true,locked:true})}</div><div><small>PROCHAINE MUTATION</small><strong>${esc(prochaine.nom)} · Forme ${esc(prochaine.code)}</strong><span>Seuil ${esc(nombre(prochaine.seuil))} supporters</span></div><b>+${esc(nombre(prochaine.recompense))} ⚡ Volts <small>/ membre</small></b></div>` : ''}

    ${estMienne ? impactHero(moi) : `<div class="phase11-impact phase11-impact--visitor"><div><small>REJOINS LA FACTION</small><strong>Ta présence vaut 1 supporter permanent.</strong><span>Les pronostics mesurent ton activité, mais ne gonflent jamais artificiellement la relique.</span></div><a href="#/parametres">Choisir cette faction</a></div>`}
  </section>`;
}

function impactHero(moi) {
  const pronos = Number(moi?.pronos_7j || 0);
  const wins = Number(moi?.gagnes_7j || 0);
  const rang = Number(moi?.rang_activite || 0);
  const total = Number(moi?.total_activite || 0);
  const place = total > 5 && rang > 0 ? `Top ${Math.max(1,Math.ceil(rang/total*100))} %` : rang > 0 ? `#${rang} / ${total}` : '—';
  return `<div class="phase11-impact" id="phase11-impact-hero"><div class="phase11-impact__intro"><small>TON IMPACT · 7 JOURS</small><strong>Tu maintiens le réacteur vivant.</strong><span>Ta présence compte pour 1 supporter. Ton activité montre à quel point tu portes la faction.</span></div><dl><div><dt>Pronos</dt><dd>${pronos}</dd></div><div><dt>Validés</dt><dd>${wins}</dd></div><div><dt>Activité</dt><dd>${esc(place)}</dd></div></dl><button type="button" data-phase11-jump="impact">Voir les contributions</button></div>`;
}

function relique(c,p,{mini=false,locked=false,animation=''}={}) {
  const hue = teinteFaction(c.tag,c.nom);
  const f = formeCommunaute(p.niveau);
  const classes = ['phase11-relic',`phase11-relic--n${p.niveau}`,mini?'is-mini':'',locked?'is-locked':'',animation].filter(Boolean).join(' ');
  return `<div class="${classes}" style="--team-hue:${hue};--charge:${Math.max(.08,Number(p.progression)||.08)}"><span class="phase11-relic__aura"></span><span class="phase11-relic__mist phase11-relic__mist--a"></span><span class="phase11-relic__mist phase11-relic__mist--b"></span>${bombonne({...p,nom:f.nom},{teinte:hue})}<span class="phase11-relic__floor"></span></div>`;
}

function guerreFactions(factions, vedette) {
  const leader = factions[0];
  return `<section class="phase11-section" id="phase11-war"><header><div><small>GUERRE DES FACTIONS</small><h2>Qui prend de la vitesse ?</h2></div><span>Croissance supporters · 24 h</span></header><div class="phase11-war">${factions.map((c,i)=>{
    const p=palierFaction(c.membres,c.niveau_atteint); const f=formeCommunaute(p.niveau); const gap=Math.max(0,Number(leader?.croissance_24h||0)-Number(c.croissance_24h||0));
    return `<article class="${c.equipe_id===vedette.equipe_id?'is-focus':''}"><b>#${i+1}</b><div class="phase11-war__team">${ecusson(c.tag,c.nom,'s')}<span><strong>${esc(c.tag)}</strong><small>${esc(f.nom)} · ${esc(nombre(c.membres))} supporters</small></span></div><div class="phase11-war__speed"><strong>${esc(croissanceTexte(c.croissance_24h))}</strong><small>24 h</small></div><span class="phase11-war__gap">${i===0?'En tête':gap?`${gap} derrière le rythme #1`:'Au coude-à-coude'}</span></article>`;
  }).join('')}</div></section>`;
}

function contributions(moi,c) {
  const top=Array.isArray(moi?.top_activite)?moi.top_activite:[];
  const date=moi?.membre_depuis?new Date(moi.membre_depuis):null;
  const depuis=date&&Number.isFinite(date.getTime())?date.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}):'—';
  return `<section class="phase11-section" id="phase11-impact"><header><div><small>CONTRIBUTIONS</small><h2>Ceux qui portent ${esc(c.tag)}</h2></div><span>Activité · 7 jours</span></header><div class="phase11-impact-grid"><article class="phase11-my-trace"><small>TA TRACE</small><strong>Membre depuis ${esc(depuis)}</strong><dl><div><dt>Pronos depuis ton arrivée</dt><dd>${esc(nombre(moi?.pronos_depuis))}</dd></div><div><dt>Mutations vécues</dt><dd>${esc(nombre(moi?.mutations_vecues))}</dd></div><div><dt>Performance 7 j</dt><dd class="${Number(moi?.delta_frags_7j||0)>=0?'is-positive':'is-negative'}">${Number(moi?.delta_frags_7j||0)>=0?'+':''}${esc(nombre(moi?.delta_frags_7j))} Frags</dd></div></dl><p>Les Frags ci-dessus restent ton rating personnel : ils ne chargent pas la relique.</p></article><div class="phase11-top-activity">${top.length?top.map((x)=>`<article class="${x.user_id===moi?.user_id?'is-me':''}"><b>#${Number(x.rang||0)}</b><span><strong>${esc(x.pseudo)}</strong><small>${Number(x.pronos_7j||0)} prono${Number(x.pronos_7j||0)>1?'s':''} · ${Number(x.gagnes_7j||0)} validé${Number(x.gagnes_7j||0)>1?'s':''}</small></span>${x.user_id===moi?.user_id?'<em>TOI</em>':''}</article>`).join(''):'<div class="phase11-inline-empty">Pas encore d’activité cette semaine.</div>'}</div></div></section>`;
}

function rejoindreFaction() {
  return `<section class="phase11-section" id="phase11-impact"><header><div><small>CONTRIBUTIONS</small><h2>Entre dans l’histoire</h2></div></header><div class="phase11-join"><span>✦</span><strong>Choisis une faction pour commencer à laisser ta trace.</strong><p>Chaque membre ajoute exactement 1 supporter à la progression collective.</p><a href="${contexte.utilisateur?'#/parametres':'#/connexion'}">${contexte.utilisateur?'Choisir ma faction':'Créer mon profil'}</a></div></section>`;
}

function archivesMutation(moi,c,p) {
  const archives=Array.isArray(moi?.archives)?moi.archives:[];
  return `<section class="phase11-section" id="phase11-archives"><header><div><small>ARCHIVES DE MUTATION</small><h2>L’histoire de la relique</h2></div><span>Les formes acquises sont permanentes</span></header><div class="phase11-timeline"><article class="is-origin"><b>I</b><span><strong>Fiole</strong><small>Origine · le noyau s’allume</small></span></article>${archives.length?archives.map((a)=>{const d=new Date(a.cree_le);const date=Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}):'';const f=formeCommunaute(a.niveau);return `<article><b>${esc(f.code)}</b><span><strong>${esc(a.nom)}</strong><small>${esc(date)} · ${esc(nombre(a.membres))} supporters</small></span><em>+${esc(nombre(a.recompense_volts))} ⚡</em></article>`;}).join(''):`<div class="phase11-inline-empty">Première mutation à ${p.suivant?esc(nombre(p.suivant.seuil)):'—'} supporters.</div>`}</div></section>`;
}

function collectionFormes(p) {
  return `<section class="phase11-section phase11-section--collection"><header><div><small>COLLECTION DE FORMES</small><h2>7 mutations permanentes</h2></div></header><div class="phase11-formes">${FORMES_COMMUNAUTE.map((f)=>`<div class="${p.niveau>f.niveau?'is-unlocked':p.niveau===f.niveau?'is-current':'is-locked'}"><b>${esc(f.code)}</b><strong>${esc(f.nom)}</strong><small>${f.niveau===1?'Origine':`${esc(nombre(f.seuil))} supporters`}</small>${f.recompense?`<span>+${esc(nombre(f.recompense))} ⚡</span>`:''}</div>`).join('')}</div></section>`;
}

function verifierEvenementMutation(c,p) {
  if (!c?.moi || !contexte.utilisateur?.id || !c.dernier_evenement_id) return;
  const eventId=String(c.dernier_evenement_id);
  const cle=`clutch.community.event_seen.${contexte.utilisateur.id}.${c.equipe_id}`;
  if(localStorage.getItem(cle)===eventId)return;
  const eventDate=new Date(c.dernier_evenement_le).getTime();
  const niveau=Math.max(2,Math.min(7,Number(c.dernier_evenement_niveau)||2));
  const f=formeCommunaute(niveau);
  const reduit=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const oldState=palierFaction(Math.max(0,f.seuil-1),niveau-1); oldState.progression=.98;
  const newState={...p,niveau,progression:Math.max(.08,p.progression)};
  const overlay=document.createElement('div');
  overlay.className=`phase11-mutation${reduit?' is-reduced':''}`;
  overlay.style.setProperty('--team-hue',teinteFaction(c.tag,c.nom));
  overlay.innerHTML=`<span class="phase11-mutation__flash"></span><section role="dialog" aria-modal="true" aria-label="Mutation de faction"><small>MUTATION DE FACTION</small><div class="phase11-mutation__scene"><div class="is-old">${relique(c,oldState,{mini:true,animation:'mutation-old'})}</div><div class="is-new">${relique(c,newState,{mini:true,animation:'mutation-new'})}</div></div><span>FORME ${esc(f.code)}</span><h2>${esc(f.nom)}</h2><p>${esc(c.nom)} vient de franchir ${esc(nombre(f.seuil))} supporters.</p><div class="phase11-mutation__reward"><strong>+${esc(nombre(c.dernier_evenement_recompense_volts??f.recompense))} ⚡ Volts</strong><small>pour chaque membre présent au passage</small></div><button type="button">Découvrir la nouvelle relique</button></section>`;
  const close=()=>{localStorage.setItem(cle,eventId);overlay.classList.add('is-closing');setTimeout(()=>overlay.remove(),reduit?0:280);};
  overlay.querySelector('button')?.addEventListener('click',close);
  overlay.addEventListener('click',(e)=>{if(e.target===overlay)close();});
  document.body.append(overlay);
  if(reduit){overlay.classList.add('phase-reveal');return;}
  requestAnimationFrame(()=>overlay.classList.add('phase-charge'));
  setTimeout(()=>overlay.classList.add('phase-overload'),650);
  setTimeout(()=>overlay.classList.add('phase-flash'),1220);
  setTimeout(()=>overlay.classList.add('phase-reveal'),1430);
}

document.addEventListener('click',(e)=>{
  const b=e.target.closest?.('[data-phase11-jump]');
  if(!b)return;
  const id=b.dataset.phase11Jump;
  const target=id==='war'?document.getElementById('phase11-war'):id==='impact'?document.getElementById('phase11-impact'):document.getElementById('phase11-archives');
  target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
