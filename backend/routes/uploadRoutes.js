const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

const admin = authorize('super_admin', 'admin', 'director');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'omvik/ground-report',
    allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage });

router.post('/', protect, admin, upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image');
  }
  res.status(200).json({
    url: req.file.path,
    message: 'Image uploaded successfully'
  });
});

module.exports = router;
