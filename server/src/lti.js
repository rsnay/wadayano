const querystring = require('querystring');
const pathUtils = require('path');
const lti = require('ims-lti');
const jwt = require('jsonwebtoken');

// TODO These will eventually need to come from the database, and likely be course-specific
const consumer_key = 'jisc.ac.uk';
const consumer_secret = 'secret';

// This shouldn't be necessary in production, if it's on the same server. In that case, this would be empty '' (no trailing slash)
const CLIENT_BASE_URL = (process.env.NODE_ENV !== 'production') ? 'http://localhost:3001' : '';

/**
 * Called from the main server functions to handle an incoming LTI launch request.
 * @param {*} config - config file from /server/config.js
 * @param {*} db - Prisma DB isntance
 * @param {*} req - request object from express server
 * @param {*} res - response object from express server
 */
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

            // Enroll the student in the course that this launch belongs to, if necessary
            // TODO

            // If this is a quiz 
            if (action === 'quiz') {
                let quizId = parameter1;
                // Start a quiz attempt and stick the LTI passback info in it
                // Use provider.body instead of body, since the provider will take out the oauth info, which we don't want to store
                _upsertQuizAttempt(db, studentId, quizId, provider.body);
            }
            
            let redirectURL = `${CLIENT_BASE_URL}/student/launch/${token}/${action}/${parameter1}`;
            // For some reason, immediately redirecting (either via http, meta tag, or javascript) will fail if it's launched in an iframe. So just give them a link to continue in a new window if we detect it's in an iframe.
            //res.redirect(redirectURL); // Won't work in an iframe
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(`<html><body><script>function inIframe(){try{return window.self!==window.top}catch(n){return!0}} !inIframe() && window.location.replace('${redirectURL}');</script><h3><a href="${redirectURL}" target="_blank">Continue &gt;</a></h3></body></html>`);
        }
    });
}


/**
 * Called from the resolver for the completeQuizAttemptMutation, to send a grade to the LMS via grade passback
 * @param {*} ltiSessionInfo - JSON object
 * @param {*} score - float in range 0 - 1.0 to post to tool consumer
 * @returns {Promise<void>} - promise will resolve if grade post succeeded
 */
function postGrade(ltiSessionInfo, score) {
    const outcomeService = new lti.OutcomeService({
        consumer_key,
        consumer_secret,
        service_url: ltiSessionInfo.lis_outcome_service_url,
        source_did: ltiSessionInfo.lis_result_sourcedid
    });
    return new Promise((resolve, reject) => {
        outcomeService.send_replace_result(score, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}


/**
 * Upserts a student with the given params. Will return the ID of the student
 * @param {*} db - Prisma DB instance
 * @param {*} ltiUserId - student's user_id in the LTI launch request
 * @param {*} name - display name for the student
 * @param {*} email - student's email
 * @returns student's internal user ID
 */
async function _upsertStudentOnLaunch(db, ltiUserId, name, email) {
    const student = await db.mutation.upsertStudent({
        where: { ltiUserId },
        create: { ltiUserId, name, email },
        update: { name, email }
    }, `{ id }`);
    return student.id;
}

/**
 * Creates or updates an LTI-launched quiz attempt
 * @param {*} db - Prisma DB instance
 * @param {*} studentId - student's internal user ID (NOT LTI user_id)
 * @param {*} quizId - interal Quiz ID
 * @param {*} ltiSessionInfo - non-serialized object containing the body of the  LTI launch request
 */
async function _upsertQuizAttempt(db, studentId, quizId, ltiSessionInfo) {
    // Since the quiz attempt is unique on the combination of two fields (quizId and studentId), prisma's built-in upsert won't work
    // Find existing uncompleted attempt(s) for this student and quiz
    const existingAttempts = await db.query.quizAttempts({
        where: {
            quiz: { id: quizId },
            student: { id: studentId },
            completed: null
       }
    }, `{ id }`);

    // If there's an existing attempt, update the LTI session info
    if (existingAttempts.length > 0) {
        try {
            await db.mutation.updateQuizAttempt({
                where: { id: existingAttempts[0].id},
                data: { ltiSessionInfo }
            }, `{ id }`);
            console.log('Updated existing quiz attempt');
            
        } catch (error) {
            console.log(error);
            
        }
    } else {
        // Otherwise create a new attempt
        await db.mutation.createQuizAttempt({
            data: {
                quiz: { connect: { id: quizId } },
                student: { connect: { id: studentId } },
                ltiSessionInfo
            }
        });
        console.log('Created new quiz attempt');
    }
}


module.exports = {
    handleLaunch,
    postGrade
}