const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: roomCode-playerId-replikId.webm
    const uniqueName = `${req.body.roomCode}-${req.body.playerId}-${req.body.replikId}-${Date.now()}.webm`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post('/', upload.single('audio'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }
    
    res.json({ 
      success: true, 
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload audio.' });
  }
});

module.exports = router;
