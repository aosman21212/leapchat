const express = require('express');
const router = express.Router();
const axios = require('axios');
const xlsx = require('xlsx');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const Campaign = require('../models/Campaign');
const { cacheMiddleware, clearCacheByPattern } = require('../utils/redisCache');

const authMiddleware = require('../middleware/authMiddleware');

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

// Helper function to create delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to validate edit ID format
const isValidEditId = (edit) => {
    if (!edit) return false;
    const pattern = /^[A-Za-z0-9._]{4,23}-[A-Za-z0-9._]{4,14}(-[A-Za-z0-9._]{4,10})?(-[A-Za-z0-9._]{4,10})?$/;
    return pattern.test(edit);
};

// Helper function to validate phone number format
const isValidPhoneNumber = (number) => {
    // Pattern from API error message: ^[\d-]{10,31}(@[\w\.]{1,})?$
    const pattern = /^[\d-]{10,31}(@[\w\.]{1,})?$/;
    return pattern.test(number);
};

// GET endpoint to check campaign status (deprecated)
router.get('/status', authMiddleware(), (req, res) => {
    res.status(404).json({
        success: false,
        message: 'This endpoint has been removed. Please use /api/bulk/campaigns to get campaign information.'
    });
});

// Direct bulk message sending
router.post('/bulk', authMiddleware(), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an Excel file' });
        }

        // Get campaign name from request body or use default
        const campaignName = req.body.campaignName || `Campaign_${new Date().toISOString()}`;

        console.log('File received:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Read the Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        console.log('Workbook sheets:', workbook.SheetNames);

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Convert to JSON with header row
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Raw Excel data:', JSON.stringify(data, null, 2));
        
        // Get headers from first row
        const headers = data[0].map(header => header.toLowerCase().trim());
        console.log('Found headers:', headers);
        
        // Check if required columns exist
        const requiredColumns = ['to'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
            console.log('Missing columns:', missingColumns);
            return res.status(400).json({ 
                message: `Missing required columns: ${missingColumns.join(', ')}`,
                foundHeaders: headers,
                rawData: data
            });
        }

        // Convert data to objects with proper headers
        const messages = data.slice(1)
            .map(row => {
                const message = {};
                headers.forEach((header, index) => {
                    message[header] = row[index] || '';
                });
                return message;
            })
            .filter(row => {
                // Skip rows where all fields are empty
                return Object.values(row).some(value => value !== '');
            });

        console.log('Processed messages:', JSON.stringify(messages, null, 2));

        // Validate we have data
        if (messages.length === 0) {
            return res.status(400).json({ message: 'No valid messages found in Excel file' });
        }

        // Process each message
        const results = [];
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            try {
                // Skip if 'to' field is empty
                if (!message.to || message.to.trim() === '') {
                    console.log('Skipping row with empty "to" field');
                    continue;
                }

                // Add 5 second delay between messages (except for the first message)
                if (i > 0) {
                    await delay(5000); // 5 seconds delay
                }

                // Make request to WHAPI.cloud
                const response = await axios.post(
                    'https://gate.whapi.cloud/messages/image',
                    {
                        to: message.to,
                        media: message.media || "",
                        caption: message.caption || "",
                        ...(message.edit && { edit: message.edit })
                    },
                    {
                        headers: {
                            'accept': 'application/json',
                            'authorization': `Bearer ${process.env.WHAPI_KEY}`,
                            'content-type': 'application/json'
                        }
                    }
                );

                results.push({
                    to: message.to,
                    status: 'success',
                    response: response.data
                });
                successCount++;
            } catch (error) {
                console.error('Error sending message:', {
                    to: message.to,
                    error: error.message,
                    response: error.response?.data
                });
                results.push({
                    to: message.to,
                    status: 'error',
                    error: error.response?.data || error.message
                });
                failureCount++;
            }
        }

        // Create campaign record
        const campaign = new Campaign({
            name: campaignName,
            totalMessages: messages.length,
            successfulMessages: successCount,
            failedMessages: failureCount,
            successRate: `${((successCount / messages.length) * 100).toFixed(2)}%`,
            results: results
        });

        await campaign.save();

        // Clear relevant caches
        await clearCacheByPattern('bulk:*');

        res.status(200).json({
            success: true,
            message: 'Bulk messages sent successfully',
            campaignId: campaign._id,
            statistics: {
                total: messages.length,
                successful: successCount,
                failed: failureCount,
                successRate: `${((successCount / messages.length) * 100).toFixed(2)}%`
            },
            results: results
        });
    } catch (error) {
        console.error('Error sending bulk messages:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: error.message });
    }
});

// GET endpoint to retrieve campaign details
router.get('/campaign/:id', authMiddleware(), cacheMiddleware('bulk:campaign', CACHE_DURATION), async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id).lean();
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(campaign);

    } catch (error) {
        res.status(500).json({ message: 'Error retrieving campaign', error: error.message });
    }
});

// GET endpoint to list all campaigns
router.get('/campaigns', authMiddleware(), cacheMiddleware('bulk:campaigns', CACHE_DURATION), async (req, res) => {
    try {
        const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving campaigns', error: error.message });
    }
});

// POST endpoint to clear bulk message caches
router.post('/clear-cache', authMiddleware(), async (req, res) => {
    try {
        await clearCacheByPattern('bulk:*');
        res.json({ message: 'Bulk message caches cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing caches', error: error.message });
    }
});

module.exports = router; 