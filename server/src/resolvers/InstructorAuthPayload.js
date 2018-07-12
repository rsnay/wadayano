function instructor(root, args, context, info) {
    return context.db.query.instructor({ where: { id: root.instructor.id } }, info)
  }
  
  module.exports = { instructor }
