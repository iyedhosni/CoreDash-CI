const { User, Token } = require('../models'); 
require('dotenv').config(); 

const protect = async (req, res, next) => {
  console.log(`[Protect Middleware] ENTER: ${req.method} ${req.originalUrl}`);
  let tokenValue;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      tokenValue = req.headers.authorization.split(' ')[1];

      const tokenEntry = await Token.findOne({ 
        where: { token: tokenValue },
        include: [
          {
            model: User,  // No alias used in the association
            attributes: { exclude: ['password'] }  // Exclude password for security
          }
        ]
      });

      console.log('[Protect Middleware] Token entry found:', {
        token: tokenEntry?.token,
        userId: tokenEntry?.user_id,
        user: tokenEntry?.User ? 'exists' : 'missing',
        expiresAt: tokenEntry?.expires_at
      });

      if (!tokenEntry) {
        console.log('[Protect Middleware] EXIT: Token not found in DB');
        return res.status(401).json({ message: 'Not authorized, token not found' });
      }

      if (tokenEntry.expires_at < new Date()) {
        await Token.destroy({ where: { token: tokenValue } });
        console.log('[Protect Middleware] EXIT: Token expired');
        return res.status(401).json({ message: 'Not authorized, token expired' });
      }

      // Access the associated user (note the uppercase 'User')
      if (!tokenEntry.User) { 
        console.log('[Protect Middleware] EXIT: User for token not found. Available properties:', Object.keys(tokenEntry));
        return res.status(401).json({ message: 'Not authorized, user associated with token not found' });
      }
      
      const { password, ...userWithoutPassword } = tokenEntry.User.get({ plain: true });
      req.user = userWithoutPassword;

      console.log(`[Protect Middleware] EXIT: Calling next() for user ${req.user.id}`); 
      next();
      return; 
    } catch (error) {
      console.error('[Protect Middleware] EXIT: Token verification failed:', error); 
      return res.status(401).json({ message: 'Not authorized, token processing failed' });
    }
  } else {
    console.log('[Protect Middleware] No Bearer token in authorization header or header missing.');
  }

  if (!tokenValue) { 
    console.log('[Protect Middleware] EXIT: No token provided (final check / fall-through)'); 
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
  console.log('[Protect Middleware] EXIT: Reached end of middleware unexpectedly.');
};

const errorHandler = (err, req, res, next) => {
    console.error(err.stack || err);
    const status = err.status || 500;
    const msg    = err.message || 'Internal Server Error';
    res.status(status).json({ error: msg });
  };

module.exports = { protect, errorHandler };