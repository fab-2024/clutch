const champUrl = document.getElementById('url');
const caseActif = document.getElementById('actif');
const message = document.getElementById('message');

chrome.storage.sync.get(['urlApp', 'actif'], (v) => {
  champUrl.value = v.urlApp || '';
  caseActif.checked = v.actif !== false;
});

document.getElementById('enregistrer').addEventListener('click', () => {
  const url = champUrl.value.trim();
  if (url && !/^https?:\/\//.test(url)) {
    message.textContent = "L'adresse doit commencer par http:// ou https://";
    message.style.color = '#ff5c72';
    return;
  }
  chrome.storage.sync.set({ urlApp: url, actif: caseActif.checked }, () => {
    message.style.color = '#00e5a0';
    message.textContent = 'Réglages enregistrés.';
    setTimeout(() => (message.textContent = ''), 2000);
  });
});
