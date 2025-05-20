const express = require('express');
const Channel = require('../models/Channel'); // Import the Channel model
const authMiddleware = require('../middleware/authMiddleware'); // Import the auth middleware

const router = express.Router();

// Fetch all channels from the database
router.get('/', authMiddleware(), async (req, res) => {
  try {
    // Query the 'channels' collection
    const channels = await Channel.find().sort({ createdAt: -1 }); // Sort by most recent

    // Send the response back to the client
    res.status(200).json({
      message: 'Channels fetched successfully.',
      data: channels,
    });
  } catch (error) {
    console.error('Error fetching channels:', error.message);

    // Handle errors and send an appropriate response
    res.status(500).json({ message: 'An error occurred while fetching channels.' });
  }
});

module.exports = router;