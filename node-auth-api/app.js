const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const smsRoutes = require('./routes/sms');
const bulkMessageRoutes = require('./routes/bulkmessage');
const metaRoutes = require('./routes/meta');
const getNewsletterMessagesRoutes = require('./routes/Getnewslettermessages');
const getMessagesRoutes = require('./routes/Getmessages');
const createMessageRoutes = require('./routes/createmesageg');
const campaignsRoutes = require('./routes/campaigns');
const channelRoutes = require('./routes/channel');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const dashboardRoutes = require('./routes/dashboard');
const fetchChannelRoutes = require('./routes/fetchchannel');
const deleteChannelRoutes = require('./routes/deletechannl');
const getChannelRoutes = require('./routes/getchannel');
const logoutRoutes = require('./routes/logout .js');

// Register routes
app.use('/api/sms', smsRoutes);
app.use('/api/bulk', bulkMessageRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/newsletter-messages', getNewsletterMessagesRoutes);
app.use('/api/messages', getMessagesRoutes);
app.use('/api/create-message', createMessageRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/channel', channelRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fetch-channel', fetchChannelRoutes);
app.use('/api/delete-channel', deleteChannelRoutes);
app.use('/api/get-channel', getChannelRoutes);
app.use('/api/logout', logoutRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; 