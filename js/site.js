const assetRoot = 'public/images';

function readSharedContent(callback) {
  const storageFrame = document.createElement('iframe');
  storageFrame.src = 'storage.html';
  storageFrame.hidden = true;
  document.body.append(storageFrame);
  const receive = (event) => {
    if (event.source !== storageFrame.contentWindow || event.data?.type !== 'immortelles-content') return;
    window.removeEventListener('message', receive);
    callback(event.data.entries || []);
    storageFrame.remove();
  };
  window.addEventListener('message', receive);
  storageFrame.addEventListener('load', () => storageFrame.contentWindow.postMessage({ type: 'immortelles-read' }, '*'));
}

const currentPage = window.location.pathname === '/' ? 'index.html' : window.location.pathname.split('/').pop();
document.querySelectorAll('.nav-links a').forEach((link) => { if (link.getAttribute('href')?.endsWith(currentPage)) link.classList.add('active'); });

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');
menuButton?.addEventListener('click', () => {
  const open = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? '×' : '☰';
});

const hero = document.querySelector('[data-hero]');
if (hero) {
  const labels = ['La rupture des mondes', 'Le serment des étoiles', 'Les portes de l’inconnu', 'L’éveil des gardiennes', 'Au-delà des royaumes', 'Le pacte des ombres', 'Le conseil des Immortelles', 'Les lueurs anciennes', 'Le souffle des arcanes', 'La mémoire du ciel', 'Le royaume des brumes', 'La couronne oubliée', 'L’appel des astres', 'Le royaume sylvestre', 'La nuit des légendes', 'Les flammes de l’aube', 'L’éternité retrouvée'];
  const backgrounds = [...hero.querySelectorAll('.hero-bg')];
  const progress = hero.querySelector('.scene-progress');
  progress.innerHTML = backgrounds.map((_, index) => `<button type="button" aria-label="${labels[index]}"></button>`).join('');
  const dots = [...progress.querySelectorAll('button')];
  let active = 0;
  let timer;
  function showScene(index) {
    active = (index + backgrounds.length) % backgrounds.length;
    backgrounds.forEach((element, item) => element.classList.toggle('is-active', item === active));
    dots.forEach((element, item) => element.classList.toggle('active', item === active));
    clearInterval(timer);
    timer = setInterval(() => showScene(active + 1), 60000);
  }
  hero.querySelector('[data-hero-prev]').addEventListener('click', () => showScene(active - 1));
  hero.querySelector('[data-hero-next]').addEventListener('click', () => showScene(active + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => showScene(index)));
  showScene(0);
}

const managedPage = document.body.dataset.page;
if (managedPage) {
  const applyManagedContent = (entry) => {
    if (!entry) return;
    const title = document.querySelector('[data-managed-title]');
    const body = document.querySelector('[data-managed-body]');
    if (title) title.textContent = entry.title;
    if (body) body.innerHTML = entry.body;
  };
  readSharedContent((entries) => applyManagedContent(entries.find((entry) => entry.slug === managedPage)));
}

const characters = [
  ['Zoé', 'Énergie multicolore'], ['Emma', 'Stratège des arcanes'], ['Elsa', 'Glace éternelle'], ['Émilie', 'Cristal astral'], ['Marie', 'Ombre pourpre'], ['Graou', 'Feu sauvage'],
  ['Alexandre', 'Chevalier magique'], ['Eliséa', 'Archère sylvestre'], ['Orkida', 'Princesse des ténèbres'], ['Lili', 'Lumière dorée'], ['Lilou', 'Archère de feu'], ['Emina', 'Gardienne des secrets'],
  ['Johanna', 'Maîtresse des arcanes'], ['Le Diable', 'Seigneur des flammes'], ['Léa', 'Ondine des marées'], ['Lisa', 'Éclat des astres'], ['Naïla', 'Fille de lumière'], ['Lila', 'Héritière du cœur astral'],
  ['Mia','Maîtresse du Diable']
];
const characterGrid = document.querySelector('#character-grid');
if (characterGrid) {
  const dialog = document.querySelector('#character-dialog');
  const dialogImage = dialog.querySelector('img');
  characterGrid.innerHTML = characters.map(([name], index) => { const number = String(index + 1).padStart(2, '0'); return `<button class="character-card" type="button" data-index="${index}" aria-label="Voir la fiche complète de ${name}"><img src="${assetRoot}/characters/character-${number}.webp" alt="Fiche personnage de ${name}" loading="lazy"></button>`; }).join('');
  characterGrid.addEventListener('click', (event) => { const card = event.target.closest('.character-card'); if (!card) return; const index = Number(card.dataset.index); dialogImage.src = `${assetRoot}/characters/character-${String(index + 1).padStart(2, '0')}.webp`; dialogImage.alt = `Fiche complète de ${characters[index][0]}`; dialog.showModal(); });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}

const filmGrid = document.querySelector('#film-grid');
if (filmGrid) {
  const films = [
    { image: '08', resume: 'resume-01.png', cycle: 'Ouverture de la saga', title: 'Le Destin de l’Univers', mood: 'Portails · Alliance · Monde inconnu' },
    { image: '01', resume: 'resume-02.png', cycle: 'Les Immortelles II', title: 'La Rupture des Mondes', mood: 'Feu · Foudre · Royaumes brisés' },
    { image: '04', resume: 'resume-03.png', cycle: 'Les Immortelles III', title: 'Le Secret de l’Éternité', mood: 'Relique · Guerre · Immortalité' },
    { image: '09', resume: 'resume-04.png', cycle: 'Les Immortelles IV', title: 'La Vengeance d’Elisa', mood: 'Vengeance · Héritage · Élémentaires' },
    { image: '05', resume: 'resume-05.png', cycle: 'Les Immortelles V', title: 'La Clé de l’Éternité', mood: 'Clé ancienne · Trahison · Destin' },
    { image: '06', resume: 'resume-06.png', cycle: 'Les Immortelles VI', title: 'La Dernière Immortelle', mood: 'Dernier rempart · Cœur astral · Siège' },
    { image: '03', resume: 'resume-07.png', cycle: 'Les Immortelles VII', title: 'Combat Final', mood: 'Alliance ultime · Sacrifice · Apocalypse' },
    { image: '07', resume: 'resume-08.png', cycle: 'Récit parallèle', title: 'La Petite Immortelle I', mood: 'Académie · Enlèvement · Deux mondes' },
    { image: '02', resume: 'resume-09.png', cycle: 'Entre les tomes VI et VII', title: 'La Petite Immortelle II : Le Monde Gelé', mood: 'Glace · École magique · Reine oubliée' },
    {image : '10',resume:'resume-10.png',cycle : 'Dernier Opus de la Série de la Petite Immortelle',title : 'La Petite Immortelle III : Le réveil du Tigre',mood : 'Tigre · Femme Diable · Nouveaux Pouvoirs'}
  ];
  const imageExists = (source) => new Promise((resolve) => {
    const probe = new Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => resolve(false);
    probe.src = source;
  });
  Promise.all(films.map((film) => imageExists(`${assetRoot}/resume/${film.resume}`))).then((availableSummaries) => {
    filmGrid.innerHTML = films.map((film, index) => {
    const poster = `${assetRoot}/posters/poster-${film.image}.webp`;
    const visual = availableSummaries[index]
      ? `<button class="poster-frame film-reveal" type="button" aria-expanded="false" aria-label="Afficher le résumé de ${film.title}"><img class="film-art" src="${poster}" alt="Affiche ${film.title}" loading="lazy"><img class="film-summary-image" src="${assetRoot}/resume/${film.resume}" alt="Résumé illustré de ${film.title}" loading="lazy"><span class="film-hint">Voir le résumé</span></button>`
      : `<div class="poster-frame"><img src="${poster}" alt="Affiche ${film.title}" loading="lazy"></div>`;
    return `<article class="film-card">${visual}<div class="film-meta"><small>${film.cycle}</small><h3>${film.title}</h3><p>${film.mood}</p></div></article>`;
    }).join('');
    filmGrid.addEventListener('click', (event) => {
      const reveal = event.target.closest('.film-reveal');
      if (!reveal) return;
      const isRevealed = reveal.classList.toggle('is-revealed');
      reveal.setAttribute('aria-expanded', String(isRevealed));
    });
  });
}

const wallpaperGrid = document.querySelector('#wallpaper-grid');
if (wallpaperGrid) wallpaperGrid.innerHTML = Array.from({ length: 17 }, (_, index) => { const number = String(index + 1).padStart(2, '0'); const source = `${assetRoot}/scenes/scene-${number}.webp`; return `<article class="wallpaper-card"><img src="${source}" alt="Paysage des Immortelles" loading="lazy"><div class="wallpaper-overlay"><span>Les Immortelles</span><a href="${source}" download="les-immortelles-wallpaper-${number}.webp">↓ Télécharger</a></div></article>`; }).join('');
