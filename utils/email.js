const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const logger = require('./logger');

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendWelcomeEmail(email, name){
    try{
        await transporter.sendMail({
            from:'aspsadfs',
            to: email,
            subject: 'Welcome to Expense Tracker',
            text: `Hi ${name}, \n\nWelcome to Expense Tracker! Start managing your expenses today.\n\nBest,\nThe Expense Tracker Team`
        });
        logger.info(`Welcome email sent to ${email}`);
    }catch(err) {
        logger.error(`Failed to send welcome email to ${email}: ${err.message}`);
    }
}

module.exports = { sendWelcomeEmail };
