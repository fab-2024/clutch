// Profile V4 compatibility bridge.
// Keeps the current profile renderer intact while retiring Economy V1 UI debt.

const ETAT = { timer: null };

function routeProfil() {
  return location.hash.replace(/^#/, '') === '/profil';
}

function retirerColonnesLegacy(table) {
  if (!table || table.dataset.profileV4Clean === '1') return;
  table.dataset.profileV4Clean = '1';

  table.querySelectorAll('tr').forEach((row) => {
    // Legacy columns: Engagé + Multipl. (Economy V1). Remove from right to left.
    [3, 2].forEach((index) => row.children[index]?.remove());
  });

  const headers = table.querySelectorAll('thead th');
  if (headers[0]) headers[0].textContent = 'Match';
  if (headers[1]) headers[1].textContent = 'Pronostic';
  if (headers[2]) headers[2].textContent = 'Impact Frags';
}

function enrichirBlocHistorique(bloc, index) {
  if (!bloc || bloc.classList.contains('profile-history-v4')) return;
  bloc.classList.add('profile-history-v4');
  bloc.dataset.profileHistory = index === 0 ? 'open' : 'settled';

  const titre = bloc.querySelector('.bloc__titre');
  if (titre && !titre.querySelector('.profile-v4-legend')) {
    const legende = document.createElement('span');
    legende.className = 'profile-v4-legend';
    legende.textContent = index === 0 ? 'Choix verrouillés jusqu’au verdict' : 'Rating saisonnier · aucun Frag engagé';
    titre.appendChild(legende);
  }

  retirerColonnesLegacy(bloc.querySelector('table'));
}

function nettoyerProfil() {
  if (!routeProfil()) return;
  const profil = document.querySelector('.profil-v2');
  if (!profil) return;

  profil.classList.add('profil-v4-active');

  // Daily login Frags belong to Economy V1. Economy V2 never grants ranking
  // points for attendance, so the old module is deliberately removed from UI.
  document.querySelectorAll('.profil-section--serie').forEach((section) => {
    section.classList.add('profile-v4-legacy-hidden');
    section.setAttribute('aria-hidden', 'true');
  });

  // The renderer places the two pronostic blocks directly after .profil-v2.
  const blocs = [];
  let suivant = profil.nextElementSibling;
  while (suivant && blocs.length < 2) {
    if (suivant.classList.contains('bloc')) blocs.push(suivant);
    suivant = suivant.nextElementSibling;
  }
  blocs.forEach(enrichirBlocHistorique);
}

function programmer() {
  clearTimeout(ETAT.timer);
  ETAT.timer = setTimeout(() => {
    if (!routeProfil()) return;
    let essais = 0;
    const attendre = () => {
      if (document.querySelector('.profil-v2')) {
        nettoyerProfil();
        return;
      }
      essais += 1;
      if (essais < 24) setTimeout(attendre, 70);
    };
    attendre();
  }, 35);
}

window.addEventListener('hashchange', programmer);
window.addEventListener('DOMContentLoaded', programmer);
programmer();
