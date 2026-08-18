/**
 * Clutch UI System — shared render primitives.
 * Keep these presentation-only: no economy or business rules live here.
 */
import { esc, ecusson } from './ui.js';

const TEAM_LOGOS = {
  'Movistar KOI': 'https://commons.wikimedia.org/wiki/Special:FilePath/Movistar_KOI_Logo.webp',
  'Team BDS': 'https://gamepedia.cursecdn.com/lolesports_gamepedia_en/9/9e/Team_BDSlogo_square.png',
};

const TEAM_LOGOS_DARK = new Set(['Team BDS']);

export function cx(...classes) {
  return classes.flat().filter(Boolean).join(' ');
}

export function Button({ label, href = null, variant = 'primary', size = 'md', className = '', attrs = '', icon = '' } = {}) {
  const tag = href ? 'a' : 'button';
  const hrefAttr = href ? ` href="${esc(href)}"` : ' type="button"';
  const classes = cx('c-btn', variant === 'ghost' && 'c-btn--ghost', size === 'compact' && 'c-btn--compact', className);
  return `<${tag} class="${esc(classes)}"${hrefAttr}${attrs ? ` ${attrs}` : ''}><span>${esc(label ?? '')}</span>${icon || ''}</${tag}>`;
}

export function ProgressBar({ value = 0, max = 100, label = '', meta = '', className = '' } = {}) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeValue = Math.max(0, Math.min(safeMax, Number(value) || 0));
  const pct = Math.round((safeValue / safeMax) * 100);
  return `<div class="${esc(cx('c-progress', className))}" role="progressbar" aria-valuemin="0" aria-valuemax="${safeMax}" aria-valuenow="${safeValue}">
    ${(label || meta) ? `<div class="c-progress__meta"><span>${esc(label)}</span><span>${esc(meta)}</span></div>` : ''}
    <div class="c-progress__track"><i class="c-progress__fill" style="width:${pct}%"></i></div>
  </div>`;
}

export function MetaChip({ label = '', value = '', icon = '', href = null, tone = 'default', id = '', title = '' } = {}) {
  const tag = href ? 'a' : 'span';
  const classes = cx('c-chip', tone === 'volt' && 'c-chip--volt', tone === 'muted' && 'c-chip--muted');
  const attrs = [
    href ? `href="${esc(href)}"` : '',
    id ? `id="${esc(id)}"` : '',
    title ? `title="${esc(title)}"` : '',
  ].filter(Boolean).join(' ');
  return `<${tag} class="${classes}" ${attrs}>${icon}<span>${esc(label)}</span><strong>${esc(value)}</strong></${tag}>`;
}

export function Avatar({ name = '?', href = '#/profil', title = 'Mon profil', className = '' } = {}) {
  const initials = initiales(name);
  return `<a class="${esc(cx('c-avatar', className))}" href="${esc(href)}" title="${esc(title)}" aria-label="${esc(title)}">${esc(initials)}</a>`;
}

export function SectionHeading({ eyebrow = '', title = '', meta = '', className = '' } = {}) {
  return `<div class="${esc(cx('c-section-head', className))}"><div>${eyebrow ? `<span class="sur-titre">${esc(eyebrow)}</span>` : ''}${title ? `<h2>${esc(title)}</h2>` : ''}</div>${meta ? `<span class="c-section-head__meta">${esc(meta)}</span>` : ''}</div>`;
}

export function Tabs({ items = [], active = null, className = '' } = {}) {
  return `<nav class="${esc(cx('c-tabs', className))}" aria-label="Sections">${items.map((item) => {
    const actif = item.id === active;
    const tag = item.href ? 'a' : 'button';
    const attr = item.href ? `href="${esc(item.href)}"` : 'type="button"';
    return `<${tag} ${attr} class="${actif ? 'actif' : ''}"${actif ? ' aria-current="page"' : ''}>${esc(item.label)}</${tag}>`;
  }).join('')}</nav>`;
}

export function TeamBadge({ tag, name, size = 'm', className = '' } = {}) {
  const src = TEAM_LOGOS[name] || '';
  if (src) {
    const logoSize = size === 's' ? 'sm' : size === 'l' ? 'lg' : 'md';
    return TeamLogo({ src, name, tag, size: logoSize, contrast: TEAM_LOGOS_DARK.has(name), className: cx('c-team-badge', className) });
  }
  return `<span class="${esc(cx('c-team-badge', className))}">${ecusson(tag, name, size)}</span>`;
}

/**
 * Normalized optical box for real organization marks.
 * Use this instead of raw <img> tags whenever a licensed/source logo is shown.
 */
export function TeamLogo({ src = '', name = '', tag = '', size = 'md', contrast = false, className = '' } = {}) {
  const safeSize = ['sm', 'md', 'lg'].includes(size) ? size : 'md';
  const fallback = String(tag || initiales(name) || '?').slice(0, 4).toUpperCase();
  const classes = cx('c-team-logo', `c-team-logo--${safeSize}`, contrast && 'needs-contrast', !src && 'c-team-logo--fallback', className);
  const label = name ? `Logo ${name}` : `Équipe ${fallback}`;
  if (!src) return `<span class="${esc(classes)}" role="img" aria-label="${esc(label)}"><b class="c-team-logo__fallback">${esc(fallback)}</b></span>`;
  return `<span class="${esc(classes)}"><b class="c-team-logo__fallback" aria-hidden="true">${esc(fallback)}</b><img src="${esc(src)}" alt="${esc(label)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove();this.parentElement.classList.add('c-team-logo--fallback')" /></span>`;
}

export function EmptyState({ title = '', text = '', action = '' } = {}) {
  return `<div class="c-empty"><div><h3>${esc(title)}</h3><p>${esc(text)}</p>${action ? `<div style="margin-top:16px">${action}</div>` : ''}</div></div>`;
}

function initiales(nom) {
  const mots = String(nom || '?').trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}
