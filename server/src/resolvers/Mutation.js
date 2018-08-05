const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET } = require('../../config');
const { getUserInfo, validateEmail } = require('../utils');
const { postGrade } = require('../lti');

function updateOption (root, args, context, info){
    return context.db.mutation.updateOption({
        data:{
            isCorrect: args.isCorrect,
            text: args.text
        },
        where:{
            id:args.id
        }
    }, info)
}

function deleteCourse (root, args, context, info){
    return context.db.mutation.deleteCourse({
        where:{
            id:args.id
        }
    }, info)
}

function addCourse (root, args, context, info) {
    // Make sure user is logged in and an instructor
    const { isInstructor, userId } = getUserInfo(context);
    if (!isInstructor) {
        throw new Error('Not authenticated as an instructor');
    }

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
            concepts:{
                set:["Example Concept"]
            },
            quizzes:{
                create:[{
                    title:"Example Quiz",
                    questions:{
                        create:[{
                            prompt: "Enter Prompt Here",
                            concept: "Example Concept",
                            options: {
                                create:[{
                                    isCorrect: true,
                                    text: "OptionA"
                                },
                                {
                                    isCorrect: false,
                                    text: "OptionB"
                                },
                                {
                                    isCorrect: false,
                                    text: "OptionC"
                                },
                                {
                                    isCorrect: false,
                                    text: "OptionD"
                                }]
                            }
                        }]
                    }
                }]
            }
        },
    }, info)
}

function updateCourse (root, args, context, info) {
    return context.db.mutation.updateCourse({
        data: {
            title:args.title
        },
        where: {
            id:args.id
        }
    }, info)
}

function updateSurvey (root, args, context, info) {
    return context.db.mutation.updateCourse({
        data: {
            survey: args.survey
        },
        where: {
            id: args.courseId
        }
    }, info);
}

function addQuiz (root, args, context, info) {
    return context.db.mutation.updateCourse({
      data: {
        quizzes:{
            create:[{
                title: "Quiz Title",
                questions: {
                create: [{
                    prompt: "Enter Prompt Here",
                    options: {
                    create: [{
                            isCorrect: true,
                            text: "OptionA"
                        },
                        {
                            isCorrect: false,
                            text: "OptionB"
                        },
                        {
                            isCorrect: false,
                            text: "OptionC"
                        },
                        {
                            isCorrect: false,
                            text: "OptionD"
                        }]
                    }
                }]
            }
            }]
        }
    },
    where:{
        id:args.id
    }
    },info)
}

function addQuestion (root, args, context, info) {
    return context.db.mutation.updateQuiz({
      data: {
        //title: root.title,
        questions: {
          create: [{
            prompt: "Enter Prompt Here",
            options: {
               create:[{
                    isCorrect: true,
                    text: "OptionA"
                },
                {
                    isCorrect: false,
                    text: "OptionB"
                },
                {
                    isCorrect: false,
                    text: "OptionC"
                },
                {
                    isCorrect: false,
                    text: "OptionD"
                }]
            }
        }]
      }
    },
    where:{
        id:args.id
    }
    },info)
}

function updateQuiz(root, args, context, info) {
    return context.db.mutation.updateQuiz({
        data:{
            title:args.title,
            concepts:args.concepts
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

function deleteQuestion(root, args, context, info) {
    return context.db.mutation.deleteQuestion({
        where:{
            id: args.id
        }
    }, info)
}

function updateQuestion(root, args, context, info){
    return context.db.mutation.updateQuestion({
        data:{
            prompt: args.prompt,
        },
        where:{
            id:args.id
        }
    }, info)
}

function conceptQuestion (root, args, context, info) {
    return context.db.mutation.updateQuestion({
        data: {
            concept:args.title
        },
        where:{
            id:args.id
        }
    })
}

function conceptQuiz (root, args, context, info) {
    return context.db.mutation.updateQuiz({
        data: {
            concepts:{
                set:args.concepts
            }
        },
        where:{
            id:args.id
        }
    })
}
function conceptCourse (root, args, context, info){
    return context.db.mutation.updateCourse({
        data: {
            concepts:{
                set:args.concepts
            }
        },
        where:{
            id:args.id
        }
    })
}

async function instructorLogin(root, args, context, info) {
    // Check that instructor exists
    const email = args.email.toLowerCase();
    const instructor = await context.db.query.instructor({ where: { email: email } }, ` { id, password } `);
    if (!instructor) {
        throw new Error('Invalid email and/or password');
    }

    // Check that password is valid
    const valid = await bcrypt.compare(args.password, instructor.password);
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
    // Hash password
    const password = await bcrypt.hash(args.password, 10);
    // Create instructor account
    const instructor = await context.db.mutation.createInstructor({
        data: { email, password },
    }, `{ id }`);

    // Sign token using id of newly-created user
    const token = jwt.sign({ userId: instructor.id, isInstructor: true }, APP_SECRET);

    // Return an InstructorAuthPayload
    return {
        token,
        instructor,
    };
}

async function startOrResumeQuizAttempt(root, args, context, info) {
    // TODO quizId: ID!, studentId: ID!): QuizAttempt!

    // Check for valid student login
    const studentId = getUserInfo(context).userId;
    const quizId = args.quizId;

    // Check that student has access to the course that owns this quiz
    // TODO

    // Check availability date of quiz
    // TODO

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
    // Get any existing conceptConfidences on the attempt to delete them (so concepts aren't duplicated)
    const attempt = await context.db.query.quizAttempt({
        where: { id: args.quizAttemptId }
    }, `{ conceptConfidences { id } }`);

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

    console.log('Attempt question', args);

    // Check that student owns the given QuizAttempt
    // TODO

    // Check availability date of quiz hasn't expired since starting
    // TODO

    // Check that this question hasn't already been attempted in this QuizAttempt
    const existingQuizAttempt = await context.db.query.quizAttempt({
        where: {
           id: args.quizAttemptId
        }
    }, `{ questionAttempts { id, question { id } } }`);
    
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

    // Get the correct option for this question
    const correctOption = (await context.db.query.options({
        where: {
            question: { id: args.questionId },
            isCorrect:true
        }
    }, `{ id }`))[0];

    // Find out if this option was correct
    const isCorrect = args.optionId === correctOption.id;

    // Create a new question attempt (do this separately so it uses the correct selection set from the client)
    const result = await context.db.mutation.createQuestionAttempt({
        data: {
            question: {connect: {id: args.questionId}},
            option: {connect: {id: args.optionId}},
            correctOption: {connect: {id: correctOption.id}},
            isCorrect: isCorrect,
            isConfident: args.isConfident,
        }
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

    // Check that all questions were attempted
    // TODO is this necessary?

    // Set completed to current timestamp
    const completed = new Date().toISOString();
    console.log(attempt);
    console.log(attempt.questionAttempts.filter(attempt => attempt.isCorrect).length);

    // Calculate score
    const correctCount = attempt.questionAttempts.filter(attempt => attempt.isCorrect).length || 0;
    const score = correctCount / attempt.quiz.questions.length;

    // Calculate totalConfidenceError
    // TODO use a not-random number
    const totalConfidenceError = Math.round(Math.random() * 10 ) / 10;

    // Calculate totalConfidenceBias
    // TODO use a not-random number
    const totalConfidenceBias = Math.round(Math.random() * 10 ) / 10;

    // For each ConceptConfidence in conceptConfidences
        // Calculate confidenceError
        // TODO

        // Calculate confidenceBias
        // TODO
    
    // Post the score back to LMS via LTI grade passback, if applicable
    let isGraded = false;
    let postSucceeded = null;
    let error = null;
    if (attempt.ltiSessionInfo && attempt.ltiSessionInfo.lis_outcome_service_url) {
        isGraded = true;
        postSucceeded = false;
        try {
            let result = await postGrade(attempt.ltiSessionInfo, attempt.quiz.course.id, attempt.quiz.course.ltiSecret, score);
            postSucceeded = true;
            console.log('LTI grade passback successful!');
        } catch (err) {
            postSucceeded = false;
            error = JSON.stringify(err) || 'Error sending score';
            console.log('LTI grade passback failed', err);
        }
    }

    // Update the QuizAttempt
    let updatedAttempt = await context.db.mutation.updateQuizAttempt({
        where: { id: args.quizAttemptId },
        data: {
            completed,
            score,
            postSucceeded,
            totalConfidenceError,
            totalConfidenceBias
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
    
module.exports = {
    addQuiz,
    addCourse,
    updateCourse,
    deleteCourse,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    conceptQuestion,
    conceptQuiz, 
    conceptCourse,
    updateOption,
    updateSurvey,
    instructorLogin,
    instructorSignup,
    startOrResumeQuizAttempt,
    completeQuizAttempt,
    attemptQuestion,
    rateConcepts,
}
