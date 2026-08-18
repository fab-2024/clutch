export function activerCarteResultat(root = document) {
  const carte = root.querySelector?.('[data-phase6-card]');
  if (!carte || carte.dataset.motionReady === '1') return;
  carte.dataset.motionReady = '1';

  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fin = window.matchMedia?.('(pointer: fine)').matches;
  if (reduit || !fin) return;

  const bouger = (event) => {
    const rect = carte.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const tiltY = (x - 0.5) * 7;
    const tiltX = (0.5 - y) * 5;
    carte.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
    carte.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    carte.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
    carte.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);
    carte.style.setProperty('--holo-angle', `${Math.round(210 + x * 70)}deg`);
  };

  const reset = () => {
    carte.style.setProperty('--tilt-x', '0deg');
    carte.style.setProperty('--tilt-y', '0deg');
    carte.style.setProperty('--shine-x', '50%');
    carte.style.setProperty('--shine-y', '22%');
  };

  carte.addEventListener('pointermove', bouger, { passive: true });
  carte.addEventListener('pointerleave', reset, { passive: true });
}
