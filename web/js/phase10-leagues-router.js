import { vueLigueV3 } from './views/ligue-v3.js';
import { vueLigueInvitation } from './views/ligue-invitation.js';

let rendu = '';
let enCours = false;

function route() {
  const invite = String(location.hash || '').match(/^#\/ligues\/invite\/([A-Z0-9]+)$/i);
  if (invite) return { type:'invite', ref:invite[1].toUpperCase(), key:`invite:${invite[1].toUpperCase()}` };
  const league = String(location.hash || '').match(/^#\/ligues\/([0-9a-f-]{36})$/i);
  if (league) return { type:'league', ref:league[1], key:`league:${league[1]}` };
  return null;
}

async function synchroniser() {
  const r = route();
  if (!r || enCours || rendu === r.key) return;
  const root = document.getElementById('contenu');
  if (!root) return;
  enCours = true;
  try {
    if (r.type === 'invite') await vueLigueInvitation(root, r.ref);
    else await vueLigueV3(root, r.ref);
    rendu = r.key;
    root.dataset.phase10Route = r.key;
  } finally { enCours = false; }
}

window.addEventListener('hashchange', () => { rendu=''; setTimeout(() => void synchroniser(), 0); });
new MutationObserver(() => {
  const r=route(); const root=document.getElementById('contenu');
  if (r && root?.dataset.phase10Route !== r.key && !enCours) { rendu=''; void synchroniser(); }
}).observe(document.body,{childList:true,subtree:true});
setTimeout(() => void synchroniser(),0);
