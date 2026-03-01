const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── Google OAuth2 Routes ─────────────────────────────────────────────────────
// Initiate Google OAuth flow
router.get('/google', (req, res, next) => {
  try {
    const passport = require('passport');
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
  } catch {
    res.status(503).json({ error: 'Google OAuth is not configured on this server' });
  }
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  try {
    const passport = require('passport');
    passport.authenticate('google', { session: false }, (err, data) => {
      if (err || !data) {
        const message = err?.message || 'Google authentication failed';
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(message)}`);
      }
      // Redirect to frontend with token in query param (frontend stores it)
      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${data.token}`;
      return res.redirect(redirectUrl);
    })(req, res, next);
  } catch {
    res.status(503).json({ error: 'Google OAuth is not configured on this server' });
  }
});

// Register validation
router.post('/register',
  body('companyName').trim().notEmpty().withMessage('Company name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').notEmpty().withMessage('Password confirmation required'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number required'),
  AuthController.register
);

// Login validation
router.post('/login',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  AuthController.login
);

// Refresh token
router.post('/refresh-token', AuthController.refreshToken);

// Get profile (requires auth)
router.get('/profile', authenticate, AuthController.getProfile);

// Update profile (requires auth)
router.put('/profile', authenticate, AuthController.updateProfile);

// Logout (requires auth)
router.post('/logout', authenticate, AuthController.logout);

// Generate / regenerate API key for the authenticated company
router.post('/api-key', authenticate, async (req, res) => {
  try {
    const Company = require('../models/Company');
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const apiKey = company.generateApiKey();
    await company.save();
    res.json({ success: true, apiKey });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

module.exports = router;
