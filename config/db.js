const mongoose = require('mongoose');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

dotenv.config();

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            w: 'majority'
        });
        logger.info('MongoDB connected ...');
    }catch(err) {
        logger.error(`MongoDB connection failed: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
