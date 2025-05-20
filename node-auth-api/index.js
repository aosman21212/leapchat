const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));