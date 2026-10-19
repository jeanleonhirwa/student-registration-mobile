import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { fail } from '../utils/response.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB (keep in sync with Frontend/src/lib/upload.ts)
const ALLOWED_EXT = [
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.txt', '.zip',
  '.png', '.jpg', '.jpeg', '.webp', '.heic',
];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  // Random names keep uploaded files unguessable and avoid collisions.
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error(`File type not allowed. Allowed: ${ALLOWED_EXT.join(', ')}`));
    }
    return cb(null, true);
  },
});

/**
 * Accept an optional single "file" field; turn upload errors into 400 responses.
 * On an error the rest of the request body is read (and discarded) before replying, because
 * mobile HTTP clients report "network request failed" if the server answers mid-upload.
 */
const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 10 MB)' : err.message;

    let replied = false;
    const reply = () => {
      if (replied) return;
      replied = true;
      fail(res, 400, message);
    };
    req.on('end', reply);
    req.on('close', reply);
    req.resume();
    // Safety net so a stalled client cannot hang the response forever.
    setTimeout(reply, 15000).unref();
  });
};

export { uploadSingle, UPLOAD_DIR };
