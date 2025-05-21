const express = require('express');
const axios = require('axios');
const Channel = require('../models/Channel');
const Message = require('../models/Message'); // Import a new Message model (if needed)
 // Import the Channel model
const authMiddleware = require('../middleware/authMiddleware'); // Import the auth middleware
const { cacheMiddleware, clearCacheByPattern } = require('../config/redis');

const router = express.Router();

// Cache duration in seconds
const CACHE_DURATION = 300; // 5 minutes

// First API: Fetch newsletters with Redis caching
router.get('/', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
  try {
    const apiUrl = 'https://gate.whapi.cloud/newsletters';
    const queryParams = {
      count: 100
    };
    const headers = {
      'accept': 'application/json',
      'authorization': `Bearer ${process.env.WHAPI_KEY}`
    };

    console.log('Making API request to:', apiUrl);
    console.log('Headers:', headers);

    // Make the API request
    const response = await axios.get(apiUrl, { params: queryParams, headers });

    console.log('API Response received:', response.data);

    // Process each newsletter in the response
    if (response.data && response.data.newsletters) {
      for (const newsletter of response.data.newsletters) {
        try {
          const channelData = {
            id: newsletter.id,
            name: newsletter.name,
            type: 'newsletter',
            chat_pic: newsletter.chat_pic,
            chat_pic_full: newsletter.chat_pic_full,
            created_at: newsletter.created_at,
            invite_code: newsletter.invite_code,
            verification: newsletter.verification,
            description_at: newsletter.description_at,
            description: newsletter.description,
            preview: newsletter.preview,
            role: newsletter.role
          };
          
          console.log('Saving channel data:', channelData);
          // Use findOneAndUpdate with upsert to prevent duplicates
          await Channel.findOneAndUpdate(
            { id: newsletter.id }, // Find by unique id
            channelData, // Update with new data
            { 
              upsert: true, // Create if doesn't exist
              new: true, // Return the updated document
              setDefaultsOnInsert: true // Apply schema defaults on insert
            }
          );
        } catch (dbError) {
          console.error('Error saving individual newsletter:', dbError);
          console.error('Newsletter data that failed:', newsletter);
      }
      }
    } else {
      console.log('No newsletters found in response:', response.data);
    }

    // Send the response back to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Detailed error information:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
      stack: error.stack
    });

    // Handle errors and send an appropriate response
    if (error.response) {
      // If the API returns a non-2xx status code
      res.status(error.response.status).json({ 
        message: error.response.data,
        error: error.message
      });
    } else {
      // For other errors (e.g., network issues)
      res.status(500).json({ 
        message: 'An error occurred while fetching newsletters.',
        error: error.message
      });
    }
  }
});

// Fetch messages with Redis caching
router.get('/messages', authMiddleware(), cacheMiddleware(CACHE_DURATION), async (req, res) => {
  try {
    const apiUrl = 'https://gate.whapi.cloud/messages/list';
    const queryParams = {
      count: 100,
    };
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.WHAPI_KEY}`,
    };

    // Make the API request
    const response = await axios.get(apiUrl, { params: queryParams, headers });

    // Save messages with duplicate prevention
    if (response.data && response.data.messages) {
      for (const message of response.data.messages) {
        try {
          await Message.findOneAndUpdate(
            { messageId: message.id }, // Assuming each message has a unique id
            { 
              data: message,
              createdAt: new Date()
            },
            { 
              upsert: true,
              new: true,
              setDefaultsOnInsert: true
            }
          );
        } catch (dbError) {
          console.error('Error saving individual message:', dbError);
          console.error('Message data that failed:', message);
        }
      }
    }

    // Send the response back to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching messages:', error.response?.data || error.message);

    // Handle errors and send an appropriate response
    if (error.response) {
      // If the API returns a non-2xx status code
      res.status(error.response.status).json({ message: error.response.data });
    } else {
      // For other errors (e.g., network issues)
      res.status(500).json({ message: 'An error occurred while fetching messages.' });
    }
  }
});

// Force refresh newsletters (clears cache and fetches fresh data)
router.post('/refresh', authMiddleware(), async (req, res) => {
  try {
    // Clear all meta-related caches
    await clearCacheByPattern('cache:/api/meta*');
    
    // Make a new request to fetch fresh data
    const apiUrl = 'https://gate.whapi.cloud/newsletters';
    const queryParams = { count: 100 };
    const headers = {
      'accept': 'application/json',
      'authorization': `Bearer ${process.env.WHAPI_KEY}`
    };

    const response = await axios.get(apiUrl, { params: queryParams, headers });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error refreshing newsletters:', error);
    res.status(500).json({ 
      message: 'An error occurred while refreshing newsletters.',
      error: error.message
    });
  }
});

module.exports = router;