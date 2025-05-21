const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

// Create Redis client
const redisClient = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Handle Redis connection events
redisClient.on('connect', () => {
    console.log('Redis message queue client connected successfully');
});

redisClient.on('ready', () => {
    console.log('Redis message queue client ready to accept commands');
});

redisClient.on('error', (error) => {
    console.error('Redis Message Queue Client Error:', error);
});

redisClient.on('reconnecting', () => {
    console.log('Redis message queue client reconnecting...');
});

// Notification types
const NOTIFICATION_TYPES = {
    CAMPAIGN_COMPLETED: 'campaign_completed',
    BULK_MESSAGE_COMPLETED: 'bulk_message_completed',
    SMS_COMPLETED: 'sms_completed',
    SYSTEM: 'system'
};

// Create notification
const createNotification = async (userId, type, data) => {
    try {
        const notification = {
            id: uuidv4(),
            type,
            data,
            createdAt: new Date().toISOString(),
            read: false
        };

        // Store notification in Redis
        await redisClient.lpush(`notifications:${userId}`, JSON.stringify(notification));
        
        // Set notification expiry (30 days)
        await redisClient.expire(`notifications:${userId}`, 30 * 24 * 60 * 60);

        // Publish real-time update
        await redisClient.publish('notifications', JSON.stringify({
            userId,
            notification
        }));

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

// Get notifications
const getNotifications = async (userId, skip = 0, limit = 10) => {
    try {
        const notifications = await redisClient.lrange(`notifications:${userId}`, skip, skip + limit - 1);
        return notifications.map(n => JSON.parse(n));
    } catch (error) {
        console.error('Error getting notifications:', error);
        throw error;
    }
};

// Get notification count
const getNotificationCount = async (userId) => {
    try {
        return await redisClient.llen(`notifications:${userId}`);
    } catch (error) {
        console.error('Error getting notification count:', error);
        throw error;
    }
};

// Mark notification as read
const markNotificationAsRead = async (userId, notificationId) => {
    try {
        const notifications = await getNotifications(userId, 0, -1);
        const updatedNotifications = notifications.map(n => {
            if (n.id === notificationId) {
                return { ...n, read: true };
            }
            return n;
        });

        // Update notifications in Redis
        await redisClient.del(`notifications:${userId}`);
        if (updatedNotifications.length > 0) {
            await redisClient.rpush(`notifications:${userId}`, ...updatedNotifications.map(n => JSON.stringify(n)));
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (userId) => {
    try {
        const notifications = await getNotifications(userId, 0, -1);
        const updatedNotifications = notifications.map(n => ({ ...n, read: true }));

        // Update notifications in Redis
        await redisClient.del(`notifications:${userId}`);
        if (updatedNotifications.length > 0) {
            await redisClient.rpush(`notifications:${userId}`, ...updatedNotifications.map(n => JSON.stringify(n)));
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
};

// Delete notification
const deleteNotification = async (userId, notificationId) => {
    try {
        const notifications = await getNotifications(userId, 0, -1);
        const filteredNotifications = notifications.filter(n => n.id !== notificationId);

        // Update notifications in Redis
        await redisClient.del(`notifications:${userId}`);
        if (filteredNotifications.length > 0) {
            await redisClient.rpush(`notifications:${userId}`, ...filteredNotifications.map(n => JSON.stringify(n)));
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        throw error;
    }
};

// Get unread notification count
const getUnreadNotificationCount = async (userId) => {
    try {
        const notifications = await getNotifications(userId, 0, -1);
        return notifications.filter(n => !n.read).length;
    } catch (error) {
        console.error('Error getting unread notification count:', error);
        throw error;
    }
};

// Get notifications by type
const getNotificationsByType = async (userId, type, skip = 0, limit = 10) => {
    try {
        const notifications = await getNotifications(userId, 0, -1);
        const filteredNotifications = notifications.filter(n => n.type === type);
        return filteredNotifications.slice(skip, skip + limit);
    } catch (error) {
        console.error('Error getting notifications by type:', error);
        throw error;
    }
};

// Get notification count by type
const getNotificationCountByType = async (userId, type) => {
    try {
        const notifications = await getNotifications(userId, 0, -1);
        return notifications.filter(n => n.type === type).length;
    } catch (error) {
        console.error('Error getting notification count by type:', error);
        throw error;
    }
};

// Get recent notifications (last 24 hours)
const getRecentNotifications = async (userId) => {
    try {
        const notifications = await getNotifications(userId, 0, -1);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return notifications.filter(n => new Date(n.createdAt) > oneDayAgo);
    } catch (error) {
        console.error('Error getting recent notifications:', error);
        throw error;
    }
};

// Create campaign completion notification
const createCampaignCompletionNotification = async (userId, campaignId, campaignName, stats) => {
    return createNotification(userId, NOTIFICATION_TYPES.CAMPAIGN_COMPLETED, {
        campaignId,
        campaignName,
        stats,
        message: `Campaign "${campaignName}" has been completed`
    });
};

// Create bulk message completion notification
const createBulkMessageCompletionNotification = async (userId, campaignId, campaignName, stats) => {
    return createNotification(userId, NOTIFICATION_TYPES.BULK_MESSAGE_COMPLETED, {
        campaignId,
        campaignName,
        stats,
        message: `Bulk message campaign "${campaignName}" has been completed`
    });
};

// Create SMS completion notification
const createSMSCompletionNotification = async (userId, campaignId, campaignName, stats) => {
    return createNotification(userId, NOTIFICATION_TYPES.SMS_COMPLETED, {
        campaignId,
        campaignName,
        stats,
        message: `SMS campaign "${campaignName}" has been completed`
    });
};

// Create system notification
const createSystemNotification = async (userId, message, data = {}) => {
    return createNotification(userId, NOTIFICATION_TYPES.SYSTEM, {
        message,
        ...data
    });
};

module.exports = {
    createNotification,
    getNotifications,
    getNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadNotificationCount,
    getNotificationsByType,
    getNotificationCountByType,
    getRecentNotifications,
    createCampaignCompletionNotification,
    createBulkMessageCompletionNotification,
    createSMSCompletionNotification,
    createSystemNotification,
    NOTIFICATION_TYPES
}; 