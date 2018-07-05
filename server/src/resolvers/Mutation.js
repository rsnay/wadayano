function updateOption (root, args, context, info){
    return context.db.mutation.updateOption({
        data:{
            isCorrect: args.isCorrect,
            text: args.text
        },
        where:{
            id:args.id
        }
    })
}

function addQuiz (root, args, context, info) {
    return context.db.mutation.createQuiz({
      data: {
        title: args.title,
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
    }
    },info)
}

function updateQuiz (root, args, context, info) {
    return context.db.mutation.updateQuiz({
      data: {
        title: args.title,
        questions: {
          create: [{
            prompt: args.prompt,
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

function deleteQuiz(root, args, context, info) {
    return context.db.mutation.deleteQuiz({
        where:{
            id: args.id
        }
    }, info)
}

module.exports = {
    addQuiz,
    deleteQuiz,
    updateQuiz,
    updateOption
}