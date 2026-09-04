const loginPanel = document.querySelector('#login-panel');
const editorShell = document.querySelector('#editor-shell');
const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');
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
const localEditorMode = window.location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(window.location.hostname);
const localEditorKey = 'les-immortelles-contenu';
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

async function request(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

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
  if (!localEditorMode) return;
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (!slugInput.value.trim() || !titleInput.value.trim()) return;
    entries[activeIndex] = { slug: slugInput.value.trim(), title: titleInput.value.trim(), body: richEditor.innerHTML };
    writeLocalEntries();
    editorMessage.textContent = 'Brouillon sauvegardé automatiquement';
  }, 700);
}

async function loadEditor() {
  if (localEditorMode) {
    entries = readLocalEntries();
    document.querySelector('#logout').textContent = '← Retour au site';
    editorMessage.textContent = 'Mode local : les textes sont sauvegardés sur cet ordinateur.';
  } else {
    const data = await request('/api/admin/content');
    entries = data.entries;
  }
  activeIndex = 0;
  loginPanel.hidden = true;
  editorShell.hidden = false;
  renderEntry();
  registerWebMcp();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  try {
    await request('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.querySelector('#admin-password').value }),
    });
    document.querySelector('#admin-password').value = '';
    await loadEditor();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

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
  if (localEditorMode) {
    entries[activeIndex] = entry;
    writeLocalEntries();
    return entry;
  }
  const data = await request('/api/admin/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  return data.entry;
}

document.querySelector('#save-entry').addEventListener('click', async () => {
  const button = document.querySelector('#save-entry');
  button.disabled = true;
  editorMessage.textContent = '';
  try {
    if (!slugInput.value.trim() || !titleInput.value.trim()) throw new Error('La page et le titre doivent être renseignés.');
    const saved = await saveEntry({ slug: slugInput.value.trim(), title: titleInput.value.trim(), body: richEditor.innerHTML });
    entries[activeIndex] = saved;
    editorMessage.textContent = localEditorMode ? 'Sauvegardé sur cet ordinateur. Recharge la page concernée pour voir le texte.' : 'Modifications publiées.';
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
  if (localEditorMode) {
    window.location.href = 'index.html';
    return;
  }
  await request('/api/admin/session', { method: 'DELETE' });
  editorShell.hidden = true;
  loginPanel.hidden = false;
});

async function registerWebMcp() {
  if (localEditorMode || !document.modelContext?.registerTool || window.__immortellesToolRegistered) return;
  window.__immortellesToolRegistered = true;
  try {
    await document.modelContext.registerTool({
      name: 'save_content_block', title: 'Enregistrer un bloc',
      description: 'Crée ou met à jour un bloc éditorial visible sur le site Les Immortelles.',
      inputSchema: { type: 'object', properties: { slug: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } }, required: ['slug', 'title', 'body'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input?.slug || !input?.title || !input?.body) throw new Error('slug, title et body sont obligatoires.');
        const saved = await saveEntry(input);
        return { slug: saved.slug, status: 'saved' };
      },
    });
  } catch (_) {}
}

if (localEditorMode) {
  loadEditor();
} else {
  request('/api/admin/session').then((data) => { if (data.authenticated) loadEditor(); }).catch(() => {});
}
