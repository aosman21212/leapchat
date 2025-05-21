const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Channel = require('../models/Channel');
const Campaign = require('../models/Campaign');
const authMiddleware = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheByPattern } = require('../config/redis');

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

// Get dashboard statistics
router.get('/stats', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        // Get total channels
        const totalChannels = await Channel.countDocuments();
        const newChannelsThisMonth = await Channel.countDocuments({
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        });

        // Get active and inactive users
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = await User.countDocuments({ isActive: false });
        const lastMonthUsers = await User.countDocuments({
            isActive: true,
            createdAt: { $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        });
        const userGrowth = lastMonthUsers > 0 ? ((activeUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(0) : 0;

        // Get campaigns
        const totalCampaigns = await Campaign.countDocuments();
        const newCampaignsThisMonth = await Campaign.countDocuments({
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        });

        // Get recent user activity (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        // Get daily active users
        const dailyActiveUsers = await User.countDocuments({
            updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        // Get weekly active users
        const weeklyActiveUsers = await User.countDocuments({
            updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        // Get monthly active users
        const monthlyActiveUsers = await User.countDocuments({
            updatedAt: { $gte: thirtyDaysAgo }
        });

        // Get user activity by hour
        const hourlyActivity = await User.aggregate([
            {
                $match: {
                    updatedAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $hour: "$updatedAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Calculate most active time
        const mostActiveTime = hourlyActivity.length > 0 
            ? `${hourlyActivity[0]._id}:00-${hourlyActivity[0]._id + 1}:00`
            : 'N/A';

        // Get channel activity
        const channelActivity = await Channel.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'channels',
                    as: 'users'
                }
            },
            {
                $project: {
                    name: 1,
                    userCount: { $size: '$users' },
                    activeUsers: {
                        $size: {
                            $filter: {
                                input: '$users',
                                as: 'user',
                                cond: { $eq: ['$$user.isActive', true] }
                            }
                        }
                    },
                    newUsersToday: {
                        $size: {
                            $filter: {
                                input: '$users',
                                as: 'user',
                                cond: {
                                    $gte: [
                                        '$$user.createdAt',
                                        new Date(new Date().setHours(0, 0, 0, 0))
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        ]);

        res.json({
            channels: {
                total: totalChannels,
                newThisMonth: newChannelsThisMonth
            },
            users: {
                active: activeUsers,
                inactive: inactiveUsers,
                total: activeUsers + inactiveUsers,
                growth: `${userGrowth}%`
            },
            campaigns: {
                total: totalCampaigns,
                newThisMonth: newCampaignsThisMonth
            },
            recentActivity: {
                dailyActiveUsers,
                weeklyActiveUsers,
                monthlyActiveUsers,
                channelActivity: channelActivity.map(channel => ({
                    name: channel.name,
                    activeUsers: channel.activeUsers,
                    newUsers: channel.newUsersToday,
                    totalUsers: channel.userCount
                })),
                mostActiveTime,
                period: 'Last 30 days'
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard statistics' });
    }
});

// Clear dashboard cache
router.post('/clear-cache', authMiddleware(), async (req, res) => {
    try {
        await clearCacheByPattern('cache:/api/dashboard/*');
        res.json({ message: 'Dashboard cache cleared successfully' });
    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ message: 'Error clearing dashboard cache' });
    }
});

module.exports = router; 