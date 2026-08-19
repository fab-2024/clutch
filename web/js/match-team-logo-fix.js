// Phase 6C — real organization marks across Match Arena / Match Center.
// This decorates legacy match markup without touching prediction/economy logic.
import { TeamBadge } from './components-v4.js';

if (!document.querySelector('link[data-match-team-logos]')) {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = 'styles/pages/match-team-logos.css';
  sheet.dataset.matchTeamLogos = '1';
  document.head.append(sheet);
}

const TEAM_TAGS = {
  'G2 Esports': 'G2',
  'Karmine Corp': 'KC',
  'Fnatic': 'FNC',
  'Movistar KOI': 'MKOI',
  'Team Vitality': 'VIT',
  'Team BDS': 'BDS',
  'Team Heretics': 'TH',
  'SK Gaming': 'SK',
  'GiantX': 'GX',
  'Rogue': 'RGE',
  'Natus Vincere': 'NAVI',
  'NAVI': 'NAVI',
  'Team Spirit': 'SPR',
  'FaZe Clan': 'FAZE',
  'MOUZ': 'MOUZ',
  'Team Falcons': 'FLC',
  'Astralis': 'AST',
  'Virtus.pro': 'VP',
  'Heroic': 'HER',
  'Team Liquid': 'TL',
  'Paper Rex': 'PRX',
  'Sentinels': 'SEN',
  'DRX': 'DRX',
  'T1': 'T1',
  'EDward Gaming': 'EDG',
};

const teamTag = (name, explicit = '') => explicit || TEAM_TAGS[name] || String(name || '?').slice(0, 4).toUpperCase();
const logo = (name, tag = '', size = 'm', className = '') => TeamBadge({ name, tag: teamTag(name, tag), size, className: `match-team-mark ${className}`.trim() });

function patchHeroTeam(team) {
  if (team.dataset.realLogo === '1') return;
  const name = team.querySelector('.arena-team__copy strong')?.textContent?.trim();
  const tag = team.querySelector('.arena-team__copy small')?.textContent?.trim();
  const holder = team.querySelector('.arena-team__logo');
  if (!name || !holder) return;
  holder.innerHTML = logo(name, tag, 'l', 'match-team-mark--hero');
  team.dataset.realLogo = '1';
}

function patchTimelineTeam(team) {
  if (team.dataset.realLogo === '1') return;
  const name = team.querySelector('strong')?.textContent?.trim();
  if (!name) return;
  const legacy = team.querySelector(':scope > .ecusson-cadre, :scope > .ecusson');
  if (legacy) legacy.outerHTML = logo(name, '', 's', 'match-team-mark--row');
  else team.insertAdjacentHTML(team.classList.contains('arena-row__team--right') ? 'beforeend' : 'afterbegin', logo(name, '', 's', 'match-team-mark--row'));
  team.dataset.realLogo = '1';
}

function patchCenterTeam(team) {
  if (team.dataset.realLogo === '1') return;
  const name = team.querySelector(':scope > strong')?.textContent?.trim();
  const tag = team.querySelector(':scope > span')?.textContent?.trim();
  if (!name) return;
  const legacy = team.querySelector(':scope > .ecusson-cadre, :scope > .ecusson');
  if (legacy) legacy.outerHTML = logo(name, tag, 'l', 'match-team-mark--center');
  else team.insertAdjacentHTML('afterbegin', logo(name, tag, 'l', 'match-team-mark--center'));
  team.dataset.realLogo = '1';
}

function patchChoice(choice) {
  if (choice.dataset.realLogo === '1') return;
  const label = choice.querySelector('.match-choice__label');
  const name = label?.textContent?.trim();
  if (!name || !label) return;
  label.insertAdjacentHTML('beforebegin', logo(name, '', 'm', 'match-team-mark--choice'));
  choice.dataset.realLogo = '1';
}

function patchTicketPick(pick) {
  if (pick.dataset.realLogo === '1') return;
  const name = pick.querySelector('strong')?.textContent?.trim();
  if (!name) return;
  pick.insertAdjacentHTML('afterbegin', logo(name, '', 's', 'match-team-mark--ticket'));
  pick.dataset.realLogo = '1';
}

function patchLockedTicket(ticket) {
  if (ticket.dataset.realLogo === '1') return;
  const name = ticket.querySelector(':scope > strong')?.textContent?.trim();
  const eyebrow = ticket.querySelector(':scope > .sur-titre');
  if (!name || !eyebrow) return;
  eyebrow.insertAdjacentHTML('afterend', logo(name, '', 's', 'match-team-mark--ticket'));
  ticket.dataset.realLogo = '1';
}

function patchMyPick(row) {
  if (row.dataset.realLogo === '1') return;
  const first = row.querySelector(':scope > div:first-child');
  const name = first?.querySelector('strong')?.textContent?.trim();
  if (!first || !name) return;
  first.insertAdjacentHTML('afterbegin', logo(name, '', 's', 'match-team-mark--pick'));
  row.dataset.realLogo = '1';
}

function patchAll() {
  if (!location.hash.startsWith('#/matchs')) return;
  document.querySelectorAll('.arena-team').forEach(patchHeroTeam);
  document.querySelectorAll('.arena-row__team').forEach(patchTimelineTeam);
  document.querySelectorAll('.match-center__team').forEach(patchCenterTeam);
  document.querySelectorAll('.match-choice').forEach(patchChoice);
  document.querySelectorAll('.arena-ticket__pick, .match-ticket__selected').forEach(patchTicketPick);
  document.querySelectorAll('.match-ticket--locked').forEach(patchLockedTicket);
  document.querySelectorAll('.match-my-pick').forEach(patchMyPick);
}

let queued = false;
function schedulePatch() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    patchAll();
  });
}

new MutationObserver(schedulePatch).observe(document.body, { childList: true, subtree: true });
window.addEventListener('hashchange', schedulePatch, true);
window.addEventListener('DOMContentLoaded', schedulePatch);
schedulePatch();
