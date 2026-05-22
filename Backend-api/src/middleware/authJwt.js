const { User, Token } = require('../models');



// Middleware to verify token validity and attach user info to req.user
exports.verifyToken = async (req, res, next) => {
  try {
    // Assume token comes in Authorization header as: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const tokenValue = authHeader.split(' ')[1];

    // Find token and check expiry
    const token = await Token.findOne({
      where: { token: tokenValue },
      include: User
    });

    if (!token) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (!token.User || !token.User.is_active) {
      return res.status(403).json({ message: 'User inactive or not found' });
    }

    // Attach user info to request
    req.user = {
      id: token.User.id,
      email: token.User.email,
      role: token.User.role,
      first_name: token.User.first_name,
      last_name: token.User.last_name,
    };

    next();

  } catch (err) {
    console.error('verifyToken error:', err);
    res.status(500).json({ message: 'Server error verifying token' });
  }
};

// Middleware factory to check if user's role matches allowed role
exports.checkRole = (roleName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (req.user.role !== roleName) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    next();
  };
};




