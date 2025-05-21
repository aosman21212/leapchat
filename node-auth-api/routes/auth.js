const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');
const { redisClient } = require('../config/redis');

require('dotenv').config();

const router = express.Router();

// Cache duration in seconds
const LOGIN_ATTEMPT_DURATION = 300; // 5 minutes
const SESSION_DURATION = 28800; // 8 hours (matching JWT expiry)

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    const user = new User({ username, email, password, confirmPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Check for too many login attempts
    const loginAttemptsKey = `login_attempts:${email}`;
    const loginAttempts = await redisClient.get(loginAttemptsKey);
    
    if (loginAttempts && parseInt(loginAttempts) >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many login attempts. Please try again later.'
      });
    }

    // Step 1: Find the user by email
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      // Increment failed login attempts
      await redisClient.incr(loginAttemptsKey);
      await redisClient.expire(loginAttemptsKey, LOGIN_ATTEMPT_DURATION);
      
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if user is deactivated
    if (user.isActive === false) {
      return res.status(403).json({ 
        status: 'error',
        message: 'Your account has been deactivated. Please contact your administrator.'
      });
    }

    // Step 2: Generate a JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    // Step 3: Save the token to Redis for session management
    const sessionKey = `session:${user._id}`;
    await redisClient.setex(sessionKey, SESSION_DURATION, token);

    // Step 4: Save the token to the user's document
    user.token = token;
    await user.save();

    // Clear login attempts on successful login
    await redisClient.del(loginAttemptsKey);

    // Step 5: Send the token back to the client
    return res.status(200).json({ 
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'An error occurred while logging in'
    });
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

    // Invalidate user session in Redis
    const sessionKey = `session:${req.params.id}`;
    await redisClient.del(sessionKey);

    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/logout', authMiddleware(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Remove session from Redis
    const sessionKey = `session:${user._id}`;
    await redisClient.del(sessionKey);

    user.token = null; // Clear the token
    await user.save();

    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Error during logout:', error.message);
    res.status(500).json({ message: 'An error occurred while logging out.' });
  }
});

// Reset user password (only superadmin can do this)
router.post('/reset-password/:id', authMiddleware(['superadmin']), async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'New password is required'
            });
        }

        // Find the user
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Update the password
        user.password = newPassword;
        // Clear any existing tokens
        user.token = null;

        // Remove session from Redis
        const sessionKey = `session:${user._id}`;
        await redisClient.del(sessionKey);

        await user.save();

        // Log the password reset
        console.log('Password reset for user:', {
            id: user._id,
            email: user.email,
            resetBy: req.user.id
        });

        res.json({
            status: 'success',
            message: 'Password reset successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error resetting password',
            error: error.message
        });
    }
});

module.exports = router;