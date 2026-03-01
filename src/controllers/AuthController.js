const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

class AuthController {
  // Register new company
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { companyName, email, password, confirmPassword, phoneNumber } = req.body;

      // Check password match
      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      // Check if company exists
      const existingCompany = await Company.findOne({ email: email.toLowerCase() });
      if (existingCompany) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Get default subscription plan (Starter)
      const starterPlan = await SubscriptionPlan.findOne({ name: 'Starter' });
      if (!starterPlan) {
        logger.error('Starter plan not found');
        return res.status(500).json({ error: 'System configuration error' });
      }

      // Calculate subscription end date (30 days from now)
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

      // Create new company
      const company = new Company({
        companyName,
        email: email.toLowerCase(),
        password,
        phoneNumber,
        subscriptionPlan: starterPlan._id,
        subscriptionEndDate
      });

      await company.save();
      logger.info('New company registered', { companyId: company._id, email });

      // Generate JWT token
      const token = jwt.sign(
        { companyId: company._id, email: company.email, role: company.role || 'user' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.status(201).json({
        message: 'Company registered successfully',
        company: {
          _id: company._id,
          companyName: company.companyName,
          email: company.email,
          role: company.role || 'user',
          subscriptionPlan: starterPlan.name
        },
        token
      });
    } catch (error) {
      logger.error('Registration error', {
        error: error.message,
        stack: error.stack,
        code: error.code
      });

      // Handle specific errors
      if (error.code === 11000) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      if (error.message.includes('validation failed')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message || 'Registration failed' });
    }
  }

  // Login
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find company with password field
      const company = await Company.findOne({ email: email.toLowerCase() })
        .select('+password')
        .populate('subscriptionPlan');

      if (!company) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Compare passwords
      const isPasswordValid = await company.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if subscription is active
      const now = new Date();
      if (company.subscriptionEndDate < now) {
        company.isSubscriptionActive = false;
        await company.save();
      }

      // Update last login
      company.lastLoginAt = new Date();
      await company.save();

      // Generate JWT token
      const token = jwt.sign(
        { companyId: company._id, email: company.email, role: company.role || 'user' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      logger.info('Company logged in', { companyId: company._id });

      res.json({
        message: 'Login successful',
        company: {
          _id: company._id,
          companyName: company.companyName,
          email: company.email,
          role: company.role || 'user',
          subscriptionPlan: company.subscriptionPlan.name,
          isSubscriptionActive: company.isSubscriptionActive,
          daysRemaining: company.daysRemaining
        },
        token
      });
    } catch (error) {
      logger.error('Login error', { error: error.message });
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token required' });
      }

      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
      const company = await Company.findById(decoded.companyId).populate('subscriptionPlan');

      if (!company) {
        return res.status(401).json({ error: 'Company not found' });
      }

      const newToken = jwt.sign(
        { companyId: company._id, email: company.email, role: company.role || 'user' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      res.json({
        message: 'Token refreshed',
        token: newToken
      });
    } catch (error) {
      logger.error('Token refresh error', { error: error.message });
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Get current company profile
  static async getProfile(req, res) {
    try {
      const company = await Company.findById(req.companyId)
        .populate('subscriptionPlan')
        .select('-password');

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      res.json({
        company: {
          _id: company._id,
          companyName: company.companyName,
          email: company.email,
          role: company.role || 'user',
          phoneNumber: company.phoneNumber,
          website: company.website,
          country: company.country,
          subscriptionPlan: company.subscriptionPlan,
          subscriptionEndDate: company.subscriptionEndDate,
          isSubscriptionActive: company.isSubscriptionActive,
          usageStats: company.usageStats,
          daysRemaining: company.daysRemaining
        }
      });
    } catch (error) {
      logger.error('Get profile error', { error: error.message });
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  // Update company profile (also handles password change)
  static async updateProfile(req, res) {
    try {
      const { companyName, phoneNumber, website, country, address, currentPassword, newPassword } = req.body;

      // Handle password change
      if (newPassword) {
        if (!currentPassword) return res.status(400).json({ error: 'Current password is required to set a new password' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

        const company = await Company.findById(req.companyId).select('+password');
        if (!company) return res.status(404).json({ error: 'Company not found' });

        const bcrypt = require('bcryptjs');
        const valid = await bcrypt.compare(currentPassword, company.password);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        company.password = newPassword; // pre-save hook will hash it
        await company.save();
        logger.info('Password changed', { companyId: req.companyId });
        return res.json({ success: true, message: 'Password changed successfully' });
      }

      // Handle profile update
      const update = {};
      if (companyName !== undefined) update.companyName = companyName;
      if (phoneNumber !== undefined) update.phoneNumber = phoneNumber;
      if (website !== undefined) update.website = website;
      if (country !== undefined) update.country = country;
      if (address !== undefined) update.address = address;

      const company = await Company.findByIdAndUpdate(req.companyId, update, { new: true, runValidators: true })
        .populate('subscriptionPlan').select('-password');

      logger.info('Company profile updated', { companyId: req.companyId });
      res.json({ success: true, message: 'Profile updated successfully', company });
    } catch (error) {
      logger.error('Update profile error', { error: error.message });
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // Logout (token invalidation handled on frontend)
  static async logout(req, res) {
    try {
      logger.info('Company logged out', { companyId: req.companyId });
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      logger.error('Logout error', { error: error.message });
      res.status(500).json({ error: 'Logout failed' });
    }
  }
}

module.exports = AuthController;
