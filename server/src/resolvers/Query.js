const { getUserInfo } = require('../utils.js');

function course(root, args, context, info){
  return context.db.query.course({where:{id:args.id}}, info)
}

function courses(root, args, context, info){
  console.log(getUserInfo(context).userId);
  return context.db.query.courses({}, info)
}

function instructor(root, args, context, info){
  return context.db.query.instructor({where:{id:getUserInfo(context).userId}},info)
}

function quiz(root, args, context, info) {
  return context.db.query.quiz({where:{id:args.id}}, info)
}

function question(root, args, context, info){
  return context.db.query.question({where:{id:args.id}}, info)
}

function option(root, args, context, info){
  return context.db.query.option({where:{id:args.id}}, info)
}

function currentStudent(root, args, context, info) {
  const { userId, isInstructor } = getUserInfo(context);
  if (isInstructor) {
    throw Error('Not a student');
  }
  return context.db.query.student({where:{id:userId}}, info);
}

function currentStudentQuizAttempts(root, args, context, info) {
  const { userId, isInstructor } = getUserInfo(context);
  if (isInstructor) {
    throw Error('Not a student');
  }
  // Filter to attempts from current student
  let where = { student: { id: userId }};
  // Filter to a given course, if provided
  if (args.courseId) {
    where.quiz = { course: { id: args.courseId } }; 
  }
  // Order by provided order
  return context.db.query.quizAttempts({
    where,
    orderBy: args.orderBy
  }, info);
}

async function currentStudentQuizAttempt(root, args, context, info) {
  const { userId, isInstructor } = getUserInfo(context);
  // Check that quiz attempt belongs to current student
  try {
    const attempt = await context.db.query.quizAttempt({where: { id: args.id}}, `{ student { id } }`);
    if (!(attempt.student.id === userId || isInstructor)) {
      throw Error('Quiz attempt belongs to a different student');
    }
  } catch (error) {
    throw Error('Quiz attempt not found');
  }
  return context.db.query.quizAttempt({
    where: { id: args.id }
  }, info);
}

module.exports = {
  course,
  courses,
  instructor,
  quiz,
  question,
  option,
  currentStudent,
  currentStudentQuizAttempts,
  currentStudentQuizAttempt
}