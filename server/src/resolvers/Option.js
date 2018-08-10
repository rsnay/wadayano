const { getUserInfo } = require('../utils.js');

// Overwrite the isCorrect resolver to only reveal the actual isCorrect value if an instructor is logged in.
function isCorrect(root, args, context, info) {
  const { userId, isInstructor } = getUserInfo(context);
  // If it’s not an instructor, always return false
  if (!isInstructor) {
    throw Error('Student role can not access isCorrect');
  }
  // Otherwise, return the actual value
  return root.isCorrect;
}
  
module.exports = { isCorrect }
