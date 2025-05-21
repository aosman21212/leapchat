const express = require('express');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheByPattern } = require('../utils/redisCache');

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

// GET newsletter messages (accessible by superadmin and manager)
router.get('/:newsletterId', 
    authMiddleware(['superadmin', 'manager']), 
    cacheMiddleware('newsletter:messages', CACHE_DURATION),
    async (req, res) => {
        try {
            const { newsletterId } = req.params;
            const { count = 100, page = 1 } = req.query;

            // Validate newsletterId
            if (!newsletterId) {
                return res.status(400).json({ message: 'Newsletter ID is required' });
            }

            // Make API request to Whapi
            const response = await axios.get(
                `https://gate.whapi.cloud/messages/list/${newsletterId}?count=${count}`,
                {
                    headers: {
                        'accept': 'application/json',
                        'authorization': `Bearer ${process.env.WHAPI_KEY}`
                    }
                }
            );

            // Process and format the response
            const messages = response.data.messages || [];
            const totalMessages = response.data.total || 0;

            const result = {
                messages,
                pagination: {
                    total: totalMessages,
                    page: parseInt(page),
                    count: parseInt(count),
                    totalPages: Math.ceil(totalMessages / count)
                }
            };

            res.json(result);
        } catch (error) {
            console.error('Error fetching newsletter messages:', error);

            // Handle different types of errors
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                return res.status(error.response.status).json({
                    message: 'Error from Whapi API',
                    error: error.response.data
                });
            } else if (error.request) {
                // The request was made but no response was received
                return res.status(503).json({
                    message: 'No response from Whapi API',
                    error: 'Service unavailable'
                });
            } else {
                // Something happened in setting up the request that triggered an Error
                return res.status(500).json({
                    message: 'Error processing request',
                    error: error.message
                });
            }
        }
    }
);

// GET message statistics (accessible by superadmin and manager)
router.get('/:newsletterId/stats', 
    authMiddleware(['superadmin', 'manager']), 
    cacheMiddleware('newsletter:stats', CACHE_DURATION),
    async (req, res) => {
        try {
            const { newsletterId } = req.params;

            // Get all messages for statistics
            const response = await axios.get(
                `https://gate.whapi.cloud/messages/list/${newsletterId}?count=1000`,
                {
                    headers: {
                        'accept': 'application/json',
                        'authorization': `Bearer ${process.env.WHAPI_KEY}`
                    }
                }
            );

            const messages = response.data.messages || [];

            // Calculate statistics
            const stats = {
                totalMessages: messages.length,
                byStatus: messages.reduce((acc, msg) => {
                    const status = msg.status || 'unknown';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {}),
                byType: messages.reduce((acc, msg) => {
                    const type = msg.type || 'unknown';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {}),
                lastMessageDate: messages.length > 0 ? 
                    new Date(Math.max(...messages.map(m => new Date(m.timestamp)))) : 
                    null
            };

            res.json(stats);
        } catch (error) {
            console.error('Error fetching newsletter statistics:', error);
            res.status(500).json({
                message: 'Error fetching newsletter statistics',
                error: error.message
            });
        }
    }
);

// POST endpoint to clear newsletter message caches
router.post('/clear-cache', authMiddleware(['superadmin', 'manager']), async (req, res) => {
    try {
        await clearCacheByPattern('newsletter:*');
        res.json({ message: 'Newsletter message caches cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing caches', error: error.message });
    }
});

module.exports = router; 