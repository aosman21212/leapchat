const express = require('express');
const router = express.Router();
const axios = require('axios');
const Campaign = require('../models/Campaign');
const authMiddleware = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheByPattern } = require('../config/redis');

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes

// POST endpoint to send an image message with cache invalidation
router.post('/image', authMiddleware(), async (req, res) => {
    try {
        const { to, media, caption, edit } = req.body;

        // Validate required fields
        if (!to) {
            return res.status(400).json({ 
                message: 'Recipient (to) is required' 
            });
        }

        // Prepare request body, only include edit if it's not empty
        const requestBody = {
            to,
            media: media || "",
            caption: caption || ""
        };

        // Only add edit field if it exists and is not empty
        if (edit && edit.trim() !== '') {
            requestBody.edit = edit;
        }

        // Make request to WHAPI.cloud
        const response = await axios.post(
            'https://gate.whapi.cloud/messages/image',
            requestBody,
            {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${process.env.WHAPI_KEY}`,
                    'content-type': 'application/json'
                }
            }
        );

        // Create campaign record for single message
        const campaign = new Campaign({
            name: `Single Message ${new Date().toISOString()}`,
            totalMessages: 1,
            successfulMessages: 1,
            failedMessages: 0,
            successRate: '100%',
            results: [{
                to: to,
                status: 'success',
                response: response.data
            }]
        });

        await campaign.save();

        // Clear campaign-related caches
        await clearCacheByPattern('cache:/api/create-message/campaigns*');

        // Return the response with campaign ID
        res.json({
            ...response.data,
            campaignId: campaign._id
        });

    } catch (error) {
        console.error('Error sending image message:', error.response?.data || error.message);

        // Create campaign record for failed message
        try {
            const campaign = new Campaign({
                name: `Failed Single Message ${new Date().toISOString()}`,
                totalMessages: 1,
                successfulMessages: 0,
                failedMessages: 1,
                successRate: '0%',
                results: [{
                    to: req.body.to,
                    status: 'error',
                    error: error.response?.data || error.message
                }]
            });
            await campaign.save();

            // Clear campaign-related caches even for failed attempts
            await clearCacheByPattern('cache:/api/create-message/campaigns*');
        } catch (dbError) {
            console.error('Error saving failed campaign:', dbError);
        }

        // Handle different types of errors
        if (error.response) {
            res.status(error.response.status).json({
                message: 'Error from WHAPI service',
                error: error.response.data
            });
        } else if (error.request) {
            res.status(500).json({
                message: 'No response received from WHAPI service',
                error: error.message
            });
        } else {
            res.status(500).json({
                message: 'Error setting up the request',
                error: error.message
            });
        }
    }
});

// GET all campaigns with pagination and Redis caching
router.get('/campaigns', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const campaigns = await Campaign.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Campaign.countDocuments();

        res.json({
            campaigns,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
});

// GET single campaign by ID with Redis caching
router.get('/campaign/:id', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id).lean();
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaign', error: error.message });
    }
});

// GET campaigns by date range with Redis caching
router.get('/campaigns/date-range', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        const campaigns = await Campaign.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        })
        .sort({ createdAt: -1 })
        .lean();

        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns by date range', error: error.message });
    }
});

// GET campaign statistics with Redis caching
router.get('/campaigns/stats', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const stats = await Campaign.aggregate([
            {
                $group: {
                    _id: null,
                    totalCampaigns: { $sum: 1 },
                    totalMessages: { $sum: '$totalMessages' },
                    totalSuccessful: { $sum: '$successfulMessages' },
                    totalFailed: { $sum: '$failedMessages' },
                    averageSuccessRate: {
                        $avg: {
                            $toDouble: {
                                $replaceAll: {
                                    input: '$successRate',
                                    find: '%',
                                    replacement: ''
                                }
                            }
                        }
                    }
                }
            }
        ]);

        res.json(stats[0] || {
            totalCampaigns: 0,
            totalMessages: 0,
            totalSuccessful: 0,
            totalFailed: 0,
            averageSuccessRate: 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaign statistics', error: error.message });
    }
});

// Clear message cache
router.post('/clear-cache', authMiddleware(), async (req, res) => {
    try {
        await clearCacheByPattern('cache:/api/create-message/*');
        res.json({ message: 'Message cache cleared successfully' });
    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ message: 'Error clearing message cache' });
    }
});

module.exports = router;
