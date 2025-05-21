const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const authMiddleware = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheByPattern } = require('../config/redis');

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes

// GET campaign statistics with Redis caching
router.get('/stats', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const stats = await Campaign.aggregate([
            {
                $facet: {
                    totalStats: [
                        {
                            $group: {
                                _id: null,
                                totalCampaigns: { $sum: 1 },
                                totalMessages: { $sum: '$totalMessages' },
                                totalSuccessful: { $sum: '$successfulMessages' },
                                totalFailed: { $sum: '$failedMessages' }
                            }
                        }
                    ],
                    successRates: [
                        {
                            $group: {
                                _id: null,
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
                    ]
                }
            }
        ]);

        const result = {
            ...stats[0].totalStats[0],
            averageSuccessRate: stats[0].successRates[0]?.averageSuccessRate || 0
        };

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaign statistics', error: error.message });
    }
});

// GET campaigns by date range with Redis caching
router.get('/date-range', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
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
        .select('name totalMessages successfulMessages failedMessages successRate status createdAt')
        .sort({ createdAt: -1 })
        .hint({ createdAt: -1 })
        .lean()
        .exec();

        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaigns by date range', error: error.message });
    }
});

// GET all campaigns with Redis caching and pagination
router.get('/', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [campaigns, total] = await Promise.all([
            Campaign.find()
                .select('name totalMessages successfulMessages failedMessages successRate status createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .hint({ createdAt: -1 })
                .lean()
                .exec(),
            Campaign.countDocuments().lean().exec()
        ]);

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
router.get('/:id', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const campaign = await Campaign.findById(req.params.id)
            .lean()
            .exec();

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        res.json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching campaign', error: error.message });
    }
});

// POST new campaign with cache invalidation
router.post('/', authMiddleware(), async (req, res) => {
    try {
        const campaign = new Campaign(req.body);
        await campaign.save();
        
        // Clear all campaign-related caches
        await clearCacheByPattern('cache:/api/campaigns*');
        
        res.status(201).json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error creating campaign', error: error.message });
    }
});

// PUT update campaign with cache invalidation
router.put('/:id', authMiddleware(), async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Clear all campaign-related caches
        await clearCacheByPattern('cache:/api/campaigns*');
        
        res.json(campaign);
    } catch (error) {
        res.status(500).json({ message: 'Error updating campaign', error: error.message });
    }
});

// DELETE campaign with cache invalidation
router.delete('/:id', authMiddleware(), async (req, res) => {
    try {
        const campaign = await Campaign.findByIdAndDelete(req.params.id);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Clear all campaign-related caches
        await clearCacheByPattern('cache:/api/campaigns*');
        
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting campaign', error: error.message });
    }
});

module.exports = router; 