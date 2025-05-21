const express = require('express');
const Channel = require('../models/Channel'); // Import the Channel model
const authMiddleware = require('../middleware/authMiddleware'); // Import the auth middleware

const router = express.Router();

// Fetch all channels from the database
router.get('/', authMiddleware(), async (req, res) => {
  try {
    // Query the 'channels' collection with specific fields
    const channels = await Channel.find()
      .select('id name type chat_pic chat_pic_full created_at invite_code verification description_at description preview role createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    // Format the response to match the exact structure
    const formattedChannels = channels.map(channel => ({
      id: channel.id || channel.data?.id || '',
      name: channel.name || '',
      type: channel.type || 'newsletter',
      chat_pic: channel.chat_pic || '',
      chat_pic_full: channel.chat_pic_full || '',
      created_at: channel.created_at || Math.floor(Date.now() / 1000),
      invite_code: channel.invite_code || '',
      verification: channel.verification || false,
      description_at: channel.description_at || '',
      description: channel.description || '',
      preview: channel.preview || '',
      role: channel.role || 'subscriber',
      createdAt: channel.createdAt ? new Date(channel.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: channel.updatedAt ? new Date(channel.updatedAt).toISOString() : new Date().toISOString()
    }));

    // Send the response back to the client
    res.status(200).json({
      success: true,
      message: 'Channels fetched successfully.',
      data: formattedChannels
    });
  } catch (error) {
    console.error('Error fetching channels:', error.message);

    // Handle errors and send an appropriate response
    res.status(500).json({ 
      success: false,
      message: 'An error occurred while fetching channels.',
      error: error.message 
    });
  }
});

module.exports = router;