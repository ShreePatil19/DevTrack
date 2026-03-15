const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token missing or invalid' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            logger.warn(`Invalid JWT token used: ${err.message}`);
            return res.status(403).json({ error: 'Token is invalid or expired' });
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            logger.warn(`Unauthorized access attempt by user ${req.user?.id || 'unknown'} to ${req.originalUrl}`);
            return res.status(403).json({ error: 'Do not have permission to access this resource' });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
