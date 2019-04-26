const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {APP_SECRET } = require('../config');

/**
 * Tests whether an email address has a valid format
 * (not if the address actually exists)
 * Used for signup and updating profile.
 * @param {string} email 
 * @returns {boolean} if the email has a valid format
 */
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Checks a password against wadayano’s password requirements.
 * Used for signup, password reset, and updating profile.
 * @param {string} password 
 * @throws Will throw an error with a message describing the failed requirement
 * @returns {void}
 */
function validatePasswordComplexity(password) {
  if (password && password !== null && password.length > 0) {
    // Check that password is at least 6 characters
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
  } else {
    throw new Error('No password was given');
  }
}

/**
 * Generates a password hash to store in the database.
 * Used for signup, password reset, and updating profile.
 * @param {string} password password to hash
 * @returns {string} password hash
 */
async function hashPassword(password) {
  const saltLength = 10;
  return bcrypt.hash(password, saltLength);
}

/**
 * Check if a user-provided password matches a hashed password
 * Used for login and updating profile.
 * @param {string} plaintextPassword user-provided password
 * @param {string} hashedPassword password hash from database to check again
 */
async function checkHashedPassword(plaintextPassword, hashedPassword) {
  return bcrypt.compare(plaintextPassword, hashedPassword);
}

// Extracts user ID and role (instructor or not) from the JWT. Returns { userId: "string", isInstructor: true/false }
// If user is not authenticated, userId will be null
function getUserInfo(context) {
    const Authorization = context.request.get('Authorization');
    if (Authorization) {
      const token = Authorization.replace('Bearer ', '');
      try {
        const { userId, isInstructor } = jwt.verify(token, APP_SECRET);
        return { userId, isInstructor };
      } catch (error) {
        // TODO if not authenticated or invalid token, should this return empty values, or throw an error?
        return { userId: null, isInstructor: false };
        // TODO revise everything that relied on this previous behavior
        throw new Error('Not authenticated');
      }
    }
  
    return { userId: null, isInstructor: false };
    throw new Error('Not authenticated');
}


/**
 * Checks that the current user is an instructor. Wraps getUserInfo(context)
 * Throws an error if not an instructor.
 * @param {*} context
 * @returns { userId: "string", isInstructor: true/false } from getUserInfo
 */
function instructorCheck(context) {
  const userInfo = getUserInfo(context);
  if (!userInfo.isInstructor) {
      throw new Error('Not authenticated as an instructor');
  }
  return userInfo;
}

/**
* Checks that the current user is an instructor and has access to a given courseId. Wraps instructorCheck(context)
* Throws an error if not an instructor, or no permission for given course
* @param {*} context
* @returns { userId: "string", isInstructor: true/false } from getUserInfo
*/
async function instructorCourseCheck(context, courseId) {
  // Perform instructor check first
  const userInfo = instructorCheck(context);

  // Check that the logged-in instructor is part of the given course
  const course = await context.db.query.course({
      where: { id: courseId }
  }, `{ instructors { id, email } }`);
  if (course.instructors.filter(i => i.id === userInfo.userId).length === 0) {
      throw new Error('You don’t have permission to access this course.');
  }

  return userInfo;
}

/**
 * Returns a promise that resolves after the given number of milliseconds
 * Can be used to delay a given amount, e.g. await delay(2000)
 * @param {*} ms
 */
const delay = ms => new Promise(res => setTimeout(res, ms))

module.exports = {
    validateEmail,
    validatePasswordComplexity,
    hashPassword,
    checkHashedPassword,
    getUserInfo,
    instructorCheck,
    instructorCourseCheck,
    delay
};