import { toast } from './ui.js';

function challengeUrl(token) {
  return `${location.origin}/c/${encodeURIComponent(String(token || ''))}`;
}

function matchUrl(matchId) {
  return `${location.origin}/m/${encodeURIComponent(String(matchId || ''))}`;
}

function currentMatchId() {
  const m = String(location.hash || '').match(/^#\/matchs\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function copy(text, message = 'Lien copié.') {
  try {
    await navigator.clipboard.writeText(text);
    toast(message, 'succes');
  } catch {
    window.prompt('Copie ce lien :', text);
  }
}

async function share({ title, text, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copy(url, 'Lien public copié.');
}

function rewriteChallengeLink() {
  document.querySelectorAll('[data-phase8-copy]').forEach((button) => {
    const token = button.dataset.phase8Copy;
    const code = button.closest('.phase8-share__url')?.querySelector('code');
    if (token && code && code.textContent !== challengeUrl(token)) code.textContent = challengeUrl(token);
  });
}

function injectMatchShare() {
  const matchId = currentMatchId();
  const root = document.querySelector('.match-center');
  if (!matchId || !root || root.querySelector('[data-phase9-match-share]')) return;
  const back = root.querySelector('.match-center__back');
  if (!back) return;

  const bar = document.createElement('div');
  bar.className = 'phase9-match-share';
  bar.dataset.phase9MatchShare = '1';
  bar.innerHTML = `<span><b>LIEN PUBLIC</b><small>Invite quelqu’un à prendre position.</small></span><button type="button" data-phase9-share-match="${escapeAttr(matchId)}">Partager le match</button>`;
  back.insertAdjacentElement('afterend', bar);
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sync() {
  rewriteChallengeLink();
  injectMatchShare();
}

document.addEventListener('click', (event) => {
  const challengeShare = event.target.closest?.('[data-phase8-share]');
  if (challengeShare) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const token = challengeShare.dataset.phase8Share;
    void share({
      title: 'Duel Clutch',
      text: 'Je t’ai défié sur Clutch. Tu prends qui ?',
      url: challengeUrl(token),
    });
    return;
  }

  const challengeCopy = event.target.closest?.('[data-phase8-copy]');
  if (challengeCopy) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void copy(challengeUrl(challengeCopy.dataset.phase8Copy), 'Lien public du défi copié.');
    return;
  }

  const matchShare = event.target.closest?.('[data-phase9-share-match]');
  if (matchShare) {
    event.preventDefault();
    const teams = [...document.querySelectorAll('.match-center__team > span')].map((el) => el.textContent?.trim()).filter(Boolean);
    const duel = teams.length >= 2 ? `${teams[0]} vs ${teams[1]}` : 'ce match';
    void share({
      title: `${duel} · Clutch`,
      text: `Tu prends qui sur ${duel} ?`,
      url: matchUrl(matchShare.dataset.phase9ShareMatch),
    });
  }
}, true);

window.addEventListener('hashchange', () => setTimeout(sync, 0));
new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
setTimeout(sync, 0);
