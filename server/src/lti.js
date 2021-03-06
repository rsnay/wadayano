const querystring = require('querystring');
const pathUtils = require('path');
const lti = require('ims-lti');
const jwt = require('jsonwebtoken');
const { PRISMA_ENDPOINT } = require('../config');

// This shouldn't be necessary in production, if it's on the same server. In that case, this would be empty '' (no trailing slash)
const CLIENT_BASE_URL = PRISMA_ENDPOINT.match('production') ? '' : 'http://localhost:3001';

/**
 * Called from the main server functions to handle an incoming LTI launch request.
 * @param {*} config - config file from /server/config.js
 * @param {*} db - Prisma DB isntance
 * @param {*} req - request object from express server
 * @param {*} res - response object from express server
 */
async function handleLaunch(config, db, req, res) {
    // Get body and params
    const body = req.body;
	const action = req.params.action || req.query.action;
    const objectId = req.params.objectId || req.query.objectId;
    // Oauth consumer key will be course ID
    const courseId = body.oauth_consumer_key;

	// Log info
    console.log(`We got an LTI request for ${action} ${objectId}!! ${req.method} ${req.url}`);
    
    // Check for user_id, lis_person_name_full, and lis_person_contact_email_primary
    if (!(body.user_id && body.lis_person_name_full && body.lis_person_contact_email_primary)) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Error validating request: missing required parameters. user_id, lis_person_name_full, and lis_person_contact_email_primary are required.');
        return;
    }

    // Get the consumer_secret from the database
    const courseInfo = await db.query.course({
        where: {
            id: courseId
       }
    }, `{ ltiSecret, consentFormUrl }`);
    console.log(courseInfo);
    if (!courseInfo || !courseInfo.ltiSecret) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Error validating request: invalid consumer key (course id)');
        return;
    }

    // Set up LTI provider. courseId is key, and secret is from database
    let provider = new lti.Provider(courseId, courseInfo.ltiSecret);
    
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
            _enrollStudentInCourse(db, studentId, courseId);

            // If this is a quiz 
            if (action === 'quiz') {
                let quizId = objectId;
                // Start a quiz attempt and stick the LTI passback info in it
                // Use provider.body instead of body, since the provider will take out the oauth info, which we don't want to store
                _upsertQuizAttempt(db, studentId, quizId, provider.body);
            }

            let redirectUrl;
            // If the course has a consent form the student has not seen, go to the form
            const consentRequired = courseInfo.consentFormUrl && courseInfo.consentFormUrl.trim().length > 0;
            const consentSaved = await _checkStudentCourseConsent(db, studentId, courseId);
            if (consentRequired && !consentSaved) {
                redirectUrl = `${CLIENT_BASE_URL}/student/consent/${courseId}/${token}/${action}/${objectId}`;
            } else {
                // Otherwise redirect to the desired content
                redirectUrl = `${CLIENT_BASE_URL}/student/launch/${token}/${action}/${objectId}`;
            }

            // CLIENT_BASE_URL should be '' on production
            if (req.hostname.indexOf('wadayano.com') >= 0) {
                redirectUrl.replace(CLIENT_BASE_URL, '');
            }
            
            // For some reason, immediately redirecting (either via http, meta tag, or javascript) will fail if it's launched in an iframe. So just give them a link to continue in a new window if we detect it's in an iframe.
            //res.redirect(redirectUrl); // Won't work in an iframe
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(`<html><body><script>function inIframe(){try{return window.self!==window.top}catch(n){return!0}} !inIframe() && window.location.replace('${redirectUrl}');</script><h3><a href="${redirectUrl}" target="_blank">Continue &gt;</a></h3></body></html>`);
        }
    });
}


/**
 * Called from the resolver for the completeQuizAttemptMutation, to send a grade to the LMS via grade passback
 * @param {object} ltiSessionInfo - JSON object containing LTI session info stored in QuizAttempt
 * @param {string} courseId - internal ID of the course that the quiz belongs to
 * @param {string} ltiSecret - the LTI secret of the course that the quiz belongs to
 * @param {float} score - float in range 0 - 1.0 to post to tool consumer
 * @returns {Promise<void>} - promise will resolve if grade post succeeded
 */
function postGrade(ltiSessionInfo, courseId, ltiSecret, score) {
    return new Promise((resolve, reject) => {
        const outcomeService = new lti.OutcomeService({
            consumer_key: courseId,
            consumer_secret: ltiSecret,
            service_url: ltiSessionInfo.lis_outcome_service_url,
            source_did: ltiSessionInfo.lis_result_sourcedid
        });
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
 * Enrolls the student with the given studentId in a given course
 * @param {*} db - Prisma DB instance
 * @param {*} studentId - student's internal user ID (NOT LTI user_id)
 * @param {*} courseId - internal Course ID
 * @returns void
 */
async function _enrollStudentInCourse(db, studentId, courseId) {
    const student = await db.mutation.updateStudent({
        where: { id: studentId },
        data: { courses: { connect: { id: courseId } } }
    }, `{ id }`);
    return student.id;
}

/**
 * Creates or updates an LTI-launched quiz attempt
 * @param {*} db - Prisma DB instance
 * @param {*} studentId - student's internal user ID (NOT LTI user_id)
 * @param {*} quizId - internal Quiz ID
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

/**
 * Checks if a student has saved a consent preference for a course
 * @param {*} db - Prisma DB instance
 * @param {*} studentId - student's internal user ID (NOT LTI user_id)
 * @param {*} courseId - internal Course ID
 * @returns {boolean} true if the student has saved consent
 */
async function _checkStudentCourseConsent(db, studentId, courseId) {
    const courseConsents = await db.query.courseConsents({
        where: {
            student: { id: studentId },
            course: { id: courseId }
        }
    });
    const consentSaved = courseConsents && courseConsents.length > 0;
    console.log(courseConsents, consentSaved);
    return consentSaved;
}


module.exports = {
    handleLaunch,
    postGrade
}