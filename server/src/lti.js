const querystring = require('querystring');
const pathUtils = require('path');
const lti = require('ims-lti');
const jwt = require('jsonwebtoken');

// TODO These will eventually need to come from the database, and likely be course-specific
const consumer_key = 'jisc.ac.uk';
const consumer_secret = 'secret';

// This shouldn't be necessary in production, if it's on the same server. In that case, this would be empty '' (no trailing slash)
const CLIENT_BASE_URL = 'http://localhost:3001';

function handleLaunch(config, db, req, res) {
    // Get body and params
    const body = req.body;
	const action = req.params.action;
	const parameter1 = req.params.parameter1;

	// Log info
	console.log(`We got an LTI request for ${action} ${parameter1}!! ${req.method} ${req.url}`);

    // Set up LTI provider
    let provider = new lti.Provider(consumer_key, consumer_secret);
    
    // Check for user_id, lis_person_name_full, and lis_person_contact_email_primary
    if (!(body.user_id && body.lis_person_name_full && body.lis_person_contact_email_primary)) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Error validating request: missing required parameters');
    }

    // Validate request
    provider.valid_request(req, body, async (error, isValid) => {
        if (!isValid) {
            console.log('Error validating request: ' + error);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Error validating request: ' + error);
        } else {
            console.log(`LTI request is valid for LTI user ${body.user_id}!`);
            // Create or update the user (upsert in Prisma lingo)
            const studentId = await _upsertStudentOnLaunch(db, body.user_id, body.lis_person_name_full, body.lis_person_contact_email_primary);
            console.log(`Upserted student ID ${studentId}`);

            // If request is valid, generate an auth token to pass to the client to use
            const token = jwt.sign({ userId: studentId, isInstructor: false }, config.APP_SECRET);

            // If this is a quiz 
            if (action === 'quiz') {
                // Enroll the student in the course that belongs to this quiz, if necessary
                // TODO
                let quizId = parameter1;
                // Start a quiz attempt and stick the LTI passback info in it
                // TODO
            }
            
            let redirectURL = `${CLIENT_BASE_URL}/student/launch/${token}/${action}/${parameter1}`;
            // For some reason, immediately redirecting (either via http, meta tag, or javascript) will fail if it's launched in an iframe. So just give them a link to continue in a new window if we detect it's in an iframe.
            //res.redirect(redirectURL); // Won't work in an iframe
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(`<html><body><script>function inIframe(){try{return window.self!==window.top}catch(n){return!0}} !inIframe() && window.location.replace('${redirectURL}');</script><h3><a href="${redirectURL}" target="_blank">Continue ></a></h3></body></html>`);
        }
    });
}

// Upserts a student with the given params. Will return the ID of the student
async function _upsertStudentOnLaunch(db, ltiUserId, name, email) {
    const student = await db.mutation.upsertStudent({
        where: { ltiUserId },
        create: { ltiUserId, name, email },
        update: { name, email }
    }, `{ id }`);
    return student.id;
}


module.exports = {
    handleLaunch
}