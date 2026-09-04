const editorShell = document.querySelector('#editor-shell');
const entryList = document.querySelector('#entry-list');
const slugInput = document.querySelector('#entry-slug');
const titleInput = document.querySelector('#entry-title');
const richEditor = document.querySelector('#rich-editor');
const currentHeading = document.querySelector('#current-heading');
const editorMessage = document.querySelector('#editor-message');
const previewTitle = document.querySelector('#preview-title');
const previewBody = document.querySelector('#preview-body');
const previewLink = document.querySelector('#preview-link');
const wordCount = document.querySelector('#word-count');
const localEditorKey = 'les-immortelles-contenu';
const storageFrame = document.createElement('iframe');
storageFrame.src = 'storage.html';
storageFrame.hidden = true;
document.body.append(storageFrame);
let storageReady = false;
storageFrame.addEventListener('load', () => {
  storageReady = true;
  if (entries.length) storageFrame.contentWindow.postMessage({ type: 'immortelles-write', entries }, '*');
});
const defaultEntries = [
  { slug: 'personnages', title: 'Visages de légende', body: '<p>Dix-huit destins. Des alliances fragiles, des pouvoirs anciens et une même guerre pour empêcher les mondes de disparaître.</p>' },
  { slug: 'films', title: 'Les histoires prennent vie', body: '<p>Entrez dans les coulisses des films en production. Chaque affiche est une porte entrouverte sur un chapitre de la saga.</p>' },
  { slug: 'wallpapers', title: 'Emportez les mondes', body: '<p>Une collection de paysages cinématographiques en haute définition, prête à habiller votre écran.</p>' },
  { slug: 'videos', title: 'Quelque chose s’éveille', body: '<p>Les premières bandes-annonces se préparent dans l’ombre. Revenez bientôt pour découvrir les images en mouvement.</p>' },
];
let entries = [];
let activeIndex = 0;
let autoSaveTimer;
const pageNames = { personnages: 'Personnages', films: 'Films', wallpapers: 'Wallpapers', videos: 'Vidéos' };

function readLocalEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(localEditorKey) || '[]');
    return Array.isArray(saved) && saved.length ? saved : structuredClone(defaultEntries);
  } catch (_) {
    return structuredClone(defaultEntries);
  }
}

function writeLocalEntries() {
  localStorage.setItem(localEditorKey, JSON.stringify(entries));
  if (storageReady) storageFrame.contentWindow.postMessage({ type: 'immortelles-write', entries }, '*');
}

function renderEntry() {
  const current = entries[activeIndex];
  entryList.innerHTML = entries.map((entry, index) => `<button type="button" data-index="${index}" class="${index === activeIndex ? 'active' : ''}"><i>✦</i><strong>${pageNames[entry.slug] || 'Texte libre'}</strong><small>${entry.title}</small></button>`).join('');
  if (!current) return;
  slugInput.value = current.slug;
  titleInput.value = current.title;
  richEditor.innerHTML = current.body;
  currentHeading.textContent = current.title;
  renderPreview();
}

function renderPreview() {
  const plainText = richEditor.textContent.trim();
  const words = plainText ? plainText.split(/\s+/).length : 0;
  previewTitle.textContent = titleInput.value.trim() || 'Votre titre apparaîtra ici';
  previewBody.innerHTML = richEditor.innerHTML || '<p>Commencez à écrire pour afficher l’aperçu…</p>';
  wordCount.textContent = `${words} ${words > 1 ? 'mots' : 'mot'}`;
  const slug = slugInput.value.trim().replace(/[^a-z0-9-]/gi, '');
  previewLink.href = pageNames[slug] ? `${slug}.html` : 'index.html';
}

function markAsEdited() {
  editorMessage.textContent = 'Modifications non enregistrées';
  renderPreview();
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (!slugInput.value.trim() || !titleInput.value.trim()) return;
    entries[activeIndex] = { slug: slugInput.value.trim(), title: titleInput.value.trim(), body: richEditor.innerHTML };
    writeLocalEntries();
    editorMessage.textContent = 'Brouillon sauvegardé automatiquement';
  }, 700);
}

async function loadEditor() {
  entries = readLocalEntries();
  document.querySelector('#logout').textContent = '← Retour au site';
  editorMessage.textContent = 'Mode local : les textes sont sauvegardés sur cet ordinateur.';
  activeIndex = 0;
  editorShell.hidden = false;
  renderEntry();
}

entryList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-index]');
  if (!button) return;
  activeIndex = Number(button.dataset.index);
  renderEntry();
});

document.querySelector('#add-block').addEventListener('click', () => {
  entries.push({ slug: `nouveau-bloc-${Date.now()}`, title: 'Nouveau bloc', body: '<p>Commencez à écrire ici…</p>' });
  activeIndex = entries.length - 1;
  editorMessage.textContent = 'Nouveau bloc créé — pensez à l’enregistrer.';
  renderEntry();
});

document.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', () => {
  richEditor.focus();
  document.execCommand(button.dataset.command);
  markAsEdited();
}));

document.querySelectorAll('[data-block]').forEach((button) => button.addEventListener('click', () => {
  richEditor.focus();
  document.execCommand('formatBlock', false, button.dataset.block);
  markAsEdited();
}));

document.querySelector('#add-link').addEventListener('click', () => {
  const address = window.prompt('Adresse du lien :', 'https://');
  if (!address) return;
  richEditor.focus();
  document.execCommand('createLink', false, address);
  markAsEdited();
});

[slugInput, titleInput, richEditor].forEach((field) => field.addEventListener('input', markAsEdited));

async function saveEntry(entry) {
  entries[activeIndex] = entry;
  writeLocalEntries();
  return entry;
}

document.querySelector('#save-entry').addEventListener('click', async () => {
  const button = document.querySelector('#save-entry');
  button.disabled = true;
  editorMessage.textContent = '';
  try {
    if (!slugInput.value.trim() || !titleInput.value.trim()) throw new Error('La page et le titre doivent être renseignés.');
    const saved = await saveEntry({ slug: slugInput.value.trim(), title: titleInput.value.trim(), body: richEditor.innerHTML });
    entries[activeIndex] = saved;
    editorMessage.textContent = 'Sauvegardé sur cet ordinateur. Recharge la page concernée pour voir le texte.';
    renderEntry();
  } catch (error) {
    editorMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    document.querySelector('#save-entry').click();
  }
});

document.querySelector('#logout').addEventListener('click', async () => {
  window.location.href = 'index.html';
});

loadEditor();
