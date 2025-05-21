const Redis = require('ioredis');
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Cache middleware
const cacheMiddleware = (duration) => {
    return async (req, res, next) => {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create a unique key for this request including query parameters
        const queryParams = new URLSearchParams(req.query).toString();
        const key = `cache:${req.originalUrl || req.url}${queryParams ? `?${queryParams}` : ''}`;

        try {
            // Try to get data from cache
            const cachedData = await redis.get(key);
            
            if (cachedData) {
                // If data exists in cache, return it
                return res.json(JSON.parse(cachedData));
            }

            // If no cached data, modify res.json to cache the response
            const originalJson = res.json;
            res.json = function(data) {
                // Cache the response
                redis.setex(key, duration, JSON.stringify(data));
                // Call the original res.json
                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            console.error('Redis error:', error);
            next();
        }
    };
};

// Clear cache middleware
const clearCache = async (req, res, next) => {
    try {
        // Clear all cache or specific patterns
        if (req.body.clearAll) {
            await redis.flushall();
        } else {
            // Clear specific patterns
            const patterns = ['cache:sms:*', 'cache:campaigns:*'];
            for (const pattern of patterns) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(keys);
                }
            }
        }
        next();
    } catch (error) {
        console.error('Error clearing cache:', error);
        next();
    }
};

module.exports = {
    cacheMiddleware,
    clearCache,
    redis
}; 