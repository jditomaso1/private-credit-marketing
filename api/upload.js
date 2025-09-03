// /api/upload.js
import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'node:fs';

export const config = {
  api: { bodyParser: false }, // we'll parse multipart manually
};

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON env var');
  try {
    return JSON.parse(raw);
  } catch {
    // Support base64-encoded secrets too
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }
}

function authClientFromEnv() {
  const creds = parseServiceAccount();
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024,
      keepExtensions: true,
      uploadDir: '/tmp', // safe temp dir in serverless
    });
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      let file = files.file;
      // formidable can return an array depending on version/options
      if (Array.isArray(file)) file = file[0];
      if (!file) return reject(new Error('No file provided (field name must be "file")'));
      resolve({ fields, file });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(200)
      .send('Uploader live. POST a multipart/form-data with field "file".');
  }

  try {
    const { file } = await parseMultipart(req);
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('Missing DRIVE_FOLDER_ID env var');

    const auth = authClientFromEnv();
    await auth.authorize();
    const drive = google.drive({ version: 'v3', auth });

    const path = file.filepath || file.path; // v3 uses .filepath
    const mimeType = file.mimetype || 'application/octet-stream';
    const name = file.originalFilename || file.newFilename || 'upload';

    const { data } = await drive.files.create({
      requestBody: { name, parents: [folderId] },
      media: { mimeType, body: fs.createReadStream(path) },
      fields: 'id, name, parents, mimeType, size, webViewLink',
      supportsAllDrives: true,
    });

    return res.status(200).json({ status: 'ok', file: data });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      status: 'error',
      message: err.message || 'Upload failed',
    });
  }
}
