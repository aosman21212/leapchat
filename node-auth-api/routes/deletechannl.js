const express = require('express');
const router = express.Router();
const axios = require('axios');

const authMiddleware = require('../middleware/authMiddleware');



// DELETE endpoint to delete a newsletter
router.delete('/:newsletterId', authMiddleware(), async (req, res) => {
    try {
        const { newsletterId } = req.params;

        // Make request to WHAPI.cloud
        const response = await axios.delete(
            `https://gate.whapi.cloud/newsletters/${newsletterId}`,
            {
                headers: {
                    'accept': 'application/json',
                    'authorization': `Bearer ${process.env.WHAPI_KEY}`
                }
            }
        );

        // Return the response from WHAPI.cloud
        res.json(response.data);

    } catch (error) {
        console.error('Error deleting newsletter:', error.response?.data || error.message);

        // Handle different types of errors
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

module.exports = router;
