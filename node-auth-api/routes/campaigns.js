const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const authMiddleware = require('../middleware/authMiddleware');
const NodeCache = require('node-cache');

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// GET campaign statistics with caching
router.get('/stats', authMiddleware(), async (req, res) => {
    try {
        const cacheKey = 'campaign_stats';
        const cachedStats = cache.get(cacheKey);

        if (cachedStats) {
            return res.json(cachedStats);
        }

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

        const result = stats[0] || {
            totalCampaigns: 0,
            totalMessages: 0,
            totalSuccessful: 0,
            totalFailed: 0,
            averageSuccessRate: 0
        };

        cache.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaign statistics', error: error.message });
    }
});

// GET campaigns by date range with optimized query
router.get('/date-range', authMiddleware(), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        const cacheKey = `campaigns_${startDate}_${endDate}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        const campaigns = await Campaign.find({
            createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        })
        .select('name totalMessages successfulMessages failedMessages successRate status createdAt')
        .sort({ createdAt: -1 })
        .lean();

        cache.set(cacheKey, campaigns);
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns by date range', error: error.message });
    }
});

// GET all campaigns with pagination and optimized query
router.get('/', authMiddleware(), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const cacheKey = `campaigns_page_${page}_limit_${limit}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        const [campaigns, total] = await Promise.all([
            Campaign.find()
                .select('name totalMessages successfulMessages failedMessages successRate status createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Campaign.countDocuments()
        ]);

        const result = {
            campaigns,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

        cache.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns', error: error.message });
    }
});

// GET single campaign by ID with caching
router.get('/:id', authMiddleware(), async (req, res) => {
    try {
        const cacheKey = `campaign_${req.params.id}`;
        const cachedCampaign = cache.get(cacheKey);

        if (cachedCampaign) {
            return res.json(cachedCampaign);
        }

        const campaign = await Campaign.findById(req.params.id).lean();
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        cache.set(cacheKey, campaign);
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaign', error: error.message });
    }
});

module.exports = router; 