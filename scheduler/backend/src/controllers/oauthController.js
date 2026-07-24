const axios = require('axios');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Google OAuth redirect
const googleAuth = (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback')}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')}&` +
    `access_type=offline`;
  
  res.redirect(googleAuthUrl);
};

// Google OAuth callback
const googleCallback = async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      grant_type: 'authorization_code',
    });

    const { access_token } = tokenResponse.data;

    // Get Google user info
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = userResponse.data;

    // Find or create user
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        provider: 'google',
        providerId: googleUser.id,
        avatar: googleUser.picture,
        emailVerified: true,
      });
    } else if (user.provider === 'local') {
      user.providerId = googleUser.id;
      user.avatar = user.avatar || googleUser.picture;
      await user.save();
    }

    generateToken(res, user._id);
    res.redirect(`${frontendUrl}/?oauth=success`);
  } catch (error) {
    console.error('Google OAuth Error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
};

// GitHub OAuth redirect
const githubAuth = (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!process.env.GITHUB_CLIENT_ID) {
    return res.redirect(`${frontendUrl}/login?error=github_not_configured`);
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${process.env.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback')}&` +
    `scope=user:email`;

  res.redirect(githubAuthUrl);
};

// GitHub OAuth callback
const githubCallback = async (req, res) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendUrl}/login?error=no_code`);
  }

  try {
    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const { access_token } = tokenResponse.data;

    // Get GitHub profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const githubUser = userResponse.data;

    // Get GitHub email if private
    let email = githubUser.email;
    if (!email) {
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const primaryEmail = emailResponse.data.find((e) => e.primary);
      email = primaryEmail ? primaryEmail.email : emailResponse.data[0]?.email;
    }

    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=no_email`);
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: githubUser.name || githubUser.login,
        email,
        provider: 'github',
        providerId: String(githubUser.id),
        avatar: githubUser.avatar_url,
        emailVerified: true,
      });
    } else if (user.provider === 'local') {
      user.providerId = String(githubUser.id);
      user.avatar = user.avatar || githubUser.avatar_url;
      await user.save();
    }

    generateToken(res, user._id);
    res.redirect(`${frontendUrl}/?oauth=success`);
  } catch (error) {
    console.error('GitHub OAuth Error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
};

module.exports = {
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
};
