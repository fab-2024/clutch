// Phase 6B — final community relic presentation.
// Presentation only: no progression/economy rule lives here.

const TEAM_MARKS = {
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

// Marks whose source artwork is black/dark and becomes unreadable on Clutch's dark surfaces.
const HIGH_CONTRAST = new Set(['G2 Esports', 'Karmine Corp', 'Rogue', 'T1']);
let decorateFrame = 0;

function safeTag(identity) {
  const direct = identity?.querySelector('.ecusson')?.textContent?.trim();
  if (direct) return direct.slice(0, 5).toUpperCase();
  const meta = identity?.querySelector('.phase11-identity__team > div > span')?.textContent || '';
  const candidate = meta.split('·')[1]?.trim();
  return (candidate || 'TEAM').slice(0, 5).toUpperCase();
}

function logoNode(className, name, tag, src) {
  const span = document.createElement('span');
  span.className = className;

  const img = document.createElement('img');
  img.alt = `Logo ${name || tag}`;
  img.loading = 'eager';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.src = src || '';

  if (HIGH_CONTRAST.has(name)) {
    img.style.filter = 'grayscale(1) brightness(0) invert(1) drop-shadow(0 2px 5px rgba(0,0,0,.34))';
  }

  const fallback = document.createElement('b');
  fallback.textContent = tag;
  span.append(img, fallback);

  if (!src) span.classList.add('is-fallback');
  img.addEventListener('error', () => span.classList.add('is-fallback'), { once: true });
  img.addEventListener('load', () => span.classList.remove('is-fallback'), { once: true });
  return span;
}

function decorateHero(hero) {
  if (!hero || hero.dataset.phase6bRelic === '1') return;

  const identity = hero.querySelector('.phase11-identity__team');
  const stageRelic = hero.querySelector('.phase11-relic-stage > .phase11-relic');
  if (!identity || !stageRelic) return;

  const name = identity.querySelector('h1')?.textContent?.trim() || '';
  const tag = safeTag(identity);
  const src = TEAM_MARKS[name] || '';

  if (!identity.querySelector('.phase6b-faction-logo')) {
    const mark = logoNode('phase6b-faction-logo', name, tag, src);
    identity.prepend(mark);
    identity.classList.add('has-phase6b-brand');
  }

  if (!stageRelic.querySelector('.phase6b-relic-pendant')) {
    const pendant = document.createElement('span');
    pendant.className = 'phase6b-relic-pendant';
    pendant.setAttribute('aria-hidden', 'true');

    const chain = document.createElement('span');
    chain.className = 'phase6b-relic-pendant__chain';
    const seal = logoNode('phase6b-relic-pendant__seal', name, tag, src);
    pendant.append(chain, seal);
    stageRelic.append(pendant);
  }

  const progressLabel = hero.querySelector('.phase11-progress__headline small');
  if (progressLabel && progressLabel.textContent.trim() !== 'SATURATION') {
    progressLabel.textContent = 'SUPPORTERS RELIÉS';
  }

  const progressText = hero.querySelector('.phase11-progress > p');
  if (progressText) progressText.dataset.phase6bCopy = '1';

  hero.dataset.phase6bRelic = '1';
  hero.classList.add('phase6b-relic-hero');
}

function decorate() {
  document.querySelectorAll('.phase11-community .phase11-hero').forEach(decorateHero);
}

function scheduleDecorate() {
  if (decorateFrame) cancelAnimationFrame(decorateFrame);
  decorateFrame = requestAnimationFrame(() => {
    decorateFrame = 0;
    decorate();
  });
}

// The router replaces #contenu itself on every navigation. Observe the stable
// document body instead of the disposable route container.
const observerRoot = document.body || document.documentElement;
if (observerRoot) {
  new MutationObserver(scheduleDecorate).observe(observerRoot, { childList: true, subtree: true });
}

window.addEventListener('hashchange', scheduleDecorate);
window.addEventListener('DOMContentLoaded', scheduleDecorate);
scheduleDecorate();
