const jwt = require('jsonwebtoken');


/**
 * @typedef {Object} JwtPayload
 * @property {string} userId - The user ID from the JWT payload
 * @property {number} iat - Issued at timestamp
 * @property {number} exp - Expiration timestamp
 */

/**
 * Authentication middleware that verifies JWT tokens
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {Promise<void>}
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'MISSING_TOKEN'
      });
    }

    /** @type {JwtPayload} */
    const payload = await new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          const errorCode = err.name === 'TokenExpiredError' 
            ? 'TOKEN_EXPIRED' 
            : 'INVALID_TOKEN';
          return reject({ 
            status: 403, 
            error: 'Invalid or expired token',
            code: errorCode
          });
        }
        resolve(decoded);
      });
    });

    // Verify payload structure
    if (!payload?.userId) {
      return res.status(403).json({
        error: 'Invalid token payload',
        code: 'INVALID_PAYLOAD'
      });
    }

    req.user = {
      id: payload.userId,
      iat: payload.iat,
      exp: payload.exp
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const status = error.status || 500;
    res.status(status).json({
      error: error.error || 'Authentication failed',
      code: error.code || 'AUTH_ERROR'
    });
  }
};

module.exports = { authenticateToken };
