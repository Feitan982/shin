/* ============================================
   ROMANTIC SURPRISE WEBSITE - JAVASCRIPT
   With Add/Edit/Delete functionality
   ============================================ */

// ---------- LOCALSTORAGE KEYS ----------
const STORAGE_KEYS = {
  notes: 'love_notes',
  photos: 'love_photos',
  videos: 'love_videos',
  memories: 'love_memories'
};

// ---------- FLOATING HEARTS BACKGROUND ----------
function createFloatingHearts() {
  const heartsBg = document.getElementById('heartsBg');
  if (!heartsBg) return;

  const hearts = ['❤️', '💕', '💖', '💗', '🌸', '✨'];
  const positions = [
    { top: '10%', left: '5%',  delay: '0s' },
    { top: '25%', left: '85%', delay: '2s' },
    { top: '70%', left: '10%', delay: '5s' },
    { top: '50%', left: '92%', delay: '1s' },
    { top: '85%', left: '45%', delay: '7s' },
    { top: '15%', left: '45%', delay: '4s' },
    { top: '90%', left: '78%', delay: '3s' },
    { top: '40%', left: '20%', delay: '6s' },
  ];

  positions.forEach((pos, i) => {
    const span = document.createElement('span');
    span.textContent = hearts[i % hearts.length];
    span.style.top = pos.top;
    span.style.left = pos.left;
    span.style.animationDelay = pos.delay;
    heartsBg.appendChild(span);
  });
}

// ---------- DEFAULT DATA ----------
const defaultNotes = [
  { text: '"Every morning I thank the universe for you. You\'re my favorite thought, my sweetest dream."', date: '— always yours' },
  { text: '"You\'re the reason I smile at my phone like an idiot. And I love it."', date: '— 3:17 AM, thinking of you' },
  { text: '"If I had to choose between you and a million dollars... I\'d choose you, obviously. Then we can spend the million together 😉"', date: '— your silly boy' },
  { text: '"Even on my worst days, your voice is my calm. Thank you for existing, mahal."', date: '— forever grateful' }
];

const defaultPhotos = [
  { src: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=600&auto=format&fit=crop', caption: 'first date vibes' },
  { src: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=600&auto=format&fit=crop', caption: 'sunset with you' },
  { src: 'https://images.unsplash.com/photo-1501901609772-df0848060b33?w=600&auto=format&fit=crop', caption: 'coffee & laughs' },
  { src: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop', caption: 'my favorite hand to hold' },
  { src: 'https://images.unsplash.com/photo-1543807535-eceef0bc6599?w=600&auto=format&fit=crop', caption: 'walking with you' },
  { src: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?w=600&auto=format&fit=crop', caption: 'my safe place' }
];

const defaultVideos = [
  { poster: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&auto=format&fit=crop', src: 'https://www.w3schools.com/html/mov_bbb.mp4', note: 'our silly dance', description: 'You make me laugh like no one else.' },
  { poster: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&auto=format&fit=crop', src: 'https://www.w3schools.com/html/mov_bbb.mp4', note: 'beach day', description: 'Your smile in the sun, priceless.' },
  { poster: 'https://images.unsplash.com/photo-1501901609772-df0848060b33?w=400&auto=format&fit=crop', src: 'https://www.w3schools.com/html/mov_bbb.mp4', note: 'coffee date', description: 'Simple moments, best with you.' }
];

const defaultMemories = [
  { text: 'The first time we said "I love you" — my heart was racing so fast.', date: 'October 4' },
  { text: 'That rainy afternoon we stayed in, watched movies, and ate pizza. Best day ever.', date: 'December 2' },
  { text: 'Our first trip together — getting lost, laughing, and you stealing my hoodie.', date: 'Summer' },
  { text: 'The night we stayed up until 4 AM just talking about our dreams. I knew you were the one.', date: 'January 20' },
  { text: 'When you surprised me with my favorite food after a long day. You always know how to make me feel special.', date: 'March 8' }
];

// ---------- STORAGE HELPERS ----------
function loadData(key, defaults) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [...defaults];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...defaults];
  } catch (e) {
    return [...defaults];
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save data:', e);
  }
}

// Data containers
let notesData = loadData(STORAGE_KEYS.notes, defaultNotes);
let photosData = loadData(STORAGE_KEYS.photos, defaultPhotos);
let videosData = loadData(STORAGE_KEYS.videos, defaultVideos);
let memoriesData = loadData(STORAGE_KEYS.memories, defaultMemories);

// Edit mode
let editMode = false;

// ---------- RENDER FUNCTIONS ----------

function renderNotes() {
  const tbody = document.getElementById('notesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (notesData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">No notes yet. Add one! 💕</td></tr>`;
    return;
  }

  notesData.forEach((note, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num-cell">${index + 1}</td>
      <td class="note-text">${escapeHtml(note.text)}</td>
      <td class="note-from">${escapeHtml(note.date)}</td>
      <td class="action-col action-cell ${editMode ? '' : 'hidden'}">
        <button class="edit-btn" data-type="note" data-index="${index}" title="Edit">✏️</button>
        <button class="delete-btn" data-type="note" data-index="${index}" title="Delete">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPhotos() {
  const tbody = document.getElementById('photosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (photosData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-cell">No photos yet. Add one! 📸</td></tr>`;
    return;
  }

  photosData.forEach((photo, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num-cell">${index + 1}</td>
      <td class="photo-cell">
        <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.caption)}" loading="lazy" class="table-photo" onerror="this.src='https://via.placeholder.com/140x140/ffeef2/d46b8c?text=%E2%9D%A4'">
      </td>
      <td class="caption-cell">${escapeHtml(photo.caption)}</td>
      <td class="action-col action-cell ${editMode ? '' : 'hidden'}">
        <button class="edit-btn" data-type="photo" data-index="${index}" title="Edit">✏️</button>
        <button class="delete-btn" data-type="photo" data-index="${index}" title="Delete">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderVideos() {
  const tbody = document.getElementById('videosTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (videosData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-cell">No videos yet. Add one! 🎬</td></tr>`;
    return;
  }

  videosData.forEach((video, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num-cell">${index + 1}</td>
      <td class="video-cell">
        <video controls poster="${escapeHtml(video.poster || '')}" preload="metadata" class="table-video">
          <source src="${escapeHtml(video.src)}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </td>
      <td class="video-note-cell">${escapeHtml(video.note)}</td>
      <td class="video-desc-cell">${escapeHtml(video.description)}</td>
      <td class="action-col action-cell ${editMode ? '' : 'hidden'}">
        <button class="edit-btn" data-type="video" data-index="${index}" title="Edit">✏️</button>
        <button class="delete-btn" data-type="video" data-index="${index}" title="Delete">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMemories() {
  const container = document.getElementById('memoriesList');
  if (!container) return;
  container.innerHTML = '';

  if (memoriesData.length === 0) {
    container.innerHTML = `<div class="empty-cell">No memories yet. Add one! 🧸</div>`;
    return;
  }

  memoriesData.forEach((memory, index) => {
    const item = document.createElement('div');
    item.className = 'memory-item';
    item.innerHTML = `
      ${escapeHtml(memory.text)}
      <span class="memory-date">${escapeHtml(memory.date)}</span>
      <div class="memory-actions ${editMode ? '' : 'hidden'}">
        <button class="edit-btn memory-edit" data-type="memory" data-index="${index}" title="Edit">✏️</button>
        <button class="delete-btn memory-delete" data-type="memory" data-index="${index}" title="Delete">🗑️</button>
      </div>
    `;
    container.appendChild(item);
  });
}

// ---------- SECURITY: escape HTML ----------
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- RENDER ALL ----------
function renderAll() {
  renderNotes();
  renderPhotos();
  renderVideos();
  renderMemories();
  applyEditModeVisibility();
}

// ---------- EDIT MODE ----------
function applyEditModeVisibility() {
  const actionCols = document.querySelectorAll('.action-col');
  const memoryActions = document.querySelectorAll('.memory-actions');
  const addForms = document.querySelectorAll('.add-form');
  const editStatus = document.getElementById('editStatus');
  const toggleBtn = document.getElementById('toggleEditMode');

  if (editMode) {
    actionCols.forEach(el => el.classList.remove('hidden'));
    memoryActions.forEach(el => el.classList.remove('hidden'));
    addForms.forEach(el => el.classList.remove('hidden'));
    if (editStatus) editStatus.textContent = '✏️ Edit mode ON';
    if (toggleBtn) {
      toggleBtn.textContent = '👁️ Switch to View Mode';
      toggleBtn.classList.add('active');
    }
  } else {
    actionCols.forEach(el => el.classList.add('hidden'));
    memoryActions.forEach(el => el.classList.add('hidden'));
    addForms.forEach(el => el.classList.add('hidden'));
    if (editStatus) editStatus.textContent = 'Viewing only';
    if (toggleBtn) {
      toggleBtn.textContent = '✏️ Enable Edit Mode';
      toggleBtn.classList.remove('active');
    }
  }
}

function setupEditToggle() {
  const btn = document.getElementById('toggleEditMode');
  if (!btn) return;
  btn.addEventListener('click', () => {
    editMode = !editMode;
    renderAll();
  });
}

// ---------- ADD HANDLERS ----------
function setupAddForms() {
  // Add Note
  const addNoteForm = document.getElementById('addNoteForm');
  if (addNoteForm) {
    addNoteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('noteText').value.trim();
      const from = document.getElementById('noteFrom').value.trim() || '— me';
      if (!text) return;
      notesData.push({ text, date: from });
      saveData(STORAGE_KEYS.notes, notesData);
      addNoteForm.reset();
      renderNotes();
      showToast('Note added! 💌');
    });
  }

  // Add Photo
  const addPhotoForm = document.getElementById('addPhotoForm');
  if (addPhotoForm) {
    addPhotoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const src = document.getElementById('photoSrc').value.trim();
      const caption = document.getElementById('photoCaption').value.trim();
      if (!src || !caption) return;
      photosData.push({ src, caption });
      saveData(STORAGE_KEYS.photos, photosData);
      addPhotoForm.reset();
      renderPhotos();
      showToast('Photo added! 📸');
    });
  }

  // Add Video
  const addVideoForm = document.getElementById('addVideoForm');
  if (addVideoForm) {
    addVideoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const src = document.getElementById('videoSrc').value.trim();
      const poster = document.getElementById('videoPoster').value.trim();
      const note = document.getElementById('videoNote').value.trim();
      const description = document.getElementById('videoDesc').value.trim();
      if (!src || !note || !description) return;
      videosData.push({ src, poster, note, description });
      saveData(STORAGE_KEYS.videos, videosData);
      addVideoForm.reset();
      renderVideos();
      showToast('Video added! 🎬');
    });
  }

  // Add Memory
  const addMemoryForm = document.getElementById('addMemoryForm');
  if (addMemoryForm) {
    addMemoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('memoryText').value.trim();
      const date = document.getElementById('memoryDate').value.trim();
      if (!text || !date) return;
      memoriesData.push({ text, date });
      saveData(STORAGE_KEYS.memories, memoriesData);
      addMemoryForm.reset();
      renderMemories();
      showToast('Memory added! 🧸');
    });
  }
}

// ---------- EDIT / DELETE HANDLER ----------
function editEntry(type, index) {
  if (type === 'note') {
    const current = notesData[index];
    if (!current) return;
    const nextText = window.prompt('Edit your sweet note:', current.text || '');
    if (nextText === null) return;
    const nextFrom = window.prompt('Edit who it is from:', current.date || '');
    if (nextFrom === null) return;
    notesData[index] = {
      text: nextText.trim() || current.text,
      date: nextFrom.trim() || current.date
    };
    saveData(STORAGE_KEYS.notes, notesData);
    renderNotes();
    showToast('Note updated! 💌');
    return;
  }

  if (type === 'photo') {
    const current = photosData[index];
    if (!current) return;
    const nextSrc = window.prompt('Edit image URL:', current.src || '');
    if (nextSrc === null) return;
    const nextCaption = window.prompt('Edit caption:', current.caption || '');
    if (nextCaption === null) return;
    photosData[index] = {
      src: nextSrc.trim() || current.src,
      caption: nextCaption.trim() || current.caption
    };
    saveData(STORAGE_KEYS.photos, photosData);
    renderPhotos();
    showToast('Photo updated! 📸');
    return;
  }

  if (type === 'video') {
    const current = videosData[index];
    if (!current) return;
    const nextSrc = window.prompt('Edit video URL:', current.src || '');
    if (nextSrc === null) return;
    const nextPoster = window.prompt('Edit poster image URL:', current.poster || '');
    if (nextPoster === null) return;
    const nextNote = window.prompt('Edit short note:', current.note || '');
    if (nextNote === null) return;
    const nextDescription = window.prompt('Edit description:', current.description || '');
    if (nextDescription === null) return;
    videosData[index] = {
      src: nextSrc.trim() || current.src,
      poster: nextPoster.trim() || current.poster,
      note: nextNote.trim() || current.note,
      description: nextDescription.trim() || current.description
    };
    saveData(STORAGE_KEYS.videos, videosData);
    renderVideos();
    showToast('Video updated! 🎬');
    return;
  }

  if (type === 'memory') {
    const current = memoriesData[index];
    if (!current) return;
    const nextText = window.prompt('Edit memory:', current.text || '');
    if (nextText === null) return;
    const nextDate = window.prompt('Edit date:', current.date || '');
    if (nextDate === null) return;
    memoriesData[index] = {
      text: nextText.trim() || current.text,
      date: nextDate.trim() || current.date
    };
    saveData(STORAGE_KEYS.memories, memoriesData);
    renderMemories();
    showToast('Memory updated! 🧸');
  }
}

function setupDeleteHandler() {
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
      const type = editBtn.dataset.type;
      const index = parseInt(editBtn.dataset.index, 10);
      if (!isNaN(index)) {
        editEntry(type, index);
      }
      return;
    }

    const btn = e.target.closest('.delete-btn');
    if (!btn) return;

    const type = btn.dataset.type;
    const index = parseInt(btn.dataset.index, 10);
    if (isNaN(index)) return;

    let itemName = 'item';
    if (type === 'note') itemName = 'note';
    else if (type === 'photo') itemName = 'photo';
    else if (type === 'video') itemName = 'video';
    else if (type === 'memory') itemName = 'memory';

    if (!confirm(`Delete this ${itemName}? 🥺`)) return;

    if (type === 'note') {
      notesData.splice(index, 1);
      saveData(STORAGE_KEYS.notes, notesData);
      renderNotes();
    } else if (type === 'photo') {
      photosData.splice(index, 1);
      saveData(STORAGE_KEYS.photos, photosData);
      renderPhotos();
    } else if (type === 'video') {
      videosData.splice(index, 1);
      saveData(STORAGE_KEYS.videos, videosData);
      renderVideos();
    } else if (type === 'memory') {
      memoriesData.splice(index, 1);
      saveData(STORAGE_KEYS.memories, memoriesData);
      renderMemories();
    }

    showToast(`${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted.`);
  });
}

// ---------- TOAST ----------
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// ---------- LOGIN HANDLER (Monthsary) ----------
const ACCEPTED_FORMATS = [
  '10-04-26', '10-4-26', '100426', '10/04/26', '10/4/26', '10.04.26', '10.4.26'
];

function handleLogin(event) {
  event.preventDefault();

  const passwordInput = document.getElementById('password');
  const feedback = document.getElementById('loginFeedback');
  const loginShell = document.getElementById('loginShell');
  const contentShell = document.getElementById('contentShell');

  if (!passwordInput || !feedback || !loginShell || !contentShell) return;

  const entered = passwordInput.value.trim();

  if (!entered) {
    feedback.textContent = 'Please enter our monthsary 🥺';
    feedback.classList.remove('success');
    return;
  }

  const normalized = entered.replace(/[\/\.\s]/g, '-');

  if (ACCEPTED_FORMATS.includes(entered) || ACCEPTED_FORMATS.includes(normalized)) {
    feedback.textContent = 'Welcome, my love! 💖';
    feedback.classList.add('success');

    setTimeout(() => {
      loginShell.classList.add('hidden');
      contentShell.classList.remove('hidden');
      contentShell.classList.add('show');
    }, 500);
    return;
  }

  feedback.textContent = 'Hmm, that\'s not our monthsary 🥺 Try again?';
  feedback.classList.remove('success');
  passwordInput.value = '';
  passwordInput.focus();
}

// ---------- INITIALIZE ----------
document.addEventListener('DOMContentLoaded', () => {
  createFloatingHearts();
  renderAll();
  setupEditToggle();
  setupAddForms();
  setupDeleteHandler();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
});