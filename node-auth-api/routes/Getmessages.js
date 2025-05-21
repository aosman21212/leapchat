const express = require('express');
const axios = require('axios'); // For making HTTP requests
const Message = require('../models/Message'); // Import the Message model
const { cacheMiddleware, clearCacheByPattern } = require('../utils/redisCache');

const router = express.Router();

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 300;

// Route to fetch messages from the API and save them in MongoDB
router.get('/:newsletterId', cacheMiddleware('messages:newsletter', CACHE_DURATION), async (req, res) => {
  try {
        let { newsletterId } = req.params;
        const { count = 100 } = req.query;

        // Format newsletter ID if needed
        if (!newsletterId.endsWith('@newsletter')) {
            newsletterId = `${newsletterId}@newsletter`;
        }

    // Step 1: Fetch messages from the external API
        const apiUrl = `https://gate.whapi.cloud/newsletters/${newsletterId}/messages?count=${count}`;
    const headers = {
      accept: 'application/json',
            authorization: `Bearer ${process.env.WHAPI_KEY}`,
    };

        console.log('Making API request to:', apiUrl); // Debug log

    const response = await axios.get(apiUrl, { headers });

    // Extract the messages from the API response
        const { messages } = response.data;

    // Step 2: Save the messages into MongoDB
    const savedMessages = await Message.insertMany(messages); // Bulk insert messages

        // Step 3: Send a success response with the same structure as WHAPI.cloud
    res.status(200).json({
            messages: savedMessages,
            count: response.data.count,
            first: response.data.first,
            last: response.data.last
    });
  } catch (error) {
        console.error('Error fetching or saving messages:', error.response?.data || error.message);

    // Handle errors and send an appropriate response
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            res.status(error.response.status).json({
                message: 'Error from WHAPI service',
                error: error.response.data
            });
        } else if (error.request) {
            // The request was made but no response was received
            res.status(500).json({
                message: 'No response received from WHAPI service',
                error: error.message
            });
        } else {
            // Something happened in setting up the request that triggered an Error
            res.status(500).json({
                message: 'Error setting up the request',
                error: error.message
            });
        }
  }
});

// POST endpoint to clear message caches
router.post('/clear-cache', async (req, res) => {
    try {
        await clearCacheByPattern('messages:*');
        res.json({ message: 'Message caches cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error clearing caches', error: error.message });
    }
});

module.exports = router;