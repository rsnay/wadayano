function quizzes(root, args, context, info) {
    return context.db.query.quizzes({}, info)
}

function instructors(root, args, context, info){
    return context.db.query.instructors({}, info)
}

function course(root, args, context, info){
    return context.db.query.course({where:{id:args.id}}, info)
}

function courses(root, args, context, info){
    return context.db.query.courses({}, info)
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
  instructors,
  courses,
  instructor,
  course,
  quiz,
  question,
  option
}