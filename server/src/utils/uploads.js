const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { AppError } = require("./errors");

const PRIVATE_DIR = path.resolve(
  __dirname,
  "../../",
  process.env.UPLOAD_DIR || "private_uploads"
);
const PUBLIC_DIR = path.resolve(__dirname, "../../public/uploads");

// Ensure directories exist
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

function randomFileName(origName) {
  const ext = path.extname(origName).toLowerCase();
  const hex = crypto.randomBytes(16).toString("hex");
  return `${hex}${ext}`;
}

const billStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PRIVATE_DIR),
  filename: (req, file, cb) => cb(null, randomFileName(file.originalname)),
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PUBLIC_DIR),
  filename: (req, file, cb) => cb(null, randomFileName(file.originalname)),
});

const billFileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, "Only PDF, JPEG, PNG, or WEBP documents are permitted."));
  }
};

const imageFileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, "Only JPEG, PNG, WEBP, or GIF images are permitted."));
  }
};

const uploadBill = multer({
  storage: billStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: billFileFilter,
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter,
});

module.exports = {
  PRIVATE_DIR,
  PUBLIC_DIR,
  uploadBill,
  uploadImage,
};
