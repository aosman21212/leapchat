const Redis = require('ioredis');

// Redis client configuration
const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Handle Redis connection events
redisClient.on('connect', () => {
    console.log('Redis client connected');
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

// Cache middleware
const cacheMiddleware = (duration) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await redisClient.get(key);
            
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // Modify res.json to cache the response
            const originalJson = res.json;
            res.json = function (body) {
                redisClient.setex(key, duration, JSON.stringify(body));
                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            console.error('Redis Cache Error:', error);
            next();
        }
    };
};

// Clear cache for a specific key
const clearCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        console.error('Redis Clear Cache Error:', error);
    }
};

// Clear cache by pattern
const clearCacheByPattern = async (pattern) => {
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    } catch (error) {
        console.error('Redis Clear Cache Pattern Error:', error);
    }
};

module.exports = {
    redisClient,
    cacheMiddleware,
    clearCache,
    clearCacheByPattern
}; 