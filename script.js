const collectionKeys = {
	notes: 'birthday_gift_notes',
	pictures: 'birthday_gift_pictures',
	videos: 'birthday_gift_videos',
	memories: 'birthday_gift_memories'
};

const emptyMessages = {
	notes: 'No notes yet. Add the first little love note.',
	pictures: 'No pictures yet. Add a favorite moment.',
	videos: 'No videos yet. Save a tiny movie moment.',
	memories: 'No memories yet. Start with a favorite story.'
};

function loadEntries(kind) {
	try {
		const entries = JSON.parse(localStorage.getItem(collectionKeys[kind]) || '[]');
		return Array.isArray(entries) ? entries : [];
	} catch {
		return [];
	}
}

const collections = Object.fromEntries(
	Object.keys(collectionKeys).map((kind) => [kind, loadEntries(kind)])
);

let activeNoteIndex = null;

function saveEntries(kind) {
	try {
		const entries = kind === 'pictures' ? collections.pictures.filter((entry) => !entry.databaseId) : collections[kind];
		localStorage.setItem(collectionKeys[kind], JSON.stringify(entries));
	} catch {
		showToast('Could not save this item in your browser.');
	}
}

function openPictureDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open('birthday_gift_picture_store', 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore('pictures', { keyPath: 'id', autoIncrement: true });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function getSavedPictures(database) {
	return new Promise((resolve, reject) => {
		const request = database.transaction('pictures').objectStore('pictures').getAll();
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function storePicture(database, picture) {
	return new Promise((resolve, reject) => {
		const transaction = database.transaction('pictures', 'readwrite');
		const request = transaction.objectStore('pictures').add(picture);
		let id;
		request.onsuccess = () => { id = request.result; };
		transaction.oncomplete = () => resolve(id);
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error || new Error('Picture save was cancelled.'));
	});
}

function deleteSavedPicture(id) {
	return openPictureDatabase().then((database) => new Promise((resolve, reject) => {
		const transaction = database.transaction('pictures', 'readwrite');
		transaction.objectStore('pictures').delete(id);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
	}));
}

async function compressPicture(file) {
	const image = await createImageBitmap(file);
	const maxDimension = 1100;
	const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(image.width * scale);
	canvas.height = Math.round(image.height * scale);
	canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
	image.close();
	const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
	if (!blob) throw new Error('This image could not be resized.');
	return blob;
}

async function loadSavedPictures() {
	try {
		const database = await openPictureDatabase();
		const savedPictures = await getSavedPictures(database);
		savedPictures.forEach((picture) => {
			collections.pictures.push({
				databaseId: picture.id,
				url: URL.createObjectURL(picture.blob),
				caption: picture.caption
			});
		});
		renderCollection('pictures');
	} catch (error) {
		console.warn('Could not load saved pictures:', error);
	}
}

function makeElement(tagName, className, text) {
	const element = document.createElement(tagName);
	if (className) element.className = className;
	if (text !== undefined) element.textContent = text;
	return element;
}

function renderCollection(kind) {
	const container = document.getElementById(`${kind}List`);
	if (!container) return;
	container.replaceChildren();

	if (collections[kind].length === 0) {
		container.append(makeElement('p', 'empty-state', emptyMessages[kind]));
		return;
	}

	collections[kind].forEach((entry, index) => {
		const card = makeElement('article', `entry-card ${kind}-card`);
		const itemNames = { notes: 'note', pictures: 'picture', videos: 'video', memories: 'memory' };
		const removeButton = makeElement('button', 'remove-button', '×');
		removeButton.type = 'button';
		removeButton.dataset.kind = kind;
		removeButton.dataset.index = String(index);
		removeButton.setAttribute('aria-label', `Remove ${itemNames[kind]}`);

		// ---- NOTES: open the full note in a compact dialog ----
		if (kind === 'notes') {
			card.classList.add('note-row');
			const toggle = makeElement('button', 'note-open-button');
			toggle.type = 'button';
			toggle.setAttribute('aria-haspopup', 'dialog');
			const preview = (entry.text || '').replace(/\s+/g, ' ').trim() || 'A note for you';
			toggle.append(
				makeElement('span', 'note-row-preview', preview),
				makeElement('span', 'note-row-arrow', '↗')
			);
			toggle.addEventListener('click', () => openNote(index));
			card.append(toggle, removeButton);
			container.append(card);
			return;
		}

		// ---- All other kinds: original card layout ----
		const heading = makeElement('div', 'entry-card-heading');
		const cardTitle = kind === 'memories' ? (entry.date || 'A sweet memory') : entry.caption;
		const title = makeElement('h3', '', cardTitle);
		heading.append(title, removeButton);
		card.append(heading);

		if (kind === 'pictures') {
			const image = makeElement('img', 'entry-image');
			image.src = entry.url;
			image.alt = entry.caption || 'A favorite picture';
			image.loading = 'lazy';
			card.insertBefore(image, heading);
		} else if (kind === 'videos') {
			const video = makeElement('video', 'entry-video');
			video.src = entry.url;
			video.controls = true;
			video.preload = 'metadata';
			card.insertBefore(video, heading);
		} else {
			card.append(makeElement('p', 'entry-copy', entry.text));
			if (entry.date) card.append(makeElement('p', 'entry-byline', entry.date));
		}
		container.append(card);
	});
}

function showToast(message) {
	const toast = document.getElementById('toast');
	toast.textContent = message;
	toast.classList.add('show');
	window.clearTimeout(showToast.timeoutId);
	showToast.timeoutId = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function setScreen(screenId) {
	document.querySelectorAll('.screen').forEach((screen) => {
		screen.classList.toggle('hidden', screen.id !== screenId);
	});
	const activeScreen = document.getElementById(screenId);
	activeScreen.classList.remove('screen-enter');
	void activeScreen.offsetWidth;
	activeScreen.classList.add('screen-enter');
}

function selectTab(kind) {
	document.querySelectorAll('.tab-button').forEach((tab) => {
		const selected = tab.dataset.view === kind;
		tab.classList.toggle('active', selected);
		tab.setAttribute('aria-selected', String(selected));
		tab.tabIndex = selected ? 0 : -1;
	});

	document.querySelectorAll('[data-panel]').forEach((panel) => {
		const selected = panel.dataset.panel === kind;
		panel.hidden = !selected;
		panel.classList.toggle('hidden', !selected);
	});
}

function setupCodeForm() {
	const inputs = [...document.querySelectorAll('.code-box')];
	const message = document.getElementById('codeMessage');

	inputs.forEach((input, index) => {
		input.addEventListener('input', () => {
			input.value = input.value.replace(/\D/g, '').slice(-1);
			if (input.value && index < inputs.length - 1) inputs[index + 1].focus();
		});
		input.addEventListener('keydown', (event) => {
			if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
			if (event.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
			if (event.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
		});
		input.addEventListener('paste', (event) => {
			const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, inputs.length);
			if (!pasted) return;
			event.preventDefault();
			[...pasted].forEach((digit, digitIndex) => { inputs[digitIndex].value = digit; });
			inputs[Math.min(pasted.length, inputs.length - 1)].focus();
		});
	});

	document.getElementById('codeForm').addEventListener('submit', (event) => {
		event.preventDefault();
		const enteredCode = inputs.map((input) => input.value).join('');
		if (enteredCode !== '100426') {
			message.textContent = 'Not quite, try that special date again ♡';
			inputs.forEach((input) => { input.value = ''; });
			inputs[0].focus();
			return;
		}
		message.textContent = '';
		document.getElementById('grantModal').classList.remove('hidden');
		document.getElementById('proceedButton').focus();
	});
}

function setupProceedButton() {
	document.getElementById('proceedButton').addEventListener('click', () => {
		document.getElementById('grantModal').classList.add('hidden');
		setScreen('keepsakeScreen');
		selectTab('notes');
		renderAllCollections();
	});
}

function setupBackButton() {
	const backButton = document.getElementById('backButton');
	if (!backButton) return;
	backButton.addEventListener('click', () => {
		setScreen('accessScreen');
		const inputs = [...document.querySelectorAll('.code-box')];
		inputs.forEach((input) => { input.value = ''; });
		document.getElementById('codeMessage').textContent = '';
		inputs[0]?.focus();
	});
}

function openNote(index) {
	const note = collections.notes[index];
	if (!note) return;
	activeNoteIndex = index;
	document.getElementById('noteDialogMessage').textContent = note.text || '';
	const from = note.from || note.date || '';
	const attribution = document.getElementById('noteDialogFrom');
	attribution.textContent = from ? `With love, ${from}` : '';
	attribution.classList.toggle('hidden', !from);
	document.getElementById('noteReadView').classList.remove('hidden');
	document.getElementById('noteEditForm').classList.add('hidden');
	document.getElementById('editNoteButton').classList.remove('hidden');
	const dialog = document.getElementById('noteDialog');
	if (!dialog.open) dialog.showModal();
}

function setupNoteDialog() {
	const dialog = document.getElementById('noteDialog');
	const editButton = document.getElementById('editNoteButton');
	const editForm = document.getElementById('noteEditForm');
	const readView = document.getElementById('noteReadView');

	editButton.addEventListener('click', () => {
		const note = collections.notes[activeNoteIndex];
		if (!note) return;
		document.getElementById('editNoteText').value = note.text || '';
		document.getElementById('editNoteFrom').value = note.from || note.date || '';
		readView.classList.add('hidden');
		editForm.classList.remove('hidden');
		editButton.classList.add('hidden');
		document.getElementById('editNoteText').focus();
	});

	document.getElementById('cancelNoteEdit').addEventListener('click', () => {
		editForm.classList.add('hidden');
		readView.classList.remove('hidden');
		editButton.classList.remove('hidden');
	});

	editForm.addEventListener('submit', (event) => {
		event.preventDefault();
		const note = collections.notes[activeNoteIndex];
		const text = document.getElementById('editNoteText').value.trim();
		if (!note || !text) return;
		note.text = text;
		note.from = document.getElementById('editNoteFrom').value.trim();
		delete note.date;
		saveEntries('notes');
		renderCollection('notes');
		openNote(activeNoteIndex);
		showToast('Note updated ♡');
	});

	document.getElementById('closeNoteButton').addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close();
	});
	dialog.addEventListener('close', () => {
		activeNoteIndex = null;
		editForm.reset();
		editForm.classList.add('hidden');
		readView.classList.remove('hidden');
		editButton.classList.remove('hidden');
	});
}

function safeMediaUrl(value) {
	try {
		const url = new URL(value);
		return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
	} catch {
		return '';
	}
}

function setupCollections() {
	document.querySelectorAll('.tab-button').forEach((tab, index, tabs) => {
		tab.addEventListener('click', () => selectTab(tab.dataset.view));
		tab.addEventListener('keydown', (event) => {
			if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
			event.preventDefault();
			const offset = event.key === 'ArrowRight' ? 1 : -1;
			const nextTab = tabs[(index + offset + tabs.length) % tabs.length];
			selectTab(nextTab.dataset.view);
			nextTab.focus();
		});
	});

	document.querySelectorAll('[data-add]').forEach((button) => {
		button.addEventListener('click', () => {
			const form = document.getElementById(button.dataset.add);
			form.classList.toggle('hidden');
			if (!form.classList.contains('hidden')) {
				const fileInput = form.querySelector('input[type="file"]');
				if (fileInput) {
					fileInput.focus();
					fileInput.click();
				} else {
					form.querySelector('input, textarea')?.focus();
				}
			}
		});
	});

	document.querySelectorAll('.entry-form').forEach((form) => {
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const kind = form.dataset.kind;
			const values = Object.fromEntries(new FormData(form));
			if (kind === 'pictures') {
				const files = [...form.querySelector('[name="files"]').files];
				const caption = values.caption.trim();
				const submitButton = form.querySelector('[type="submit"]');
				let added = 0;
				submitButton.disabled = true;
				try {
					const database = await openPictureDatabase();
					for (const file of files) {
						const blob = await compressPicture(file);
						const savedCaption = caption || file.name.replace(/\.[^.]+$/, '');
						const databaseId = await storePicture(database, { blob, caption: savedCaption });
						collections.pictures.push({ databaseId, blob, url: URL.createObjectURL(blob), caption: savedCaption });
						added++;
					}
					form.reset();
					form.classList.add('hidden');
					renderCollection('pictures');
					showToast(`Added ${added} picture${added === 1 ? '' : 's'} ♡`);
				} catch (error) {
					console.warn('Could not add pictures:', error);
					if (added) {
						form.reset();
						form.classList.add('hidden');
						renderCollection('pictures');
					}
					showToast(added ? `Added ${added}; one or more pictures could not be saved.` : 'Could not save those pictures. Try smaller files.');
				} finally {
					submitButton.disabled = false;
				}
				return;
			}
			if (kind === 'videos') {
				values.url = safeMediaUrl(values.url);
				if (!values.url) {
					showToast('Please use a valid http or https media link.');
					return;
				}
			}
			collections[kind].push(values);
			saveEntries(kind);
			form.reset();
			form.classList.add('hidden');
			renderCollection(kind);
			showToast('Added to your keepsakes ♡');
		});
	});

	document.addEventListener('click', (event) => {
		const button = event.target.closest('.remove-button');
		if (!button) return;
		const { kind, index } = button.dataset;
		const entry = collections[kind][Number(index)];
		if (kind === 'pictures' && entry.databaseId) {
			deleteSavedPicture(entry.databaseId).catch((error) => console.warn('Could not delete saved picture:', error));
		}
		collections[kind].splice(Number(index), 1);
		saveEntries(kind);
		renderCollection(kind);
	});
}

function renderAllCollections() {
	Object.keys(collectionKeys).forEach(renderCollection);
}

document.addEventListener('DOMContentLoaded', () => {
	setupCodeForm();
	setupProceedButton();
	setupBackButton();
	setupNoteDialog();
	setupCollections();
	loadSavedPictures();
});