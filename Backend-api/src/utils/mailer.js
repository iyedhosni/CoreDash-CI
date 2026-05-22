const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host:     process.env.EMAIL_HOST,
  port:     parseInt(process.env.EMAIL_PORT, 10),
  secure:   process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email.
 * @param {string} to     Recipient email address
 * @param {string} subject
 * @param {string} html    HTML body
 */
async function sendMail(to, subject, html) {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to,
    subject,
    html
  });
}

module.exports = { sendMail };