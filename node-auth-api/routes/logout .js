const express = require('express');
const jwt = require('jsonwebtoken');
const TokenBlacklist = require('../models/TokenBlacklist'); // Import the TokenBlacklist model

const router = express.Router();

// Logout route
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ message: 'No token provided.' });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');

    // Verify the token (optional, for additional security)
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid token.' });
    }

    // Add the token to the blacklist
    const blacklistedToken = new TokenBlacklist({ token });
    await blacklistedToken.save();

    // Respond with success
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error during logout:', error.message);
    res.status(500).json({ message: 'An error occurred while logging out.' });
  }
});

module.exports = router;