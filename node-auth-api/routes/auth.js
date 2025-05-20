const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');
const TokenBlacklist = require('../models/TokenBlacklist'); // Import the TokenBlacklist model

require('dotenv').config();

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password,confirmPassword, } = req.body;
    const user = new User({ username, email, password ,confirmPassword,});
    await user.save();
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login user
// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Step 1: Find the user by email
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Step 2: Generate a JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Step 3: Save the token to the user's document
    user.token = token; // Save the token in the database
    await user.save();

    // Step 4: Send the token back to the client
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ message: 'An error occurred while logging in.' });
  }
});

// Update user role (only superadmin can do this)
router.put('/update-role/:id', authMiddleware(['superadmin']), async (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// router.post('/logout', async (req, res) => {
//   try {
//     const authHeader = req.header('Authorization');
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(400).json({ message: 'No token provided.' });
//     }

//     // Extract the token
//     const token = authHeader.replace('Bearer ', '');

//     // Verify the token (optional, for additional security)
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (error) {
//       return res.status(400).json({ message: 'Invalid token.' });
//     }

//     // Find the user and remove their refresh token
//     const user = await User.findById(decoded.id);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     user.refreshToken = null; // Revoke the refresh token
//     await user.save();

//     // Respond with success
//     res.status(200).json({ message: 'Logged out successfully.' });
//   } catch (error) {
//     console.error('Error during logout:', error.message);
//     res.status(500).json({ message: 'An error occurred while logging out.' });
//   }
// });
router.post('/logout', authMiddleware(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.token = null; // Clear the token
    await user.save();

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error during logout:', error.message);
    res.status(500).json({ message: 'An error occurred while logging out.' });
  }
});
module.exports = router;