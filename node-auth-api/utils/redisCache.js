const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Handle Redis connection events
redis.on('connect', () => {
    console.log('Redis cache client connected successfully');
});

redis.on('ready', () => {
    console.log('Redis cache client ready to accept commands');
});

redis.on('error', (err) => {
    console.error('Redis Cache Client Error:', err);
});

redis.on('reconnecting', () => {
    console.log('Redis cache client reconnecting...');
});

// Cache middleware
const cacheMiddleware = (key, duration = 300) => {
    return async (req, res, next) => {
        try {
            const cacheKey = `cache:${key}`;
            const cachedData = await redis.get(cacheKey);

            if (cachedData) {
                return res.json(JSON.parse(cachedData));
            }

            // Store original res.json
            const originalJson = res.json;

            // Override res.json method
            res.json = function(data) {
                redis.setex(cacheKey, duration, JSON.stringify(data));
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

// Clear cache by pattern
const clearCacheByPattern = async (pattern) => {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(keys);
        }
    } catch (error) {
        console.error('Clear cache error:', error);
    }
};

// Clear all cache
const clearAllCache = async () => {
    try {
        await redis.flushall();
    } catch (error) {
        console.error('Clear all cache error:', error);
    }
};

module.exports = {
    cacheMiddleware,
    clearCacheByPattern,
    clearAllCache,
    redis
}; 