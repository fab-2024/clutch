/** Social mobile : Missions | Ligues | Faction | Amis. */
import { contexte } from '../app.js';
import { vueLigues } from './ligues.js';
import { vueCommunauteV4 } from './communaute-v4.js';
import { sectionAmis } from './amis.js';
import { vueFriendQuests } from './friend-quests.js';

const SECTIONS = [
  { cle: 'missions', libelle: 'Missions' },
  { cle: 'ligues', libelle: 'Ligues' },
  { cle: 'faction', libelle: 'Faction' },
  { cle: 'amis', libelle: 'Amis' },
];

export async function vueSocial(racine, section = 'ligues') {
  const actif = SECTIONS.some((s) => s.cle === section) ? section : 'ligues';

  racine.innerHTML = `
    <section class="social-shell" data-section="${actif}">
      <nav class="social-shell__nav" aria-label="Sections sociales">
        ${SECTIONS.map((s) => `
          <a class="social-shell__tab${s.cle === actif ? ' actif' : ''}"
             href="#/social/${s.cle}"
             ${s.cle === actif ? 'aria-current="page"' : ''}>
            <span>${s.cle === 'missions' ? '⚡ ' : ''}${s.libelle}</span>
          </a>`).join('')}
        <a class="social-shell__tab social-shell__tab--duels" href="#/defis">
          <span>⚔ Duels</span>
        </a>
      </nav>
      <div class="social-shell__content" id="social-shell-content">
        <div class="chargement"><span class="spinner"></span></div>
      </div>
    </section>`;

  const zone = racine.querySelector('#social-shell-content');
  if (actif === 'missions') await vueFriendQuests(zone);
  else if (actif === 'faction') await vueCommunauteV4(zone);
  else if (actif === 'amis') await sectionAmis(zone);
  else await vueLigues(zone, contexte.utilisateur ? 'mes' : 'global');
}