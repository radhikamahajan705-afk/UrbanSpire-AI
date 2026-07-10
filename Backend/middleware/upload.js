const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist (important on fresh Render deploys)
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', subfolder);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeValid = allowedTypes.test(file.mimetype);
  if (extValid && mimeValid) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpg, png, webp) and PDF files are allowed'));
  }
};

const uploadComplaintImages = multer({
  storage: storage('complaints'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadCertificateDocs = multer({
  storage: storage('certificates'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadComplaintImages, uploadCertificateDocs };
