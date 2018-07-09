const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET } = require('../../config');
const { validateEmail } = require('../utils');

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

function addUser (root, args, context, info) {
    return context.db.mutation.createUser({
        data: {
            email: args.email,
            role: args.role,
            password: args.password,
            courses:{
                create:[{
                    title: "Course Title",
                    quizzes: {
                        create: [{
                            title: "Quiz Title",
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
        }
    }, info)
}

function addCourse (root, args, context, info) {
    return context.db.mutation.updateUser({
        data:{
            courses:[{
                create:[{
                    title: "Course Title",
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
            }]
        },
        where:{
            id:args.id
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
    // Check that user exists
    console.log(args.email, args.password);
    const email = args.email.toLowerCase();
    const user = await context.db.query.user({ where: { email: email } }, ` { id, password } `);
    if (!user) {
        throw new Error('Invalid email and/or password');
    }

    // Check that password is valid
    const valid = await bcrypt.compare(args.password, user.password);
    if (!valid) {
        throw new Error('Invalid email and/or password');
    }

    // Sign token
    const token = jwt.sign({ userId: user.id }, APP_SECRET);

    // Return an AuthPayload
    return {
        token,
        user,
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
    // Signup is only for instructors (student accounts will be auto-created when launched via LTI)
    const role = "instructor";
    // Create user
    const user = await context.db.mutation.createUser({
        data: { email, password, role },
    }, `{ id }`);

    // Sign token using id of newly-created user
    const token = jwt.sign({ userId: user.id }, APP_SECRET);

    // Return an AuthPayload
    return {
        token,
        user,
    };
}

module.exports = {
    addQuiz,
    addUser,
    addCourse,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateOption,
    instructorLogin,
    instructorSignup
}
