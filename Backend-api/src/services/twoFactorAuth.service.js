const crypto = require('crypto');
const { User } = require('../models'); // Assuming models are exported from an index.js in models directory
const { sendMail } = require('../utils/mailer');

const VERIFICATION_CODE_LENGTH = 6;
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

/**
 * Generates a random numeric verification code.
 * @returns {string} A 6-digit numeric code.
 */
function generateVerificationCode() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Sends the verification code to the user's email.
 * @param {string} userEmail - The email address of the user.
 * @param {string} code - The verification code to send.
 */
async function sendVerificationEmail(userEmail, code) {
  const subject = 'Your Two-Factor Authentication Code';
  const htmlBody = `
    <p>Hello,</p>
    <p>Your verification code is: <strong>${code}</strong></p>
    <p>This code will expire in ${VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>
    <p>If you did not request this code, please ignore this email.</p>
  `;
  try {
    await sendMail(userEmail, subject, htmlBody);
    console.log(`2FA verification email sent to ${userEmail}`);
  } catch (error) {
    console.error(`Failed to send 2FA verification email to ${userEmail}:`, error);
    throw new Error('Failed to send verification email.');
  }
}

/**
 * Sets a new verification code for the user, saves it to the database, and sends it via email.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<void>}
 * @throws {Error} If user not found or email sending fails.
 */
async function setAndSendVerificationCode(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

  user.emailVerificationCode = code; // Storing plain code for simplicity, consider hashing for production
  user.emailVerificationCodeExpiresAt = expiresAt;
  await user.save();

  await sendVerificationEmail(user.email, code);
}

/**
 * Verifies the submitted code for a user.
 * @param {number} userId - The ID of the user.
 * @param {string} submittedCode - The code submitted by the user.
 * @returns {Promise<boolean>} True if the code is valid, false otherwise.
 * @throws {Error} If user not found.
 */
async function verifyCode(userId, submittedCode) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  if (
    user.emailVerificationCode === submittedCode &&
    user.emailVerificationCodeExpiresAt &&
    user.emailVerificationCodeExpiresAt > new Date()
  ) {
    // Code is valid, clear it after use
    user.emailVerificationCode = null;
    user.emailVerificationCodeExpiresAt = null;
    await user.save();
    return true;
  }

  return false;
}

/**
 * Enables email 2FA for the user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<void>}
 * @throws {Error} If user not found.
 */
async function enableEmailTwoFactor(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('User not found.');
    }
    user.isEmailTwoFactorEnabled = true;
    user.emailVerificationCode = null; // Clear any pending codes
    user.emailVerificationCodeExpiresAt = null;
    await user.save();
}

/**
 * Disables email 2FA for the user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<void>}
 * @throws {Error} If user not found.
 */
async function disableEmailTwoFactor(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('User not found.');
    }
    user.isEmailTwoFactorEnabled = false;
    user.emailVerificationCode = null;
    user.emailVerificationCodeExpiresAt = null;
    await user.save();
}

module.exports = {
  setAndSendVerificationCode,
  verifyCode,
  enableEmailTwoFactor,
  disableEmailTwoFactor,
};
