const redis = require('redis');
const { promisify } = require('util');

// Create Redis client
const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Promisify Redis commands
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);
const keysAsync = promisify(client.keys).bind(client);

// Connect to Redis
client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Redis Client Connected'));

// Cache middleware
const cacheMiddleware = (prefix, duration) => async (req, res, next) => {
    try {
        // Skip caching for non-GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create cache key from request path and query parameters
        const cacheKey = `${prefix}:${req.originalUrl || req.url}`;

        // Try to get cached data
        const cachedData = await getAsync(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        // If no cached data, modify res.json to cache the response
        const originalJson = res.json;
        res.json = function(data) {
            setAsync(cacheKey, JSON.stringify(data), 'EX', duration)
                .catch(err => console.error('Cache Set Error:', err));
            return originalJson.call(this, data);
        };

        next();
    } catch (error) {
        console.error('Cache Middleware Error:', error);
        next();
    }
};

// Clear cache by pattern
const clearCacheByPattern = async (pattern) => {
    try {
        const keys = await keysAsync(pattern);
        if (keys.length > 0) {
            await Promise.all(keys.map(key => delAsync(key)));
            console.log(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
        }
    } catch (error) {
        console.error('Clear Cache Error:', error);
        throw error;
    }
};

module.exports = {
    cacheMiddleware,
    clearCacheByPattern,
    client
}; 