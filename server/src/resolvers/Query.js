import getUserId from '../utils.js'

function quizzes(root, args, context, info) {
    return context.db.query.quizzes({}, info)
}

function course(root, args, context, info){
    return context.db.query.course({where:{id:args.id}}, info)
}

function courses(root, args, context, info){
    return context.db.query.courses({where:{id:getUserId(context)}}, info)
}

function instructor(root, args, context, info){
    return context.db.query.instructor({where:{id:args.id}},info)
}

function quiz(root, args, context, info) {
  return context.db.query.quiz({where:{id:args.id}}, info)
}

function question(root, args, context, info){
  return context.db.query.question({where:{id:args.id}}, info)
}

function option(root, args, context, info){
  return context.db.query.option({where:{id:args.id}})
}

module.exports = {
  quizzes,
  course,
  courses,
  instructor,
  quiz,
  question,
  option
}