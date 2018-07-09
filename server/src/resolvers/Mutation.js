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

module.exports = {
    addQuiz,
    addUser,
    addCourse,
    updateQuiz,
    deleteQuiz,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateOption
}