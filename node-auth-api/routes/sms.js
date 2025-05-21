const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware');
const SmsCampaign = require('../models/SmsCampaign');
const multer = require('multer');
const xlsx = require('xlsx');
const { cacheMiddleware, clearCacheByPattern } = require('../config/redis');

const router = express.Router();

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes

// Configure multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed!'), false);
        }
    }
});

// Fetch SMS campaigns with Redis caching
router.get('/campaigns', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.to) filter.to = req.query.to;
        if (req.query.from) filter.from = req.query.from;
        if (req.query.channel) filter.channel = req.query.channel;

        // Get total count for pagination
        const total = await SmsCampaign.countDocuments(filter);

        // Fetch campaigns with pagination
        const campaigns = await SmsCampaign.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sentBy', 'name email')
            .lean();

        // Return response
        res.status(200).json({
            success: true,
            data: {
                campaigns,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching SMS campaigns:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch SMS campaigns',
            error: error.message
        });
    }
});

// Get single SMS campaign by ID with Redis caching
router.get('/campaigns/:id', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
    try {
        const campaign = await SmsCampaign.findById(req.params.id)
            .populate('sentBy', 'name email')
            .lean();

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: 'SMS campaign not found'
            });
        }

        res.status(200).json({
            success: true,
            data: campaign
        });

    } catch (error) {
        console.error('Error fetching SMS campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch SMS campaign',
            error: error.message
        });
    }
});

// Send SMS message with cache invalidation
router.post('/send', authMiddleware(), async (req, res) => {
    try {
        const { to, from, channel, content } = req.body;

        // Validate required fields
        if (!to || !from || !channel || !content) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                required: ['to', 'from', 'channel', 'content']
            });
        }

        // Log the incoming request
        console.log('Sending SMS message:', {
            to,
            from,
            channel,
            contentType: content.contentType,
            user: req.user
        });

        // Make request to Tyntec API
        const response = await axios.post(
            'https://api.tyntec.com/conversations/v3/messages',
            {
                to,
                from,
                channel,
                content
            },
            {
                headers: {
                    'apikey': process.env.TYNTEC_API_KEY || 'YIlQFlUolNhG9SlOUzCQGOahEdmzh911',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Save to MongoDB
        const smsCampaign = new SmsCampaign({
            to,
            from,
            channel,
            content,
            messageId: response.data?.messageId,
            status: 'sent',
            sentBy: req.user._id
        });
        await smsCampaign.save();

        // Clear SMS-related caches
        await clearCacheByPattern('cache:/api/sms/campaigns*');

        // Log successful message sending
        console.log('Message sent successfully:', {
            to,
            from,
            channel,
            messageId: response.data?.messageId,
            user: req.user
        });

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Message sent successfully',
            data: {
                messageId: response.data?.messageId,
                to,
                from,
                channel,
                content,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error sending message:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            user: req.user
        });

        // Save failed attempt to MongoDB
        try {
            const failedSms = new SmsCampaign({
                to: req.body.to,
                from: req.body.from,
                channel: req.body.channel,
                content: req.body.content,
                status: 'failed',
                sentBy: req.user._id
            });
            await failedSms.save();

            // Clear SMS-related caches even for failed attempts
            await clearCacheByPattern('cache:/api/sms/campaigns*');
        } catch (dbError) {
            console.error('Error saving failed SMS to database:', dbError);
        }

        // Return error response
        res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to send message',
            error: error.response?.data || error.message,
            details: {
                timestamp: new Date().toISOString(),
                to: req.body.to,
                from: req.body.from
            }
        });
    }
});

// Send media message with cache invalidation
router.post('/sendmedia', authMiddleware(), async (req, res) => {
    try {
        const { to, from, channel, mediaUrl } = req.body;

        // Validate required fields
        if (!to || !from || !channel || !mediaUrl) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                required: ['to', 'from', 'channel', 'mediaUrl']
            });
        }

        // Log the incoming request
        console.log('Sending media message:', {
            to,
            from,
            channel,
            mediaUrl,
            user: req.user
        });

        // Prepare content object for Tyntec API
        const content = {
            contentType: "media",
            media: {
                url: mediaUrl
            }
        };

        // Make request to Tyntec API
        const response = await axios.post(
            'https://api.tyntec.com/conversations/v3/messages',
            {
                to,
                from,
                channel,
                content
            },
            {
                headers: {
                    'apikey': process.env.TYNTEC_API_KEY || 'YIlQFlUolNhG9SlOUzCQGOahEdmzh911',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Save to MongoDB
        const smsCampaign = new SmsCampaign({
            to,
            from,
            channel,
            content,
            messageId: response.data?.messageId,
            status: 'sent',
            sentBy: req.user._id
        });
        await smsCampaign.save();

        // Clear SMS-related caches
        await clearCacheByPattern('cache:/api/sms/campaigns*');

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Media message sent successfully',
            data: {
                messageId: response.data?.messageId,
                to,
                from,
                channel,
                content,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error sending media message:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            user: req.user
        });

        // Save failed attempt to MongoDB
        try {
            const failedSms = new SmsCampaign({
                to: req.body.to,
                from: req.body.from,
                channel: req.body.channel,
                content: {
                    contentType: "media",
                    media: {
                        url: req.body.mediaUrl
                    }
                },
                status: 'failed',
                sentBy: req.user._id
            });
            await failedSms.save();

            // Clear SMS-related caches even for failed attempts
            await clearCacheByPattern('cache:/api/sms/campaigns*');
        } catch (dbError) {
            console.error('Error saving failed media SMS to database:', dbError);
        }

        // Return error response
        res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to send media message',
            error: error.response?.data || error.message,
            details: {
                timestamp: new Date().toISOString(),
                to: req.body.to,
                from: req.body.from
            }
        });
    }
});

// Send rich card message
router.post('/sendrichcard', authMiddleware(), async (req, res) => {
    try {
        const { to, from, channel, title, mediaUrl, cardOrientation = 'HORIZONTAL', thumbnailImageAlignment = 'LEFT' } = req.body;

        // Validate required fields
        if (!to || !from || !channel || !title || !mediaUrl) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                required: ['to', 'from', 'channel', 'title', 'mediaUrl']
            });
        }

        // Log the incoming request
        console.log('Sending rich card message:', {
            to,
            from,
            channel,
            title,
            mediaUrl,
            user: req.user
        });

        // Prepare content object for Tyntec API
        const content = {
            contentType: "richCard",
            richCard: {
                standaloneCard: {
                    cardOrientation,
                    thumbnailImageAlignment,
                    cardContent: {
                        title,
                        media: {
                            media: {
                                url: mediaUrl
                            }
                        }
                    }
                }
            }
        };

        // Make request to Tyntec API
        const response = await axios.post(
            'https://api.tyntec.com/conversations/v3/messages',
            {
                to,
                from,
                channel,
                content
            },
            {
                headers: {
                    'apikey': process.env.TYNTEC_API_KEY || 'YIlQFlUolNhG9SlOUzCQGOahEdmzh911',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Save to MongoDB
        const smsCampaign = new SmsCampaign({
            to,
            from,
            channel,
            content,
            messageId: response.data?.messageId,
            status: 'sent',
            sentBy: req.user._id
        });
        await smsCampaign.save();

        // Log successful message sending
        console.log('Rich card message sent successfully:', {
            to,
            from,
            channel,
            messageId: response.data?.messageId,
            user: req.user
        });

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Rich card message sent successfully',
            data: {
                messageId: response.data?.messageId,
                to,
                from,
                channel,
                content,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error sending rich card message:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            user: req.user
        });

        // Save failed attempt to MongoDB
        try {
            const failedSms = new SmsCampaign({
                to: req.body.to,
                from: req.body.from,
                channel: req.body.channel,
                content: {
                    contentType: "richCard",
                    richCard: {
                        standaloneCard: {
                            cardOrientation: req.body.cardOrientation || 'HORIZONTAL',
                            thumbnailImageAlignment: req.body.thumbnailImageAlignment || 'LEFT',
                            cardContent: {
                                title: req.body.title,
                                media: {
                                    media: {
                                        url: req.body.mediaUrl
                                    }
                                }
                            }
                        }
                    }
                },
                status: 'failed',
                sentBy: req.user._id
            });
            await failedSms.save();
        } catch (dbError) {
            console.error('Error saving failed rich card message to database:', dbError);
        }

        // Return error response
        res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to send rich card message',
            error: error.response?.data || error.message,
            details: {
                timestamp: new Date().toISOString(),
                to: req.body.to,
                from: req.body.from
            }
        });
    }
});

// Bulk send rich card messages from Excel
router.post('/sendrichcards', authMiddleware(), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an Excel file'
            });
        }

        const workbook = xlsx.read(req.file.buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const results = [];
        const errors = [];

        for (const row of data) {
            try {
                const { to, from, channel, title, mediaUrl, cardOrientation = 'HORIZONTAL', thumbnailImageAlignment = 'LEFT' } = row;

                if (!to || !from || !channel || !title || !mediaUrl) {
                    errors.push({
                        row,
                        error: 'Missing required fields'
                    });
                    continue;
                }

                const content = {
                    contentType: "richCard",
                    richCard: {
                        standaloneCard: {
                            cardOrientation,
                            thumbnailImageAlignment,
                            cardContent: {
                                title,
                                media: {
                                    media: {
                                        url: mediaUrl
                                    }
                                }
                            }
                        }
                    }
                };

                const response = await axios.post(
                    'https://api.tyntec.com/conversations/v3/messages',
                    {
                        to,
                        from,
                        channel,
                        content
                    },
                    {
                        headers: {
                            'apikey': process.env.TYNTEC_API_KEY || 'YIlQFlUolNhG9SlOUzCQGOahEdmzh911',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const smsCampaign = new SmsCampaign({
                    to,
                    from,
                    channel,
                    content,
                    messageId: response.data?.messageId,
                    status: 'sent',
                    sentBy: req.user._id
                });
                await smsCampaign.save();

                results.push({
                    to,
                    status: 'success',
                    messageId: response.data?.messageId
                });
            } catch (error) {
                errors.push({
                    row,
                    error: error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Bulk rich card messages processed',
            data: {
                total: data.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing Excel file',
            error: error.message
        });
    }
});

// Bulk send media messages from Excel
router.post('/sendmedias', authMiddleware(), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an Excel file'
            });
        }

        const workbook = xlsx.read(req.file.buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const results = [];
        const errors = [];

        for (const row of data) {
            try {
                const { to, from, channel, mediaUrl } = row;

                if (!to || !from || !channel || !mediaUrl) {
                    errors.push({
                        row,
                        error: 'Missing required fields'
                    });
                    continue;
                }

                const content = {
                    contentType: "media",
                    media: {
                        url: mediaUrl
                    }
                };

                const response = await axios.post(
                    'https://api.tyntec.com/conversations/v3/messages',
                    {
                        to,
                        from,
                        channel,
                        content
                    },
                    {
                        headers: {
                            'apikey': process.env.TYNTEC_API_KEY || 'YIlQFlUolNhG9SlOUzCQGOahEdmzh911',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const smsCampaign = new SmsCampaign({
                    to,
                    from,
                    channel,
                    content,
                    messageId: response.data?.messageId,
                    status: 'sent',
                    sentBy: req.user._id
                });
                await smsCampaign.save();

                results.push({
                    to,
                    status: 'success',
                    messageId: response.data?.messageId
                });
            } catch (error) {
                errors.push({
                    row,
                    error: error.message
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Bulk media messages processed',
            data: {
                total: data.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing Excel file',
            error: error.message
        });
    }
});

// Bulk send text messages from Excel
router.post('/sends', authMiddleware(), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an Excel file'
            });
        }

        const workbook = xlsx.read(req.file.buffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const results = [];
        const errors = [];

        for (const row of data) {
            try {
                // Clean and trim all values
                const cleanedRow = {};
                Object.keys(row).forEach(key => {
                    const cleanKey = key.trim();
                    cleanedRow[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
                });

                const { to, from, channel, content } = cleanedRow;

                // Validate required fields
                if (!to || !from || !channel || !content) {
                    errors.push({
                        row: cleanedRow,
                        error: 'Missing required fields',
                        details: {
                            to: !to ? 'Missing' : 'Present',
                            from: !from ? 'Missing' : 'Present',
                            channel: !channel ? 'Missing' : 'Present',
                            content: !content ? 'Missing' : 'Present'
                        }
                    });
                    continue;
                }

                // Format the phone number if needed
                const formattedTo = typeof to === 'number' ? `+${to}` : to;

                const response = await axios.post(
                    'https://api.tyntec.com/conversations/v3/messages',
                    {
                        to: formattedTo,
                        from,
                        channel,
                        content: {
                            contentType: "text",
                            text: content
                        }
                    },
                    {
                        headers: {
                            'apikey': process.env.TYNTEC_API_KEY || 'YIlQFlUolNhG9SlOUzCQGOahEdmzh911',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const smsCampaign = new SmsCampaign({
                    to: formattedTo,
                    from,
                    channel,
                    content: {
                        contentType: "text",
                        text: content
                    },
                    messageId: response.data?.messageId,
                    status: 'sent',
                    sentBy: req.user._id
                });
                await smsCampaign.save();

                results.push({
                    to: formattedTo,
                    status: 'success',
                    messageId: response.data?.messageId
                });
            } catch (error) {
                errors.push({
                    row: cleanedRow,
                    error: error.message,
                    details: error.response?.data
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Bulk text messages processed',
            data: {
                total: data.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing Excel file',
            error: error.message
        });
    }
});

// Clear SMS cache
router.post('/clear-cache', authMiddleware(), async (req, res) => {
    try {
        await clearCacheByPattern('cache:/api/sms/*');
        res.json({ message: 'SMS cache cleared successfully' });
    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ message: 'Error clearing SMS cache' });
    }
});

module.exports = router; 