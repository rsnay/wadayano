function quizAttempt(root, args, context, info) {
    return context.db.query.quizAttempt({ where: { id: root.quizAttempt.id } }, info)
  }
  
  module.exports = { quizAttempt }
