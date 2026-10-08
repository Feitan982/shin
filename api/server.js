'use strict';

const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { Readable } = require('node:stream');
const fs = require('node:fs/promises');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');

const PORT = Number(process.env.PORT || 3000);
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/oauth2callback`;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const TOKEN_PATH = path.join(__dirname, '.drive-tokens.json');
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const SESSION_MAX_AGE = 12 * 60 * 60;

const app = express();
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const pendingStates = new Map();
const activeSessions = new Map();

const pictureUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: MAX_UPLOAD_SIZE, files: 10 },
	fileFilter: (request, file, callback) => {
		if (!file.mimetype.startsWith('image/')) {
			callback(new Error('Only image files can be uploaded.'));
			return;
		}
		callback(null, true);
	}
});

app.disable('x-powered-by');

function readCookie(request, name) {
	const prefix = `${name}=`;
	const cookie = (request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
	return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
}

function cookieHeader(name, value, maxAge) {
	return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`;
}

async function saveCredentials(credentials) {
	await fs.writeFile(TOKEN_PATH, JSON.stringify(credentials, null, 2), { mode: 0o600 });
	await fs.chmod(TOKEN_PATH, 0o600);
}

async function loadCredentials() {
	try {
		const saved = JSON.parse(await fs.readFile(TOKEN_PATH, 'utf8'));
		oauth2Client.setCredentials(saved);
	} catch (error) {
		if (error.code !== 'ENOENT') {
			console.error('Could not load saved Google credentials:', error.message);
		}
	}
}

oauth2Client.on('tokens', (tokens) => {
	const credentials = { ...oauth2Client.credentials, ...tokens };
	oauth2Client.setCredentials(credentials);
	void saveCredentials(credentials).catch((error) => {
		console.error('Could not save refreshed Google credentials:', error.message);
	});
});

function requireGoogleConfig(request, response, next) {
	if (!CLIENT_ID || !CLIENT_SECRET) {
		response.status(503).json({ error: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in api/.env.' });
		return;
	}
	next();
}

function requireDrive(request, response, next) {
	if (!oauth2Client.credentials.refresh_token && !oauth2Client.credentials.access_token) {
		response.status(401).json({ error: 'Connect Google Drive first at /auth/google.' });
		return;
	}
	request.drive = google.drive({ version: 'v3', auth: oauth2Client });
	next();
}

function requireSession(request, response, next) {
	const sessionId = readCookie(request, 'drive_session');
	const expiresAt = activeSessions.get(sessionId);
	if (!expiresAt || expiresAt < Date.now()) {
		activeSessions.delete(sessionId);
		response.status(401).json({ error: 'Connect Google Drive first at /auth/google.' });
		return;
	}
	next();
}

app.get('/auth/google', requireGoogleConfig, (request, response) => {
	const state = randomBytes(24).toString('hex');
	const flowId = randomBytes(24).toString('hex');
	pendingStates.set(state, { expiresAt: Date.now() + 10 * 60 * 1000, flowId });
	response.setHeader('Set-Cookie', cookieHeader('oauth_flow', flowId, 600));
	const authorizationUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		prompt: 'consent',
		scope: ['https://www.googleapis.com/auth/drive.file'],
		state
	});
	response.redirect(authorizationUrl);
});

app.get('/oauth2callback', requireGoogleConfig, async (request, response) => {
	const { code, state, error } = request.query;
	const pendingFlow = pendingStates.get(state);
	pendingStates.delete(state);
	if (error) return response.status(400).send('Google Drive authorization was not completed.');
	if (!code || !pendingFlow || pendingFlow.expiresAt < Date.now() || pendingFlow.flowId !== readCookie(request, 'oauth_flow')) {
		return response.status(400).send('This authorization link expired. Start again at /auth/google.');
	}

	try {
		const { tokens } = await oauth2Client.getToken(code);
		const credentials = { ...oauth2Client.credentials, ...tokens };
		oauth2Client.setCredentials(credentials);
		await saveCredentials(credentials);
		const sessionId = randomBytes(32).toString('hex');
		activeSessions.set(sessionId, Date.now() + SESSION_MAX_AGE * 1000);
		response.setHeader('Set-Cookie', [
			cookieHeader('drive_session', sessionId, SESSION_MAX_AGE),
			cookieHeader('oauth_flow', '', 0)
		]);
		response.send('Google Drive connected. You can close this page.');
	} catch (caughtError) {
		console.error('Google OAuth callback failed:', caughtError.message);
		response.status(500).send('Could not connect Google Drive. Check the server logs.');
	}
});

app.get('/api/drive/status', requireSession, (request, response) => {
	response.json({ connected: Boolean(oauth2Client.credentials.refresh_token || oauth2Client.credentials.access_token) });
});

app.get('/api/drive/files', requireSession, requireDrive, async (request, response) => {
	try {
		const query = {
			pageSize: 100,
			orderBy: 'createdTime desc',
			fields: 'files(id,name,mimeType,createdTime,webViewLink,thumbnailLink)',
			q: 'trashed = false'
		};
		if (DRIVE_FOLDER_ID) query.q += ` and '${DRIVE_FOLDER_ID}' in parents`;
		const result = await request.drive.files.list(query);
		response.json(result.data.files || []);
	} catch (error) {
		console.error('Google Drive list failed:', error.message);
		response.status(502).json({ error: 'Could not retrieve files from Google Drive.' });
	}
});

app.post('/api/drive/upload', requireSession, requireDrive, pictureUpload.array('files', 10), async (request, response) => {
	if (!request.files?.length) {
		response.status(400).json({ error: 'Choose at least one image to upload.' });
		return;
	}

	const caption = String(request.body.caption || '').trim();
	const files = [];
	try {
		for (const file of request.files) {
			const originalName = path.basename(file.originalname.replace(/\\/g, '/')) || 'picture';
			const name = caption ? `${caption} - ${originalName}` : originalName;
			const result = await request.drive.files.create({
				requestBody: {
					name,
					mimeType: file.mimetype,
					...(DRIVE_FOLDER_ID ? { parents: [DRIVE_FOLDER_ID] } : {})
				},
				media: { mimeType: file.mimetype, body: Readable.from([file.buffer]) },
				fields: 'id,name,mimeType,createdTime,webViewLink,thumbnailLink'
			});
			files.push(result.data);
		}
		response.status(201).json({ files });
	} catch (error) {
		console.error('Google Drive upload failed:', error.message);
		response.status(502).json({ error: 'Could not upload images to Google Drive.', uploaded: files });
	}
});

app.use((error, request, response, next) => {
	if (error instanceof multer.MulterError) {
		const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
		response.status(status).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 20 MB or smaller.' : error.message });
		return;
	}
	if (error) {
		response.status(400).json({ error: error.message || 'The request could not be processed.' });
		return;
	}
	next();
});

async function start() {
	await loadCredentials();
	app.listen(PORT, '0.0.0.0', () => {
		console.log(`Google Drive API listening on port ${PORT}`);
		console.log(`Authorize this app at http://localhost:${PORT}/auth/google`);
	});
}

if (require.main === module) {
	start().catch((error) => {
		console.error('Could not start the server:', error.message);
		process.exitCode = 1;
	});
}

module.exports = app;
