const ses = require('node-ses');
const { AWS_SES_ENDPOINT, AWS_SES_KEY, AWS_SES_SECRET, AWS_SES_FROM_ADDRESS } = require('../config');

// Send an email using Amazon SES
const sendEmail = function(to, subject, message) {
    // Log
    console.log('Sending email', to, subject, message);

    const client = ses.createClient({ amazon: AWS_SES_ENDPOINT, key: AWS_SES_KEY, secret: AWS_SES_SECRET });

    client.sendEmail({
        to,
        //to: 'success@simulator.amazonses.com',
        from: AWS_SES_FROM_ADDRESS,
        subject,
        message
    }, function(err, data, res) { console.log(err, data) });

    // TODO should we switch to promise-based SES module to be able to return success/failure?
}

module.exports = {
    sendEmail
};
