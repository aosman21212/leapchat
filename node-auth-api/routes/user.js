const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const NodeCache = require('node-cache');

const router = express.Router();

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Get user statistics (accessible by all authenticated users)
router.get('/stats', authMiddleware(), async (req, res) => {
    try {
        const cacheKey = 'user_stats';
        const cachedStats = cache.get(cacheKey);

        if (cachedStats) {
            return res.json(cachedStats);
        }

        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            totalUsers: await User.countDocuments(),
            byRole: stats.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {}),
            lastRegistered: await User.findOne().sort({ createdAt: -1 }).select('createdAt')
        };

        cache.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user statistics', error: error.message });
    }
});

// Get all users with pagination and filtering (accessible by all authenticated users)
router.get('/', authMiddleware(), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { role, search } = req.query;

        const cacheKey = `users_${page}_${limit}_${role}_${search}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        // Build query
        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(query)
        ]);

        const result = {
            users,
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
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// Get a single user by ID (accessible by all authenticated users)
router.get('/:id', authMiddleware(), async (req, res) => {
    try {
        const cacheKey = `user_${req.params.id}`;
        const cachedUser = cache.get(cacheKey);

        if (cachedUser) {
            return res.json(cachedUser);
        }

        const user = await User.findById(req.params.id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        cache.set(cacheKey, user);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
});

// Update a user (accessible by all authenticated users)
router.put('/:id', authMiddleware(), async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password').lean();

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Invalidate relevant caches
        cache.del('user_stats');
        cache.del(`user_${req.params.id}`);
        cache.del(/^users_/);

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user', error: error.message });
    }
});

// Delete a user (accessible by all authenticated users)
router.delete('/:id', authMiddleware(), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Invalidate relevant caches
        cache.del('user_stats');
        cache.del(`user_${req.params.id}`);
        cache.del(/^users_/);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

module.exports = router;