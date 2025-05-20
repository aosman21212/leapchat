const express = require('express');
const axios = require('axios');
const authMiddleware = require('../middleware/authMiddleware'); // Import the auth middleware

const router = express.Router();

// Regular expression for validating the ID
const idRegex = /^[0-9]{10,18}@newsletter$/;

// Get a specific channel by ID
router.get('/:id', authMiddleware(), async (req, res) => {
  try {
    let { id } = req.params;
    const queryParams = req.query; // Extract query parameters (e.g., user role)

    // Step 1: Decode and sanitize the ID
    id = decodeURIComponent(id.trim()); // Remove whitespace and decode URL-encoded characters
    console.log('Decoded ID:', id); // Log the decoded ID for debugging

    // Step 2: Validate the ID format using the regex
    if (!idRegex.test(id)) {
      console.error('Invalid ID format:', id); // Log invalid IDs for debugging
      return res.status(400).json({
        message:
          'Invalid Channel ID. It must be a 10-18 digit number followed by "@newsletter".',
      });
    }

    // Step 3: Construct the API URL without query parameters
    const apiUrl = `https://gate.whapi.cloud/newsletters/${id}`;
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.WHAPI_KEY}`,
    };

    console.log('Making API request with URL:', apiUrl);

    // Step 4: Make the API request without query parameters
    const response = await axios.get(apiUrl, { headers });

    // Step 5: Send the response back to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching channel:', error.response?.data || error.message);

    // Handle errors and send an appropriate response
    if (error.response) {
      res.status(error.response.status).json({ message: error.response.data });
    } else {
      res.status(500).json({ message: 'An error occurred while fetching the channel.' });
    }
  }
});

module.exports = router;