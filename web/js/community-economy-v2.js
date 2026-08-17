/**
 * Temporary Phase 2 compatibility bridge.
 *
 * Community V3 still renders the historical word "Frags" for mutation rewards.
 * The database now supplies Volts for those rewards. Until community.js is
 * fully migrated, keep the visible copy aligned with Economy V2 without
 * touching any rating value or prediction logic.
 */

function alignerLibelles(root = document) {
  const zones = root.querySelectorAll?.('.commu-v2, .commu-mutation-v3, .commu-recompense, .commu-histoire') ?? [];
  for (const zone of zones) remplacerDans(zone);
  if (root.matches?.('.commu-v2, .commu-mutation-v3, .commu-recompense, .commu-histoire')) remplacerDans(root);
}

function remplacerDans(zone) {
  const walker = document.createTreeWalker(zone, NodeFilter.SHOW_TEXT);
  const textes = [];
  while (walker.nextNode()) textes.push(walker.currentNode);
  for (const node of textes) {
    if (!node.nodeValue?.includes('Frags')) continue;
    node.nodeValue = node.nodeValue.replaceAll('Frags', 'Volts');
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) alignerLibelles(node);
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    alignerLibelles();
    observer.observe(document.body, { childList: true, subtree: true });
  }, { once: true });
} else {
  alignerLibelles();
  observer.observe(document.body, { childList: true, subtree: true });
}
