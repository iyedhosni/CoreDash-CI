const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { User, Token } = require('../models');
const twoFactorAuthService = require('../services/twoFactorAuth.service');

const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

// Helper function to generate and send token
async function issueToken(res, user) {
  const tokenValue = uuidv4();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

  await Token.create({
    token: tokenValue,
    user_id: user.id,
    expires_at: expiresAt,
  });

  res.json({
    token: tokenValue,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      isEmailTwoFactorEnabled: user.isEmailTwoFactorEnabled,
    },
    expires_at: expiresAt,
  });
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or inactive user' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check if 2FA is enabled
    if (user.isEmailTwoFactorEnabled) {
      try {
        await twoFactorAuthService.setAndSendVerificationCode(user.id);
        // Send a temporary token or user identifier for the next step
        return res.json({ 
          twoFactorRequired: true, 
          userId: user.id, // Or a temporary signed token for this 2FA attempt
          message: 'A verification code has been sent to your email.' 
        });
      } catch (error) {
        console.error('2FA code sending error:', error);
        return res.status(500).json({ message: 'Failed to send 2FA code. Please try again.' });
      }
    } else {
      // No 2FA, proceed to issue token
      await issueToken(res, user);
    }

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.verifyEmail2FALogin = async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ message: 'User ID and code are required.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isValid = await twoFactorAuthService.verifyCode(user.id, code);

    if (isValid) {
      await issueToken(res, user);
    } else {
      res.status(401).json({ message: 'Invalid or expired 2FA code.' });
    }
  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({ message: 'Error verifying 2FA code.' });
  }
};

// --- 2FA Setup/Management Endpoints (require authentication) ---

exports.requestEmail2FASetup = async (req, res) => {
  console.log(`[AuthController] ENTER: requestEmail2FASetup for user ${req.user?.id}, method: ${req.method}`);
  // Assuming req.user is populated by an authentication middleware
  const userId = req.user.id; 
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'User not found.'});
    if (user.isEmailTwoFactorEnabled) {
        return res.status(400).json({ message: 'Email 2FA is already enabled.' });
    }

    await twoFactorAuthService.setAndSendVerificationCode(userId);
    res.json({ message: 'A verification code has been sent to your email to enable 2FA.' });
  } catch (error) {
    console.error('Request 2FA setup error:', error);
    res.status(500).json({ message: 'Failed to request 2FA setup.' });
  }
};

exports.verifyEmail2FASetup = async (req, res) => {
  console.log(`[AuthController] ENTER: verifyEmail2FASetup for user ${req.user?.id}, method: ${req.method}`);
  const userId = req.user.id;
  const { code } = req.body;

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (!code) {
    return res.status(400).json({ message: 'Verification code is required.' });
  }

  try {
    const isValid = await twoFactorAuthService.verifyCode(userId, code);
    if (isValid) {
      await twoFactorAuthService.enableEmailTwoFactor(userId);
      res.json({ message: 'Email 2FA has been successfully enabled.' });
    } else {
      res.status(400).json({ message: 'Invalid or expired verification code.' });
    }
  } catch (error) {
    console.error('Verify 2FA setup error:', error);
    res.status(500).json({ message: 'Failed to verify 2FA setup.' });
  }
};

exports.disableEmail2FA = async (req, res) => {
  console.log(`[AuthController] ENTER: disableEmail2FA for user ${req.user?.id}, method: ${req.method}`);
  const userId = req.user.id;
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  // Optional: Add password verification here for extra security before disabling
  // const { password } = req.body;
  // const user = await User.findByPk(userId);
  // if (!user || !await bcrypt.compare(password, user.password)) {
  //   return res.status(401).json({ message: 'Invalid password.' });
  // }

  try {
    await twoFactorAuthService.disableEmailTwoFactor(userId);
    res.json({ message: 'Email 2FA has been disabled.' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ message: 'Failed to disable 2FA.' });
  }
};

exports.logout = async (req, res) => {
  try {
    // Assume token is in Authorization header "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // If no token is provided, we can still consider this a successful logout
      // since the client is trying to log out anyway
      return res.json({ message: 'Logged out successfully' });
    }

    const tokenValue = authHeader.split(' ')[1];

    // Delete token from DB to invalidate
    try {
      await Token.destroy({ where: { token: tokenValue } });
      // Even if no rows were deleted (token not found), we consider this a success
      // since the end result is the same - the user is logged out
      return res.json({ message: 'Logged out successfully' });
    } catch (dbError) {
      console.error('Database error during logout:', dbError);
      // Even if there's a DB error, we'll still return success to the client
      // since the client-side cleanup will still happen
      return res.json({ message: 'Logged out successfully' });
    }
  } catch (err) {
    console.error('Unexpected error during logout:', err);
    // Even in case of unexpected errors, we'll return success to the client
    // since the client-side cleanup will still happen
    res.json({ message: 'Logged out successfully' });
  }
};

// --- Change Password --- (Requires authentication)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.user.id; // Assuming protect middleware populates req.user

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({ message: 'All password fields are required.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'New passwords do not match.' });
  }

  // Optional: Add password strength validation for newPassword here
  if (newPassword.length < 6) { // Example: Minimum length
    return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10); // Salt rounds = 10
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error during password change.' });
  }
};
