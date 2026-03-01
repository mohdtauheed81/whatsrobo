const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const logger = require('./logger');

const setupPassport = () => {
  // ─── JWT Strategy ──────────────────────────────────────────────────────────
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
      },
      async (payload, done) => {
        try {
          const Company = require('../models/Company');
          const company = await Company.findById(payload.companyId).select('-password');
          if (!company) return done(null, false);
          return done(null, company);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // ─── Google OAuth2 Strategy ────────────────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const Company = require('../models/Company');
            const jwt = require('jsonwebtoken');

            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email from Google profile'), false);

            // Find existing company or create one via Google SSO
            let company = await Company.findOne({ email });

            if (!company) {
              // Auto-register new company via Google OAuth
              const bcrypt = require('bcryptjs');
              const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

              company = await Company.create({
                companyName: profile.displayName || email.split('@')[0],
                email,
                password: randomPassword,
                googleId: profile.id,
                isEmailVerified: true, // Google already verified the email
                subscriptionStartDate: new Date(),
                subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
              });
              logger.info('New company registered via Google OAuth', { companyId: company._id, email });
            } else {
              // Link Google ID if not already linked
              if (!company.googleId) {
                await Company.findByIdAndUpdate(company._id, { googleId: profile.id });
              }
            }

            // Generate JWT token
            const token = jwt.sign(
              { companyId: company._id, email: company.email },
              process.env.JWT_SECRET,
              { expiresIn: process.env.JWT_EXPIRY || '7d' }
            );

            return done(null, { company, token });
          } catch (err) {
            logger.error('Google OAuth strategy error', { error: err.message });
            return done(err, false);
          }
        }
      )
    );
    logger.info('Google OAuth2 strategy registered');
  } else {
    logger.warn('Google OAuth2 not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required');
  }

  return passport;
};

module.exports = { setupPassport, passport };
