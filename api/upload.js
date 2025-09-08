// /api/upload.js
import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'node:fs';

export const config = { api: { bodyParser: false } };

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON env var');
  try { return JSON.parse(raw); }
  catch { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
}

function getAuth() {
  const rt = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim();
  const cid = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const secret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();

  if (rt && cid && secret) {
    const oauth2 = new google.auth.OAuth2(cid, secret);
    oauth2.setCredentials({ refresh_token: rt });
    console.log('AUTH_MODE=oauth');
    return oauth2; // uses YOUR Drive quota
  }

  const sa = parseServiceAccount(); // fallback if OAuth not set
  console.log('AUTH_MODE=service_account');
  return new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024,
      keepExtensions: true,
      uploadDir: '/tmp',
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      let file = files.file;
      if (Array.isArray(file)) file = file[0];
      if (!file) return reject(new Error('No file provided (field name must be "file")'));
      resolve({ fields, file });
    });
  });
}

export default async function handler(req, res) {
  // Robust diag: works even if req.query isn't populated
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, 'http://localhost'); // base ignored on Vercel
      if (url.searchParams.get('diag') === '1') {
        const have = {
          CLIENT_ID: !!process.env.GOOGLE_OAUTH_CLIENT_ID,
          CLIENT_SECRET: !!process.env.GOOGLE_OAUTH_CLIENT_SECRET,
          REFRESH_TOKEN: !!process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
          DRIVE_FOLDER_ID: !!process.env.DRIVE_FOLDER_ID,
        };
        const mode = (have.CLIENT_ID && have.CLIENT_SECRET && have.REFRESH_TOKEN)
          ? 'oauth'
          : 'service_account';
        return res.status(200).json({ ok: true, mode, have });
      }
    } catch (_) {
      // fall through
    }
    return res
      .status(200)
      .send('Uploader live. POST a multipart/form-data with field "file".');
  }

  try {
    const { file } = await parseMultipart(req);
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('Missing DRIVE_FOLDER_ID env var');

    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const path = file.filepath || file.path;
    const mimeType = file.mimetype || 'application/octet-stream';
    const name = file.originalFilename || file.newFilename || 'upload';
    
    const stat = fs.statSync(path);
    const fileModifiedISO = stat.mtime.toISOString();

    console.log('UPLOADING', { folderId, name, mimeType });

    const { data } = await drive.files.create({
      requestBody: {
        name,
        parents: [folderId],
        modifiedTime: fileModifiedISO, // ensure Drive "Last modified" matches the file's mtime
      },
      media: { mimeType, body: fs.createReadStream(path) },
      fields: 'id, name, parents, mimeType, size, webViewLink, modifiedTime',
      supportsAllDrives: true,
    });

    return res.status(200).json({ status: 'ok', file: data });
  } catch (err) {
    console.error('UPLOAD_ERROR', err?.response?.data || err);
    return res.status(400).json({ status: 'error', message: err.message || 'Upload failed' });
  }
}
