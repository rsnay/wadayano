// Copy this file and rename it to config.js, and replace the variables with your configuration
const APP_SECRET = 'SECRET';

const APP_SERVER_PORT = 4000;

const PRISMA_ENDPOINT = 'ENDPOINT';
const PRISMA_SECRET = 'SECRET';

const AWS_SES_ENDPOINT = 'https://email.us-west-2.amazonaws.com';
const AWS_SES_KEY = 'example';
const AWS_SES_SECRET = 'example';
const AWS_SES_FROM_ADDRESS = 'no-reply@example.com';

module.exports = {
    APP_SECRET,
    APP_SERVER_PORT,
    PRISMA_ENDPOINT,
    PRISMA_SECRET,
    AWS_SES_ENDPOINT,
    AWS_SES_KEY,
    AWS_SES_SECRET,
    AWS_SES_FROM_ADDRESS
};
