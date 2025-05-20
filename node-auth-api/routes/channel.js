const express = require('express');
const axios = require('axios');
const Channel = require('../models/Channel'); // Import the Channel model
const authMiddleware = require('../middleware/authMiddleware'); // Import the auth middleware
const NodeCache = require('node-cache');

const router = express.Router();

// Initialize cache with 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Direct PATCH to WHAPI.cloud and save to MongoDB
router.patch('/newsletter/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, newsletter_pic, reactions } = req.body;

    // Make direct request to WHAPI.cloud
    const response = await axios.patch(
      `https://gate.whapi.cloud/newsletters/${id}`,
      {
        name,
        description,
        newsletter_pic: newsletter_pic?.replace(/[<>]/g, ''), // Remove angle brackets if present
        reactions
      },
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${process.env.WHAPI_KEY}`,
          'content-type': 'application/json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    // Find existing channel or create new one
    const existingChannel = await Channel.findOne({ 
      $or: [
        { 'data.id': id },
        { id: id }
      ]
    });

    if (existingChannel) {
      // Update existing channel
      const updatedChannel = await Channel.findOneAndUpdate(
        { _id: existingChannel._id },
        {
          $set: {
            name: name.trim(),
            description: description.trim(),
            type: 'newsletter',
            credentials: {
              apiKey: process.env.WHAPI_KEY
            },
            data: response.data,
            updatedAt: new Date(),
            status: 'active',
            ...(newsletter_pic && { newsletter_pic: newsletter_pic.replace(/[<>]/g, '') }),
            ...(reactions && { reactions })
          }
        },
        { new: true }
      );

      // Invalidate cache
      cache.del(`channel_${id}`);
      cache.del('channel_stats');

      return res.json({
        success: true,
        message: 'Newsletter updated successfully',
        data: {
          whatsappResponse: response.data,
          channel: updatedChannel
        }
      });
    } else {
      // Create new channel
      const newChannel = new Channel({
        name: name.trim(),
        description: description.trim(),
        type: 'newsletter',
        credentials: {
          apiKey: process.env.WHAPI_KEY
        },
        data: response.data,
        createdAt: new Date(),
        status: 'active',
        messageCount: 0,
        successRate: '0%',
        ...(newsletter_pic && { newsletter_pic: newsletter_pic.replace(/[<>]/g, '') }),
        ...(reactions && { reactions })
      });

      await newChannel.save();

      return res.json({
        success: true,
        message: 'Newsletter created successfully',
        data: {
          whatsappResponse: response.data,
          channel: newChannel
        }
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { message: error.message });
  }
});

// Update newsletter (PATCH)
router.patch('/newsletter/:id', authMiddleware(), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, newsletter_pic, reactions } = req.body;

    // Log the incoming request
    console.log('Update newsletter request:', {
      id,
      body: {
        name,
        description,
        hasImage: !!newsletter_pic,
        imageLength: newsletter_pic ? newsletter_pic.length : 0
      },
      headers: req.headers
    });

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and description are required.',
        details: { name, description }
      });
    }

    // Validate image format if provided
    if (newsletter_pic && !newsletter_pic.startsWith('data:image/jpeg;base64,')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Must be JPEG in base64 format.',
        details: { imageFormat: newsletter_pic.substring(0, 50) + '...' }
      });
    }

    // Construct the exact API URL with the newsletter ID
    const apiUrl = `https://gate.whapi.cloud/newsletters/${id}`;
    
    // Set headers exactly as in the cURL command
    const headers = {
      'accept': 'application/json',
      'authorization': `Bearer ${process.env.WHAPI_KEY}`,
      'content-type': 'application/json'
    };

    // Prepare request data with all available parameters
    const requestData = {
      name,
      description
    };

    // Only add newsletter_pic if it's a valid base64 string
    if (newsletter_pic && newsletter_pic.startsWith('data:image/jpeg;base64,')) {
      requestData.newsletter_pic = newsletter_pic;
    }

    // Add reactions if provided
    if (reactions) {
      requestData.reactions = reactions;
    }

    console.log('Making API request to:', apiUrl);
    console.log('With headers:', headers);
    console.log('Request data length:', JSON.stringify(requestData).length);

    // Make the API request to update newsletter
    const response = await axios.patch(apiUrl, requestData, { 
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('API Response:', response.data);

    // Find the existing channel
    const existingChannel = await Channel.findOne({ 
      $or: [
        { 'data.id': id },
        { id: id }
      ]
    });

    if (!existingChannel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found in database',
        details: { id }
      });
    }

    // Delete the old channel data
    await Channel.deleteOne({ _id: existingChannel._id });

    // Create new channel data with updated information
    const newChannelData = {
      name: name.trim(),
      description: description.trim(),
      type: 'newsletter',
      credentials: {
        apiKey: process.env.WHAPI_KEY
      },
      data: response.data,
      createdAt: new Date(),
      status: 'active',
      messageCount: existingChannel.messageCount || 0,
      successRate: existingChannel.successRate || '0%'
    };

    if (newsletter_pic) {
      newChannelData.newsletter_pic = newsletter_pic;
    }

    if (reactions) {
      newChannelData.reactions = reactions;
    }

    // Save the new channel data
    const newChannel = new Channel(newChannelData);
    await newChannel.save();

    console.log('MongoDB Update Result:', {
      oldChannelId: existingChannel._id,
      newChannelId: newChannel._id,
      whatsappId: id,
      updatedFields: Object.keys(newChannelData)
    });

    // Invalidate relevant caches
    try {
      cache.del('channel_stats');
      cache.del(`channel_${id}`);
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.startsWith('channels_')) {
          cache.del(key);
        }
      });
    } catch (cacheError) {
      console.error('Error clearing cache:', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'Newsletter updated successfully',
      data: {
        whatsappResponse: response.data,
        channel: newChannel
      }
    });
  } catch (error) {
    // Enhanced error logging
    console.error('Error updating newsletter:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      stack: error.stack,
      request: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        dataLength: error.config?.data ? JSON.stringify(error.config.data).length : 0
      }
    });

    // Enhanced error response
    if (error.response) {
      res.status(error.response.status).json({ 
        success: false,
        message: 'Error from WhatsApp API',
        error: error.response.data,
        details: {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers
        }
      });
    } else if (error.request) {
      res.status(500).json({ 
        success: false,
        message: 'No response received from WhatsApp API',
        error: error.message,
        details: {
          request: {
            url: error.config?.url,
            method: error.config?.method
          }
        }
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: 'An error occurred while updating the newsletter',
        error: error.message,
        details: {
          stack: error.stack
        }
      });
    }
  }
});

// Add a new channel (restricted to manager and superadmin)
router.post('/add-channel', authMiddleware(['manager', 'superadmin']), async (req, res) => {
  try {
    const { name, description, newsletter_pic } = req.body;

    // Make direct request to WHAPI.cloud
    const response = await axios.post(
      'https://gate.whapi.cloud/newsletters',
      {
        name: name.trim(),
        description: description.trim(),
        ...(newsletter_pic && { newsletter_pic: newsletter_pic.replace(/[<>]/g, '') })
      },
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${process.env.WHAPI_KEY}`,
          'content-type': 'application/json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    // Create new channel in MongoDB
    const newChannel = new Channel({
      id: response.data.id,
      name: name.trim(),
      description: description.trim(),
      type: 'newsletter',
      credentials: {
        apiKey: process.env.WHAPI_KEY
      },
      data: response.data,
      createdAt: new Date(),
      status: 'active',
      messageCount: 0,
      successRate: '0%',
      ...(newsletter_pic && { newsletter_pic: newsletter_pic.replace(/[<>]/g, '') })
    });

    await newChannel.save();

    // Invalidate cache
    try {
      cache.del('channel_stats');
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.startsWith('channels_')) {
          cache.del(key);
        }
      });
    } catch (cacheError) {
      console.error('Error clearing cache:', cacheError);
    }

    res.status(201).json({
      success: true,
      message: 'Channel added successfully',
      data: {
        whatsappResponse: response.data,
        channel: newChannel
      }
    });
  } catch (error) {
    console.error('Error adding channel:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { message: error.message });
  }
});

// GET channel statistics (accessible by all authenticated users)
router.get('/stats', authMiddleware(), async (req, res) => {
    try {
        const cacheKey = 'channel_stats';
        const cachedStats = cache.get(cacheKey);

        if (cachedStats) {
            return res.json(cachedStats);
        }

        const stats = await Channel.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalMessages: { $sum: '$messageCount' },
                    averageSuccessRate: {
                        $avg: {
                            $toDouble: {
                                $replaceAll: {
                                    input: '$successRate',
                                    find: '%',
                                    replacement: ''
                                }
                            }
                        }
                    }
                }
            }
        ]);

        const result = {
            totalChannels: await Channel.countDocuments(),
            byType: stats.reduce((acc, curr) => {
                acc[curr._id] = {
                    count: curr.count,
                    totalMessages: curr.totalMessages,
                    averageSuccessRate: curr.averageSuccessRate
                };
                return acc;
            }, {}),
            activeChannels: await Channel.countDocuments({ status: 'active' }),
            inactiveChannels: await Channel.countDocuments({ status: 'inactive' }),
            errorChannels: await Channel.countDocuments({ status: 'error' })
        };

        cache.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching channel statistics', error: error.message });
    }
});

// GET all channels with pagination and filtering (accessible by all authenticated users)
router.get('/', authMiddleware(), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { type, status, search } = req.query;

        const cacheKey = `channels_${page}_${limit}_${type}_${status}_${search}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
            return res.json(cachedData);
        }

        // Build query
        const query = {};
        if (type) query.type = type;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } }
            ];
        }

        const [channels, total] = await Promise.all([
            Channel.find(query)
                .select('name type status messageCount successRate lastUsed createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Channel.countDocuments(query)
        ]);

        const result = {
            channels,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

        cache.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching channels', error: error.message });
    }
});

// GET single channel by ID (accessible by all authenticated users)
router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching channel with ID:', id);

    // Try to get from cache first
    const cacheKey = `channel_${id}`;
    const cachedChannel = cache.get(cacheKey);

    if (cachedChannel) {
      console.log('Returning cached channel data');
      return res.json({
        success: true,
        data: cachedChannel,
        source: 'cache'
      });
    }

    // If not in cache, fetch from database
    const channel = await Channel.findOne({ id: id }).lean();

    if (!channel) {
      console.log('Channel not found in database');
      return res.status(404).json({
        success: false,
        message: 'Channel not found',
        details: { id }
      });
    }

    // Format the response data
    const formattedChannel = {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      description: channel.description,
      chat_pic: channel.chat_pic,
      chat_pic_full: channel.chat_pic_full,
      created_at: channel.created_at,
      invite_code: channel.invite_code,
      verification: channel.verification,
      description_at: channel.description_at,
      preview: channel.preview,
      role: channel.role,
      status: channel.status,
      lastUsed: channel.lastUsed,
      messageCount: channel.messageCount,
      successRate: channel.successRate,
      updatedAt: channel.updatedAt
    };

    // Cache the formatted data
    cache.set(cacheKey, formattedChannel);

    console.log('Returning channel data from database');
    res.json({
      success: true,
      data: formattedChannel,
      source: 'database'
    });
  } catch (error) {
    console.error('Error fetching channel:', {
      message: error.message,
      stack: error.stack,
      params: req.params
    });

    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching the channel',
      error: error.message,
      details: {
        id: req.params.id
      }
    });
  }
});

// POST create new channel
router.post('/', authMiddleware(), async (req, res) => {
    try {
        const channel = new Channel(req.body);
        await channel.save();
        
        // Invalidate relevant caches
        cache.del('channel_stats');
        cache.del(/^channels_/);
        
        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ message: 'Error creating channel', error: error.message });
    }
});

// PUT update channel (accessible by all authenticated users)
router.put('/:id', authMiddleware(), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, newsletter_pic } = req.body;

        console.log('Updating channel:', {
            id,
            updates: {
                name,
                description,
                hasImage: !!newsletter_pic
            }
        });

        // First find the channel
        const channel = await Channel.findOne({ 
            $or: [
                { 'data.id': id },
                { id: id }
            ]
        });

        if (!channel) {
            return res.status(404).json({ 
                success: false,
                message: 'Channel not found',
                details: { id }
            });
        }

        // Get the WhatsApp ID
        const whatsappId = channel.data?.id || channel.id;

        // Make request to WhatsApp API to update the newsletter
        const apiUrl = `https://gate.whapi.cloud/newsletters/${whatsappId}`;
        const headers = {
            'accept': 'application/json',
            'authorization': `Bearer ${process.env.WHAPI_KEY}`,
            'content-type': 'application/json'
        };

        const requestData = {
            name: name?.trim(),
            description: description?.trim()
        };

        if (newsletter_pic) {
            requestData.newsletter_pic = newsletter_pic;
        }

        console.log('Making WhatsApp API update request:', {
            url: apiUrl,
            headers: { ...headers, authorization: 'Bearer [HIDDEN]' },
            data: { ...requestData, newsletter_pic: requestData.newsletter_pic ? '[BASE64_IMAGE]' : '' }
        });

        const response = await axios.patch(apiUrl, requestData, { 
            headers,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('WhatsApp API Response:', response.data);

        // Update in MongoDB
        const updateData = {
            name: name?.trim() || channel.name,
            description: description?.trim() || channel.description,
            data: {
                ...channel.data,
                ...response.data
            },
            updatedAt: new Date()
        };

        if (newsletter_pic) {
            updateData.newsletter_pic = newsletter_pic;
        }

        const updatedChannel = await Channel.findOneAndUpdate(
            { _id: channel._id },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        console.log('MongoDB Update Result:', {
            channelId: channel._id,
            whatsappId: whatsappId,
            updatedFields: Object.keys(updateData)
        });

        // Invalidate relevant caches
        try {
            cache.del(`channel_${id}`);
            cache.del('channel_stats');
            const keys = cache.keys();
            keys.forEach(key => {
                if (key.startsWith('channels_')) {
                    cache.del(key);
                }
            });
        } catch (cacheError) {
            console.error('Error clearing cache:', cacheError);
        }

        res.json({
            success: true,
            message: 'Channel updated successfully',
            data: {
                whatsappResponse: response.data,
                channel: updatedChannel
            }
        });
    } catch (error) {
        console.error('Error updating channel:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack,
            request: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                data: error.config?.data ? '[DATA]' : undefined
            }
        });

        if (error.response) {
            res.status(error.response.status).json({ 
                success: false,
                message: 'Error from WhatsApp API',
                error: error.response.data,
                details: {
                    status: error.response.status,
                    statusText: error.response.statusText
                }
            });
        } else {
            res.status(500).json({ 
                success: false,
                message: 'An error occurred while updating the channel',
                error: error.message 
            });
        }
    }
});

// DELETE channel (accessible by all authenticated users)
router.delete('/:id', authMiddleware(), async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Deleting channel with ID:', id);

        // First find the channel to get its WhatsApp ID
        const channel = await Channel.findOne({ 
            $or: [
                { 'data.id': id },
                { id: id }
            ]
        });
        
        if (!channel) {
            console.log('Channel not found in database:', {
                searchId: id,
                searchCriteria: {
                    'data.id': id,
                    id: id
                }
            });
            return res.status(404).json({ 
                success: false,
                message: 'Channel not found',
                details: { id }
            });
        }

        // Get the WhatsApp ID from the channel data
        const whatsappId = channel.data?.id || channel.id;
        console.log('Found channel with WhatsApp ID:', whatsappId);

        // Make request to WhatsApp API to delete the newsletter
        const apiUrl = `https://gate.whapi.cloud/newsletters/${whatsappId}`;
        const headers = {
            'accept': 'application/json',
            'authorization': `Bearer ${process.env.WHAPI_KEY}`
        };

        console.log('Making WhatsApp API delete request:', {
            url: apiUrl,
            headers: { ...headers, authorization: 'Bearer [HIDDEN]' }
        });

        const response = await axios.delete(apiUrl, { headers });

        console.log('WhatsApp API Delete Response:', response.data);

        // Delete from MongoDB using multiple criteria to ensure deletion
        const deleteResult = await Channel.deleteOne({
            $or: [
                { _id: channel._id },
                { 'data.id': whatsappId },
                { id: whatsappId }
            ]
        });

        console.log('MongoDB Delete Result:', {
            deletedCount: deleteResult.deletedCount,
            channelId: channel._id,
            whatsappId: whatsappId
        });

        if (deleteResult.deletedCount === 0) {
            console.error('Failed to delete channel from database:', {
                channelId: channel._id,
                whatsappId: whatsappId
            });
        }

        // Invalidate relevant caches
        try {
            // Delete specific channel cache
            cache.del(`channel_${id}`);
            
            // Delete channel stats cache
            cache.del('channel_stats');
            
            // Delete all channel list caches
            const keys = cache.keys();
            keys.forEach(key => {
                if (key.startsWith('channels_')) {
                    cache.del(key);
                }
            });
        } catch (cacheError) {
            console.error('Error clearing cache:', cacheError);
            // Continue with the response even if cache clearing fails
        }

        res.json({ 
            success: true,
            message: 'Channel deleted successfully',
            data: {
                whatsappResponse: response.data,
                databaseResult: {
                    deletedCount: deleteResult.deletedCount,
                    channelId: channel._id
                }
            }
        });
    } catch (error) {
        console.error('Error deleting channel:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            stack: error.stack,
            request: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            }
        });

        if (error.response) {
            res.status(error.response.status).json({ 
                success: false,
                message: 'Error from WhatsApp API',
                error: error.response.data,
                details: {
                    status: error.response.status,
                    statusText: error.response.statusText
                }
            });
        } else {
            res.status(500).json({ 
                success: false,
                message: 'An error occurred while deleting the channel',
                error: error.message 
            });
        }
    }
});

// Bulk message sending
router.post('/messages/bulk', authMiddleware(), async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required and must not be empty'
      });
    }

    // Make request to WHAPI.cloud
    const response = await axios.post(
      'https://gate.whapi.cloud/messages/bulk',
      { messages },
      {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${process.env.WHAPI_KEY}`,
          'content-type': 'application/json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    res.status(200).json({
      success: true,
      message: 'Bulk messages sent successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Error sending bulk messages:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { message: error.message });
  }
});

module.exports = router;