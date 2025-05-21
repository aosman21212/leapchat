const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Simple test route


// Convert image to Base64
router.post('/tobase64', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No image file provided. Please upload an image file.' 
            });
        }

        // Check if the file is an image
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid file type. Please upload an image file.' 
            });
        }

        const base64String = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const base64Data = `data:${mimeType};base64,${base64String}`;

        res.json({
            success: true,
            data: {
                base64: base64Data,
                mimeType: mimeType,
                fileName: req.file.originalname,
                fileSize: req.file.size
            }
        });
    } catch (error) {
        console.error('Error converting image to base64:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to convert image to base64' 
        });
    }
});



console.log('Image routes registered:', router.stack.map(r => r.route?.path).filter(Boolean));

module.exports = router; 