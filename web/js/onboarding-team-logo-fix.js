// Phase 4 — enforce reliable, high-resolution esports organization marks in onboarding.
// If a known HQ asset fails, we fall back to the existing tag instead of showing a bad favicon.
const TEAM_LOGOS = {
  'G2 Esports': 'https://static.cdnlogo.com/logos/g/28/g2.svg',
  'Fnatic': 'https://static.cdnlogo.com/logos/f/23/fnatic.svg',
  'Karmine Corp': 'https://commons.wikimedia.org/wiki/Special:FilePath/Karmine_Corp_logo.svg',
  'NAVI': 'https://static.cdnlogo.com/logos/n/22/natus-vincere.svg',
  'Natus Vincere': 'https://static.cdnlogo.com/logos/n/22/natus-vincere.svg',
  'Team Vitality': 'https://static.cdnlogo.com/logos/t/89/team-vitality.svg',
  'Astralis': 'https://commons.wikimedia.org/wiki/Special:FilePath/Astralis.svg',
  'FaZe Clan': 'https://commons.wikimedia.org/wiki/Special:FilePath/FaZe_Clan_2025_svg.svg',
  'MOUZ': 'https://commons.wikimedia.org/wiki/Special:FilePath/MOUZlogo2021.png',
  'Team Spirit': 'https://commons.wikimedia.org/wiki/Special:FilePath/Team_Spirit_new_em.svg',
  'Paper Rex': 'https://commons.wikimedia.org/wiki/Special:FilePath/Paper_Rex_logo.svg',
  'Sentinels': 'https://commons.wikimedia.org/wiki/Special:FilePath/Sentinels_logo.svg',
  'T1': 'https://commons.wikimedia.org/wiki/Special:FilePath/T1_esports_logo.svg',
  'DRX': 'https://commons.wikimedia.org/wiki/Special:FilePath/DRX_logo_2023.png',
  'EDward Gaming': 'https://commons.wikimedia.org/wiki/Special:FilePath/Edward_Gaming_logo.png',
  'SK Gaming': 'https://commons.wikimedia.org/wiki/Special:FilePath/SK_Gaming_Logo_2022.svg',
  'Team Heretics': 'https://teamheretics.com/en/modules/wim_esports/views/img/heretics-logo-png.webp',
  'GiantX': 'https://giantx.gg/cdn/shop/files/logo_0620238f-1e58-435d-bcd2-aa131bba7992_600x.png?v=1772036626',
  'Heroic': 'https://commons.wikimedia.org/wiki/Special:FilePath/Heroic_2023_logo.png',
  'Movistar KOI': 'https://commons.wikimedia.org/wiki/Special:FilePath/Movistar_KOI_Logo.webp',
  'Rogue': 'https://commons.wikimedia.org/wiki/Special:FilePath/Rogue_logo.svg',
  'Team BDS': 'https://gamepedia.cursecdn.com/lolesports_gamepedia_en/9/9e/Team_BDSlogo_square.png',
  'Team Liquid': 'https://commons.wikimedia.org/wiki/Special:FilePath/Team_Liquid_logo.svg',
};

function fallbackToTag(card, img) {
  img?.remove();
  card.querySelector('.onboarding-v5__team-logo')?.classList.remove('has-image');
}

function patchCard(card) {
  const name = card.dataset.teamName || card.querySelector(':scope > strong')?.textContent?.trim();
  if (!name) return;
  const holder = card.querySelector('.onboarding-v5__team-logo');
  if (!holder) return;
  let img = holder.querySelector('img');
  const hq = TEAM_LOGOS[name];

  if (!hq) {
    // Never keep a generic Google favicon in the premium onboarding grid.
    if (img?.src?.includes('google.com/s2/favicons')) fallbackToTag(card, img);
    return;
  }

  if (!img) {
    img = document.createElement('img');
    img.alt = `Logo ${name}`;
    img.loading = 'eager';
    img.referrerPolicy = 'no-referrer';
    holder.append(img);
  }

  holder.classList.add('has-image');
  if (img.src !== hq) img.src = hq;
  img.onerror = () => fallbackToTag(card, img);
}

function patchAll() {
  document.querySelectorAll('.onboarding-v5__team').forEach(patchCard);
}

const root = document.getElementById('contenu');
if (root) new MutationObserver(() => requestAnimationFrame(patchAll)).observe(root, { childList: true, subtree: true });
window.addEventListener('hashchange', () => requestAnimationFrame(patchAll));
window.addEventListener('DOMContentLoaded', () => requestAnimationFrame(patchAll));
patchAll();
