const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

module.exports = function(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    if(!token) {
        logger.warn(`No token provided for ${req.method} ${req.url}`);
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        logger.info(`Authenticated user ${req.user.id} for ${req.method} ${req.url}`);
        next();
    }catch(err) {
        logger.error(`Invalid token for ${req.method} ${req.url}: ${err.message}`);
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
