const express = require('express');
const axios = require('axios');
const Channel = require('../models/Channel');
const Message = require('../models/Message'); // Import a new Message model (if needed)
 // Import the Channel model
const authMiddleware = require('../middleware/authMiddleware'); // Import the auth middleware

const router = express.Router();

// First API: Fetch newsletters
router.get('/', authMiddleware(), async (req, res) => {
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
          // Save to database
          await Channel.create(channelData);
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

router.get('/messages', authMiddleware(), async (req, res) => {
  try {
    const apiUrl = 'https://gate.whapi.cloud/messages/list ';
    const queryParams = {
      count: 100, // Number of messages to fetch
    };
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.WHAPI_KEY}`,
    };

    // Make the API request
    const response = await axios.get(apiUrl, { params: queryParams, headers });

    // Optionally save the response to the 'message' collection
    const messageData = new Message({
      data: response.data, // Save the entire response data
      createdAt: new Date(),
    });
    await messageData.save();

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

module.exports = router;