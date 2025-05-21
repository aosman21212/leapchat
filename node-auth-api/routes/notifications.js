const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCacheByPattern } = require('../utils/redisCache');
const messageQueue = require('../utils/messageQueue');

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

// Get all notifications for a user
router.get('/', authMiddleware(), cacheMiddleware('notifications:list', CACHE_DURATION), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get notifications from Redis
        const notifications = await messageQueue.getNotifications(req.user.id, skip, limit);
        const total = await messageQueue.getNotificationCount(req.user.id);

        res.json({
            notifications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
});

// Mark notification as read
router.patch('/:id/read', authMiddleware(), async (req, res) => {
    try {
        const { id } = req.params;
        await messageQueue.markNotificationAsRead(req.user.id, id);
        
        // Clear notifications cache
        await clearCacheByPattern('notifications:*');
        
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notification as read', error: error.message });
    }
});

// Mark all notifications as read
router.patch('/read-all', authMiddleware(), async (req, res) => {
    try {
        await messageQueue.markAllNotificationsAsRead(req.user.id);
        
        // Clear notifications cache
        await clearCacheByPattern('notifications:*');
        
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
    }
});

// Delete notification
router.delete('/:id', authMiddleware(), async (req, res) => {
    try {
        const { id } = req.params;
        await messageQueue.deleteNotification(req.user.id, id);
        
        // Clear notifications cache
        await clearCacheByPattern('notifications:*');
        
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting notification', error: error.message });
    }
});

// Get unread notification count
router.get('/unread/count', authMiddleware(), cacheMiddleware('notifications:unread-count', CACHE_DURATION), async (req, res) => {
    try {
        const count = await messageQueue.getUnreadNotificationCount(req.user.id);
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread notification count', error: error.message });
    }
});

// Get notifications by type
router.get('/type/:type', authMiddleware(), cacheMiddleware('notifications:by-type', CACHE_DURATION), async (req, res) => {
    try {
        const { type } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const notifications = await messageQueue.getNotificationsByType(req.user.id, type, skip, limit);
        const total = await messageQueue.getNotificationCountByType(req.user.id, type);

        res.json({
            notifications,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications by type', error: error.message });
    }
});

// Get recent notifications (last 24 hours)
router.get('/recent', authMiddleware(), cacheMiddleware('notifications:recent', CACHE_DURATION), async (req, res) => {
    try {
        const notifications = await messageQueue.getRecentNotifications(req.user.id);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching recent notifications', error: error.message });
    }
});

module.exports = router; 