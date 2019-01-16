const { getUserInfo } = require('../utils.js');

// Overwrite the correctShortAnswers resolver to only reveal the actual short answers if an instructor is logged in.
function correctShortAnswers(root, args, context, info) {
  const { userId, isInstructor } = getUserInfo(context);
  // If it’s not an instructor, always return false
  if (!isInstructor) {
    throw Error('Student role can not access correctShortAnswers');
  }
  // Otherwise, return the actual value
  return root.correctShortAnswers;
}
  
module.exports = { correctShortAnswers }
