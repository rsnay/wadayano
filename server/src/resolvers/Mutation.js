const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET } = require('../../config');
const { validateEmail } = require('../utils');
const { getUserInfo } = require('../utils.js');

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

async function startQuizAttempt(root, args, context, info) {
    // TODO quizId: ID!, studentId: ID!): QuizAttempt!

    // Check for valid student login
    // Check that student has access to the course that owns this quiz
    // Check availability date of quiz
    // If attempt(s) exists for this student and quiz
        // If most recent attempt is unfinished, should we return the existing attempt to client to finish??? (Could be weird with LTI vs. non-LTI launches)
        // Otherwise, check retake rules for this quiz
            // Return a new quiz attempt if allowed
            // Otherwise return an error that the quiz can't be retaken
    // If no existing attempts, return a new attempt

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
    instructorSignup
}
