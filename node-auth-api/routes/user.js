const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheByPattern } = require('../config/redis');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

// Create new user (accessible by superadmin and manager)
router.post('/', authMiddleware(['superadmin', 'manager']), async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Validate required fields
        if (!username || !email || !password || !role) {
            return res.status(400).json({
                status: 'error',
                message: 'Please provide all required fields: username, email, password, and role'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this email or username already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role,
            isActive: true
        });

        // Save user
        await newUser.save();

        // Invalidate relevant caches
        await Promise.all([
            clearCacheByPattern('user:list*'),
            clearCacheByPattern('user:stats*')
        ]);

        // Return user without password
        const userResponse = {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.isActive,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt
        };

        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error creating user',
            error: error.message
        });
    }
});

// Get user statistics (accessible by all authenticated users)
router.get('/stats', authMiddleware(), cacheMiddleware('user:stats', CACHE_DURATION), async (req, res) => {
    try {
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

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user statistics', error: error.message });
    }
});

// Get all users with pagination and filtering (accessible by all authenticated users)
router.get('/', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { role, search } = req.query;

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

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
});

// Get a single user by ID (accessible by all authenticated users)
router.get('/:id', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

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
        await clearCacheByPattern('cache:/api/users/*');

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
        await clearCacheByPattern('cache:/api/users/*');

        res.json({ 
            status: 'success',
            message: 'User deleted successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error deleting user', 
            error: error.message 
        });
    }
});

// Toggle user activation status (accessible by superadmin and manager)
router.put('/:id/toggle-status', authMiddleware(['superadmin', 'manager']), async (req, res) => {
    try {
        // Find user and verify current state
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ 
                status: 'error',
                message: 'User not found' 
            });
        }

        // Log the current state
        console.log('Current user state:', {
            id: user._id,
            email: user.email,
            isActive: user.isActive,
            role: user.role,
            lastModified: user.updatedAt
        });

        // Toggle the active status
        const previousStatus = user.isActive;
        user.isActive = !user.isActive;
        
        // If deactivating, clear the token
        if (!user.isActive) {
            user.token = null;
        }
        
        // Save changes to database
        await user.save();

        // Verify the changes were saved
        const updatedUser = await User.findById(req.params.id);
        console.log('Updated user state:', {
            id: updatedUser._id,
            email: updatedUser.email,
            previousStatus: previousStatus,
            newStatus: updatedUser.isActive,
            role: updatedUser.role,
            lastModified: updatedUser.updatedAt
        });

        // Invalidate caches
        await clearCacheByPattern('cache:/api/users/*');

        res.json({ 
            status: 'success',
            message: updatedUser.isActive ? 'User activated successfully' : 'User deactivated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                lastModified: updatedUser.updatedAt
            }
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error toggling user status', 
            error: error.message 
        });
    }
});

module.exports = router;