const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { redisClient } = require('./config/redis');

// Import routes
const authRoutes = require('./routes/auth');
const metaRoutes = require('./routes/meta');
const channelRoutes = require('./routes/channel');
const getChannelRoutes = require('./routes/getchannel');
const fetchChannelRoutes = require('./routes/fetchchannel');
const deleteChannelRoutes = require('./routes/deletechannl');
const getMessagesRoutes = require('./routes/Getmessages');
const createMessageRoutes = require('./routes/createmesageg');
const bulkMessageRoutes = require('./routes/bulkmessage');
const campaignRoutes = require('./routes/campaigns');
const newsletterMessagesRoutes = require('./routes/Getnewslettermessages');
const userRoutes = require('./routes/user');
const smsRoutes = require('./routes/sms');
const dashboardRoutes = require('./routes/dashboard');
const imageRoutes = require('./routes/image');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
// Increase the limit for JSON payloads
app.use(express.json({ limit: '50mb' }));
// Increase the limit for URL-encoded payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/get-channel', getChannelRoutes);
app.use('/api/fetch-channel', fetchChannelRoutes);
app.use('/api/delete-channel', deleteChannelRoutes);
app.use('/api/messages', getMessagesRoutes);
app.use('/api/create-message', createMessageRoutes);
app.use('/api/bulk-message', bulkMessageRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/newsletter-messages', newsletterMessagesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/image', imageRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const redisStatus = await redisClient.ping() === 'PONG' ? 'UP' : 'DOWN';
        const health = {
            status: 'UP',
            timestamp: new Date(),
            services: {
                mongodb: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
                redis: redisStatus
            }
        };
        res.status(health.services.mongodb === 'UP' && health.services.redis === 'UP' ? 200 : 503).json(health);
    } catch (error) {
        res.status(503).json({
            status: 'DOWN',
            timestamp: new Date(),
            services: {
                mongodb: mongoose.connection.readyState === 1 ? 'UP' : 'DOWN',
                redis: 'DOWN'
            },
            error: error.message
        });
    }
});

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Catch-all route for unmatched routes
app.use((req, res) => {
    console.log('Route not found:', req.method, req.url);
    res.status(404).json({ message: 'Route not found' });
});

// MongoDB connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    maxPoolSize: 10,
    retryWrites: true,
    retryReads: true
};

// Function to connect to MongoDB with retry logic
const connectWithRetry = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        console.log('Retrying MongoDB connection in 5 seconds...');
        setTimeout(connectWithRetry, 5000);
    }
};

// Connect to MongoDB
connectWithRetry();

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
    // Attempt to reconnect
    connectWithRetry();
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available routes:');
    console.log('- GET  /api/image/test');
    console.log('- POST /api/image/tobase64');
    console.log('- POST /api/image/upload');
    console.log('- POST /api/image/from-base64');
});