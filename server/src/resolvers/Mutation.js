const jwt = require('jsonwebtoken');
const stripJs = require('strip-js');
const { APP_SECRET, FEEDBACK_EMAIL_ADDRESS } = require('../../config');
const { getUserInfo, validateEmail, validatePasswordComplexity, hashPassword, checkHashedPassword, delay } = require('../utils');
const { postGrade } = require('../lti');
const { sendEmail } = require('../email');
const emailTemplates = require('../emailTemplates');

const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;

// See the permissions.js file to see what rules are applied before these mutations even get executed. There are only a few mutations in here that handle their own permissions (startOrResumeQuizAttempt, completeQuizAttempt, rateConcepts, and attemptQuestion)

async function deleteCourse (root, args, context, info){
    return context.db.mutation.deleteCourse({
        where:{
            id:args.id
        }
    }, info)
}

function addCourse (root, args, context, info) {
    // Get user ID of instructor
    const { userId } = getUserInfo(context);

    // Generate the LTI/oauth secret for this course.
    const ltiSecret = require('crypto').randomBytes(16).toString('hex');

    // Create the new course, connected to the current instructor
    return context.db.mutation.createCourse({
        data:{
            title: args.title,
            ltiSecret,
            instructors: {
                connect: {
                    id: userId
                }
            },
        },
    }, info)
}

async function updateCourse (root, args, context, info) {
    // args.info is CourseInfoUpdateInput, which is a subset of CourseUpdateInput
    return context.db.mutation.updateCourse({
        data: args.info,
        where: {
            id:args.id
        }
    }, info)
}

async function updateSurvey (root, args, context, info) {
    return context.db.mutation.updateCourse({
        data: {
            survey: args.survey
        },
        where: {
            id: args.courseId
        }
    }, info);
}

async function createQuiz (root, args, context, info) {
    return context.db.mutation.createQuiz({
        data: {
            title: "Untitled Quiz",
            type: "GRADED",
            course: { connect: { id: args.courseId } }
        }
    }, info);
}

async function addQuestion (root, args, context, info) {
    // Sanitize HTML input for question prompt and options to remove any scripts and prevent XSS
    let { question } = args;
    question.prompt = stripJs(question.prompt);

    for (let i = 0; i < question.options.create.length; i++) {
        question.options.create[i].text = stripJs(question.options.create[i].text);
    }

    // Don’t sanitize short answers for now, since escaping characters like < and & messes up checking. Short answers are only ever plain text, and are never displayed using dangerouslySetInnerHTML, unlike prompt and multiple-choice options
    // for (let i = 0; i < question.correctShortAnswers.set.length; i++) {
    //     question.correctShortAnswers.set[i] = stripJs(question.correctShortAnswers.set[i]);
    // }

    const updatedQuiz = await context.db.mutation.updateQuiz({
        data: {
            questions: {
                create: [question]
            }
        },
        where:{ id: args.quizId }
    }, `{ questions { id } }`);

    // Return query for newly-added question (which will be at end)
    return context.db.query.question({
        where: {
            id: updatedQuiz.questions[updatedQuiz.questions.length - 1].id
        }
    }, info);
}

function updateQuiz(root, args, context, info) {
    return context.db.mutation.updateQuiz({
        data: {
            title: args.data.title,
            type: args.data.type,
            // TODO the quiz editor currently uses the addQuestion and updateQuestion mutations which sanitize question and option HTML, but that should be added in here as well, since questions and options can be imported via JSON, which will use this mutation.
            questions: args.data.questions
        },
        where:{
            id:args.id
        }
    }, info)
}

function deleteQuiz(root, args, context, info) {
    return context.db.mutation.deleteQuiz({
        where:{
            id: args.id
        }
    }, info)
}

function updateQuestion(root, args, context, info) {
    // Sanitize HTML input for question prompt and options to remove any scripts and prevent XSS
    let { data } = args;
    data.prompt = stripJs(data.prompt);
    for (let i = 0; i < data.options.update.length; i++) {
        data.options.update[i].data.text = stripJs(data.options.update[i].data.text);
    }
    // Don’t sanitize short answers for now, since escaping characters like < and & messes up checking. Short answers are only ever plain text, and are never displayed using dangerouslySetInnerHTML, unlike prompt and multiple-choice options
    // for (let i = 0; i < data.correctShortAnswers.set.length; i++) {
    //     data.correctShortAnswers.set[i]= stripJs(data.correctShortAnswers.set[i]);
    // }

    return context.db.mutation.updateQuestion({
        data,
        where: { id: args.id }
    }, info)   
}

function deleteQuestion(root, args, context, info) {
    return context.db.mutation.deleteQuestion({
        where:{
            id: args.id
        }
    }, info)
}

async function importQuestions(root, args, context, info) {
    
    const questions = await context.db.query.questions({
        where: { id_in: args.questionIds }
    }, `{ id, prompt, concept, type, correctShortAnswers, options { isCorrect, text } }`);

    let newQuestions = questions.map(question => {
        return {
            prompt: question.prompt,
            concept: question.concept,
            type: question.type,
            correctShortAnswers: {
                set: question.correctShortAnswers
            },
            options: {
                create: question.options
            }
        }
    });

    // Create new copied questions in the quiz
    return context.db.mutation.updateQuiz({
        data: {
            questions: {
                create: newQuestions
            }
        },
        where:{
            id: args.quizId
        }
    },info);
}

async function sendInstructorCourseInvite(root, args, context, info) {
    // Lower-case email
    const email = args.email.toLowerCase();
    // Validate email
    if (!validateEmail(email)) {
        throw new Error('Invalid email address');
    }

    // If an instructor account exists with that email
    const invitedInstructor = await context.db.query.instructor({
        where: { email }
    }, `{ id }`);
    if (invitedInstructor && invitedInstructor.id) {
        // Mutation to link the Course and Instructor
        const updatedInstructor = await context.db.mutation.updateInstructor({
            where: { id: invitedInstructor.id },
            data: {
                courses: { connect: { id: args.courseId } }
            }
        }, `{ courses { id, title } }`);

        // Get title to send in email
        const courseTitle = updatedInstructor.courses.filter(course => course.id === args.courseId)[0].title;
        // Send an email informing that they've been added to the course, with a link to view
        sendEmail(email, 'wadayano Course Invite', emailTemplates.courseAddedNotification(courseTitle, args.courseId));

        return `Success! ${email} can now access this course in their wadayano account`;
    }

    // If no instructor account for that email address,
    try {
        // Create a PendingCourseInvite for the given course ID and instructor email address, with 48-hour expiration
        const courseInvite = await context.db.mutation.createPendingCourseInvite({
            data: {
                email,
                course: { connect: { id: args.courseId } }
            }
        }, `{ id, course { id, title } }`);

        // Send an email informing that they've been added to the course, with a link to sign up, and a note that the course will be automatically added when they sign up
        sendEmail(email, 'wadayano Course Invite', emailTemplates.courseInviteNotification(courseInvite.course.title, args.courseId));

        return `Success! ${email} has been sent an invite to join wadayano. When the instructor signs up within 48 hours, this course will be automatically added to their account. You can resend this invite after 48 hours, if necessary.`;
    } catch (error) {
        throw new Error(`Unexpected error while inviting ${email}.`);
    }
}

// This takes email, rather than instructor ID, to handle both removing an instructor and cancel a pending invite in one mutation
async function removeInstructorFromCourse(root, args, context, info) {
    // Lower-case email
    const email = args.email.toLowerCase();

    try {
        // It could be a pending invite that should be canceled
        const invitesCanceled = await context.db.mutation.deleteManyPendingCourseInvites({
            where: {
                course: { id: args.courseId },
                email: email
            },
        }, `{ count }`);
        console.log(JSON.stringify(invitesCanceled));
        if (invitesCanceled.count > 0) {
            return 'Invite canceled';
        }

        // Prevent a user from removing the last instructor of a course
        const course = await context.db.query.course({
            where: { id: args.courseId }
        }, `{ instructors { id } }`);
        if (course.instructors.length === 1)  {
            return `${email} is the only instructor in this course, and cannot be removed. To transfer ownership of a course, invite another instructor and have them remove you from the course.`;
        }

        // Otherwise, try to remove the instructor from the course
        await context.db.mutation.updateCourse({
            where: { id: args.courseId },
            data: { instructors: { disconnect: { email } } }
        });
        return 'Instructor removed';
    } catch (error) {
        return 'Instructor was not in the course.';
    }
}

async function instructorLogin(root, args, context, info) {
    // Check that instructor exists
    const email = args.email.toLowerCase();
    const instructor = await context.db.query.instructor({ where: { email: email } }, ` { id, password } `);
    if (!instructor) {
        throw new Error('Invalid email and/or password');
    }

    // Check that password is valid
    const valid = await checkHashedPassword(args.password, instructor.password);
    if (!valid) {
        throw new Error('Invalid email and/or password');
    }

    // Sign token
    const token = jwt.sign({ userId: instructor.id, isInstructor: true }, APP_SECRET);

    // Return an InstructorAuthPayload
    return {
        token,
        instructor
    };
}

async function instructorSignup(root, args, context, info) {
    // Lower-case email
    const email = args.email.toLowerCase();
    // Validate email
    if (!validateEmail(email)) {
        throw new Error('Invalid email address');
    }

    // Validate password (and allow exceptions to bubble up)
    validatePasswordComplexity(args.password);

    // Hash password
    const password = await hashPassword(args.password);
    // Create instructor account
    const instructor = await context.db.mutation.createInstructor({
        data: { email, password },
    }, `{ id }`);

    // Sign token using id of newly-created user
    const token = jwt.sign({ userId: instructor.id, isInstructor: true }, APP_SECRET);

    // Check for any PendingCourseInvites for this email address
    const pendingInvites = await context.db.query.pendingCourseInvites({
        where: { email }
    }, `{ createdAt, course { id } }`);
    // Delete the invites after connecting the new instructor with the course
    pendingInvites.forEach(async invite => {
        // Check that invite isn't expired (48-hour limit)
        let inviteAge = new Date() - new Date(invite.createdAt);
        if (inviteAge <= MILLISECONDS_IN_DAY * 2) {
            await context.db.mutation.updateInstructor({
                where: { id: instructor.id },
                data: { courses: { connect: { id: invite.course.id } } }
            }, `{ id }`);
        }
    });
    await context.db.mutation.deleteManyPendingCourseInvites({
        where: { email }
    }, `{ count }`);

    // Return an InstructorAuthPayload
    return {
        token,
        instructor,
    };
}

async function instructorRequestPasswordReset(root, args, context, info) {
    const email = args.email.toLowerCase();
    // Validate email
    if (!validateEmail(email)) {
        throw new Error('Invalid email address');
    }
    // Determine if user exists
    const instructor = await context.db.query.instructor({ where: { email: email } }, ` { id } `);
    if (!instructor) {
        // If not found, return false
        return false;
    }

    // Create a password reset token
    const createToken = await context.db.mutation.createInstructorPasswordResetToken({
        data: {
            instructor: { connect: { id: instructor.id } }
        }
    }, `{ id }`);
    const token = createToken.id;

    console.log(emailTemplates.requestPasswordReset(token));

    // Send token in a password reset email to the instructor
    sendEmail(email, 'wadayano Password Reset Request', emailTemplates.requestPasswordReset(token));

    // Return boolean for "successful" or not (we dont’t know if email actually sent)
    return true;
}

async function instructorResetPassword(root, args, context, info) {
    // Check that the reset token exists and is valid
    const resetToken = await context.db.query.instructorPasswordResetToken({
        where: { id: args.token }
    }, `{ createdAt, instructor { id } }`);
    if (!resetToken) {
        throw Error('Invalid password reset request. The link in a password reset email can only be used once.');
    }

    let tokenAge = new Date() - new Date(resetToken.createdAt);
    if (tokenAge > MILLISECONDS_IN_DAY) {
        throw Error('This password reset request has expired.');
    }

    // Validate password (and allow exceptions to bubble up)
    validatePasswordComplexity(args.password);

    // Hash new password
    const password = await hashPassword(args.password);

    // Set new password on the instructor
    const updatedInstructor = await context.db.mutation.updateInstructor({
        where: { id: resetToken.instructor.id },
        data: { password },
    }, `{ id }`);

    // Delete the password reset token to prevent re-use
    await context.db.mutation.deleteInstructorPasswordResetToken({
        where: { id: args.token }
    });

    // Sign token using id of instructor
    const newToken = jwt.sign({ userId: resetToken.instructor.id, isInstructor: true }, APP_SECRET);

    // Return an InstructorAuthPayload, so user can be signed in immediately after resetting password
    return {
        token: newToken,
        instructor: updatedInstructor
    };
}

async function sendFeedback(root, args, context, info) {
    // Determine if user exists, if not sending anonymously
    const { isInstructor, userId } = getUserInfo(context);
    const user = await (isInstructor ? context.db.query.instructor : context.db.query.student)({ where: { id: userId }}, `{ id, email }`);
    if (!user) {
        // If not found, return false
        return false;
    }

    const { message, anonymous } = args;
    const sentFrom = anonymous ? 'Anonymous' : user.email;

    console.log(FEEDBACK_EMAIL_ADDRESS, 'wadayano Feedback – ' + new Date().toLocaleString(), emailTemplates.feedback(sentFrom, message));

    // Send feedback email to us
    sendEmail(FEEDBACK_EMAIL_ADDRESS, 'wadayano Feedback – ' + new Date().toLocaleString(), emailTemplates.feedback(sentFrom, message));

    // Return boolean for "successful" or not (we dont’t know if email actually sent)
    return true;
}

// This will only be practice launches. LTI launches are handled in lti.js
async function startOrResumeQuizAttempt(root, args, context, info) {
    // Check for valid student login
    const studentId = getUserInfo(context).userId;
    const quizId = args.quizId;

    // Check that student has access to the course that owns this quiz (LTI launch would automatically enroll, but practice launches shouldn't)
    const studentInCourse = await context.db.query.students({
        where: {
            id: studentId,
            courses_some: { quizzes_some: {id: quizId } }
        }
    }, `{ id }`);
    if (studentInCourse.length === 0) {
        throw Error('Student not enrolled in course that this quiz belongs to');
    }

    // Since the quiz attempt is unique on the combination of two fields (quizId and studentId), prisma's built-in upsert won't work
    // Find existing uncompleted attempt(s) for this student and quiz
    const existingAttempts = await context.db.query.quizAttempts({
        where: {
            quiz: { id: quizId },
            student: { id: studentId },
            completed: null
       }
    }, `{ id }`);

    // If there's an existing attempt, return it
    if (existingAttempts.length > 0) {
        console.log('Returning existing quiz attempt');
        return context.db.query.quizAttempt({ where: { id: existingAttempts[0].id } }, info);
    } else {
        // Otherwise create a new attempt and return it
        // This will only be practice launches. LTI launches are handled in lti.js
        // If it’s a graded quiz, block starting the attempt (since it must be LTI-launched first)
        const quiz = await context.db.query.quiz({
            where: { id: quizId }
        }, `{ id, type }`);

        if (quiz.type === 'GRADED') {
            throw Error('This is a graded quiz, and must be launched from your LMS.');
        }

        return context.db.mutation.createQuizAttempt({
            data: {
                quiz: { connect: { id: quizId } },
                student: { connect: { id: studentId } }
            }
        }, info);
        console.log('Created new quiz attempt');
    }
}

async function rateConcepts(root, args, context, info) {
    // Check for valid student login
    const studentId = getUserInfo(context).userId;

    // Get any existing conceptConfidences on the attempt to delete them (so concepts aren't duplicated)
    const attempt = await context.db.query.quizAttempt({
        where: { id: args.quizAttemptId }
    }, `{ student { id }, conceptConfidences { id } }`);

    // Check that student owns the given QuizAttempt
    if (attempt.student.id !== studentId) {
        throw Error('Quiz attempt belongs to a different student.');
    }

    // Update the quiz attempt, deleting old conceptConfidences and adding new ones
    return context.db.mutation.updateQuizAttempt({
        where: { id: args.quizAttemptId },
        data: {
            conceptConfidences: {
                delete: attempt.conceptConfidences,
                create: args.conceptConfidences
            }
        }
    }, info);
}

async function attemptQuestion(root, args, context, info) {
    // Check for valid student login
    const studentId = getUserInfo(context).userId;

    // Check that this question hasn't already been attempted in this QuizAttempt
    const existingQuizAttempt = await context.db.query.quizAttempt({
        where: {
           id: args.quizAttemptId
        }
    }, `{ student { id }, questionAttempts { id, question { id } } }`);
    
    // Check that student owns the given QuizAttempt
    if (existingQuizAttempt.student.id !== studentId) {
        throw Error('Quiz attempt belongs to a different student.');
    }

    // If it has been attempted, return the previous attempt (to help avoid cheating)
    if (existingQuizAttempt.questionAttempts && existingQuizAttempt.questionAttempts.length > 0) {
        for (let i = 0; i < existingQuizAttempt.questionAttempts.length; i++) {
            let attempt = existingQuizAttempt.questionAttempts[i];
            if (attempt.question.id === args.questionId) {
                console.log('Question already attempted. Attempt id: ' + attempt.id);
                return context.db.query.questionAttempt({
                    where: { id: attempt.id }
                }, info);
            }
        }
    }

    let attemptData = {
        question: {connect: {id: args.questionId}},
        isConfident: args.isConfident,
    };

    if (args.type === 'MULTIPLE_CHOICE') {
        // Get the correct option for this question
        const correctOption = (await context.db.query.options({
            where: {
                question: { id: args.questionId },
                isCorrect:true
            }
        }, `{ id }`))[0];

        if (!correctOption) {
            throw Error('There is no correct option for this question. Please contact your instructor.');
        }

        // Find out if this option was correct
        const isCorrect = args.optionId === correctOption.id;

        // Add multiple-choice-specific data to attemptData
        attemptData.option = {connect: {id: args.optionId}};
        attemptData.correctOption = {connect: {id: correctOption.id}};
        attemptData.isCorrect = isCorrect;

    } else {
        // Get the correct short answers for this question
        const correctShortAnswers = (await context.db.query.question({
            where: {
                id: args.questionId
            }
        }, `{ correctShortAnswers }`)).correctShortAnswers;

        if (correctShortAnswers.length === 0) {
            throw Error('There is no correct short answer for this question. Please contact your instructor.');
        }

        // Prepare student answer (whitespace and case are ignored when comparing with students’ responses)
        function prepareAnswer(answer) {
            // Ignore whitespace and case
            let comparableAnswer = answer.toLowerCase().replace(/\s/g,'')
            // Special case to handle both “0.14” and “.14” as correct by stripping leading 0s that are immediately followed by decimal
            comparableAnswer = comparableAnswer.replace(/^0+./, '.');
            return comparableAnswer;
        }

        let comparableStudentAnswer = prepareAnswer(args.shortAnswer);

        // Compare with each correct answer
        let isCorrect = false;
        let correctShortAnswer = correctShortAnswers[0];
        for (let i = 0; i < correctShortAnswers.length; i++) {
            let comparableAnswer = prepareAnswer(correctShortAnswers[i]);
            if (comparableAnswer === comparableStudentAnswer) {
                isCorrect = true;
                correctShortAnswer = correctShortAnswers[i];
                break;
            }
        }

        // Add short-answer-specific data to attemptData
        attemptData.shortAnswer = args.shortAnswer;
        attemptData.correctShortAnswer = correctShortAnswer;
        attemptData.isCorrect = isCorrect;
    }

    // Create a new question attempt (do this separately so it uses the correct selection set from the client)
    const result = await context.db.mutation.createQuestionAttempt({
        data: attemptData
    }, info);

    // Connect this question attempt to the quiz attempt (ideally, this would be done with a nested creation, but the client needs to send a selection set for QuestionAttempt, and the nested create would use that selection set on a QuizAttempt, which is no good)
    await context.db.mutation.updateQuizAttempt({
        where: {id: args.quizAttemptId},
        data: {
            questionAttempts: {
                connect: { id: result.id }
            }
        }
    }, `{ id }`);

    return result;
}

async function completeQuizAttempt(root, args, context, info) {
    // Check for valid student login
    const studentId = getUserInfo(context).userId;

    // Get info from this quiz attempt
    const attempt = await context.db.query.quizAttempt({
        where: { id: args.quizAttemptId }
    }, `{ id
        completed
        student { id }
        ltiSessionInfo
        quiz {
            id
            course {
                id
                ltiSecret
            }
            questions {
                concept
            }
        }
        questionAttempts {
            isCorrect
            isConfident
            question {
                concept
            }
        }
    }`);

    // Check that quizAttemptId is valid, not completed, and belongs to student
    if (!(attempt && (attempt.completed === null) && (attempt.student.id === studentId))) {
        throw new Error('Could not complete this quiz attempt.');
    }

    // Set completed to current timestamp
    const completed = new Date().toISOString();

    // Calculate score
    const correctCount = attempt.questionAttempts.filter(attempt => attempt.isCorrect).length || 0;
    const score = correctCount / attempt.quiz.questions.length;

    // Post the score back to LMS via LTI grade passback, if applicable
    let isGraded = false;
    let postSucceeded = null;
    let error = null;
    if (attempt.ltiSessionInfo && attempt.ltiSessionInfo.lis_outcome_service_url) {
        isGraded = true;
        postSucceeded = false;
        // Try posting the grade up to three times (intial, and two retries)
        let triesRemaining = 3;
        while (true) {
            triesRemaining--;
            try {
                let result = await postGrade(attempt.ltiSessionInfo, attempt.quiz.course.id, attempt.quiz.course.ltiSecret, score);
                postSucceeded = true;
                console.log('LTI grade passback successful!');
                break;
            } catch (err) {
                if (triesRemaining > 0) {
                    // Try posting grade again if there are remaining tries
                    console.log('LTI grade passback failed; retrying');
                    // Wait 2 seconds if last retry, otherwise 1
                    await delay(triesRemaining === 1 ? 2000 : 1000);
                    continue;
                } else {
                    // Otherwise mark it as failed, and send us a notification
                    postSucceeded = false;
                    error = JSON.stringify(err) || 'Error sending score';
                    console.log('LTI grade passback failed; not retrying', err);
                    console.log(FEEDBACK_EMAIL_ADDRESS, 'wadayano Grade Passback Failure', emailTemplates.passbackFailedNotification(error, attempt.id, attempt.ltiSessionInfo));
                    // Send email notifying us if passback failed
                    sendEmail(FEEDBACK_EMAIL_ADDRESS, 'wadayano Grade Passback Failure', emailTemplates.passbackFailedNotification(error, attempt.id, attempt.ltiSessionInfo));
                    // Break out of otherwise-infinite loop
                    break;
                }
            }
        }
    }

    // Update the QuizAttempt
    let updatedAttempt = await context.db.mutation.updateQuizAttempt({
        where: { id: args.quizAttemptId },
        data: {
            completed,
            score,
            postSucceeded
        }
    }, `{ id }`);

    // Return a QuizGradePayload (a separate entity type to wrap up the quiz attempt as well as info if the LTI grade passback was successful, etc.)
    console.log(isGraded, postSucceeded, error);
    return {
        isGraded,
        postSucceeded,
        quizAttempt: updatedAttempt,
        error
    };
}

async function submitSurveyResult(root, args, context, info) {
    // Check for valid student login
    const studentId = getUserInfo(context).userId;
    const { courseId, answers } = args;

    // Students can take a survey for a course multiple times, but we only store the latest submission
    await context.db.mutation.deleteManySurveyResults({
        where: {
            student: { id: studentId },
            course: { id: courseId }
        }
    }, `{ count }`);

    // Save the survey result, and connect it to the user and course
    return context.db.mutation.createSurveyResult({
        data: {
            answers,
            student: { connect: { id: studentId } },
            course: { connect: { id: courseId } }
        }
    }, info);
}

function trackEvent(root, args, context, info) {
    // Check for valid login (student or instructor)
    const { userId, isInstructor } = getUserInfo(context);
    if (userId === null) {
        return;
    }

    // Save the tracking event, and connect it to the user
    const { event } = args;
    console.log(event);
    return context.db.mutation.createTrackingEvent({
        data: {
            ...event,
            [isInstructor ? 'instructor' : 'student']: { connect: { id: userId } }
        }
    }, info);
}
    
module.exports = {
    addCourse,
    updateCourse,
    deleteCourse,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    deleteQuestion,
    updateQuestion,
    importQuestions,
    updateSurvey,
    sendInstructorCourseInvite,
    removeInstructorFromCourse,
    instructorLogin,
    instructorSignup,
    instructorRequestPasswordReset,
    instructorResetPassword,
    sendFeedback,
    startOrResumeQuizAttempt,
    completeQuizAttempt,
    attemptQuestion,
    rateConcepts,
    submitSurveyResult,
    trackEvent
}
