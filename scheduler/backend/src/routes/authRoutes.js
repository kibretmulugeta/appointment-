const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
} = require('../controllers/authController');
const {
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
} = require('../controllers/oauthController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getUserProfile);

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// GitHub OAuth
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

module.exports = router;
