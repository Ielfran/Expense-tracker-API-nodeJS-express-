const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
    logger.error(`Unhandled error in ${req.method} ${req.url}: ${err.message}`);
    res.status(500).json({ msg: 'Internal server error', error: err.message });
};
