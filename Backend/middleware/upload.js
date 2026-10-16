const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { fail } = require('../utils/response');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip', '.png', '.jpg', '.jpeg'];

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

/** Accept an optional single "file" field; turn upload errors into 400 responses. */
const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 10 MB)' : err.message;
    return fail(res, 400, message);
  });
};

module.exports = { uploadSingle, UPLOAD_DIR };
