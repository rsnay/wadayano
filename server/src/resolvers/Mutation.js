const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET } = require('../../config');
const { getUserInfo, validateEmail } = require('../utils');

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
    return context.db.mutation.updateInstructor({
        data:{
            courses:{
                create:[{
                    title: args.title,
                    concepts:{
                        create:[{
                            title:"concept"
                        }]
                    },
                    quizzes:{
                        create:[{
                            title:"Quiz Title",
                            questions:{
                                create:[{
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
                        }]
                    }
                    
                }]
            }
        },
        where:{
            id:getUserInfo(context).userId
        }
    }, info)
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
            title:args.title
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

async function instructorLogin(root, args, context, info) {
    // Check that instructor exists
    console.log(args.email, args.password);
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

async function attemptQuestion(root, args, context, info) {
    // Check for valid student login
    const studentId = getUserInfo(context).userId;

    // Check that student owns the given QuizAttempt
    // TODO

    // Check availability date of quiz hasn't expired since starting
    // TODO

    // Check that this question hasn't already been attempted in this QuizAttempt
    // TODO
    //const existingQuestionAttempts = context.db.query.questionAttempt({
        //where: {}
    //})

    return context.db.mutation.updateQuizAttempt({
        where: {id: args.quizAttemptId},
        data: {
            questionAttempts: {
                create: {
                    question: {connect: {id: args.questionId}},
                    option: {connect: {id: args.optionId}},
                    // TODO check if it's correct
                    isCorrect: true,
                    isConfident: args.isConfident,
                }
            }
        }
    }, info);
}

    
module.exports = {
    addQuiz,
    addCourse,
    deleteCourse,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateOption,
    instructorLogin,
    instructorSignup,
    startOrResumeQuizAttempt,
    attemptQuestion
}
