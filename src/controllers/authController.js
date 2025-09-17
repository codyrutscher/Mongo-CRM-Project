const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthController {
  // Generate JWT token
  generateToken(userId) {
    const secret = process.env.JWT_SECRET || 'prospere-crm-default-secret-key-2024';
    logger.info(`Generating JWT token for user: ${userId}`);
    return jwt.sign(
      { userId },
      secret,
      { expiresIn: '7d' }
    );
  }

  // Register new user
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, role = 'user' } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        role
      });

      await user.save();

      // Generate token
      const token = this.generateToken(user._id);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          token
        },
        message: 'User registered successfully'
      });

    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      logger.info('=== LOGIN ATTEMPT START ===');
      const { email, password } = req.body;

      if (!email || !password) {
        logger.error('Missing email or password in request');
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      logger.info(`Login attempt for email: ${email}`);

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        logger.warn(`User not found: ${email}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      logger.info(`User found: ${user.email}, role: ${user.role}`);

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        logger.warn(`Invalid password for user: ${email}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      logger.info(`Login successful for user: ${email}`);

      // Update last login
      await user.updateLastLogin();

      // Generate token
      const token = this.generateToken(user._id);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      res.json({
        success: true,
        data: {
          user: userResponse,
          token
        },
        message: 'Login successful'
      });

    } catch (error) {
      logger.error('Login error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: `Login failed: ${error.message}`
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { firstName, lastName } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { firstName, lastName, updatedAt: new Date() },
        { new: true, select: '-password' }
      );

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user.userId).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      user.updatedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }

  // Logout (client-side token removal)
  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}

module.exports = new AuthController();