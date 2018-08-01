const jwt = require('jsonwebtoken');
const {APP_SECRET } = require('../config');

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Extracts user ID and role (instructor or not) from the JWT. Returns { userId: "string", isInstructor: true/false }
function getUserInfo(context) {
    const Authorization = context.request.get('Authorization');
    if (Authorization) {
      const token = Authorization.replace('Bearer ', '');
      try {
        const { userId, isInstructor } = jwt.verify(token, APP_SECRET);
        return { userId, isInstructor };
      } catch (error) {
        // TODO if not authenticated or invalid token, should this return empty values, or throw an error?
        //return { userId: null, isInstructor: false };
        throw new Error('Not authenticated');
      }
    }
  
    //return { userId: null, isInstructor: false };
    throw new Error('Not authenticated');
}

module.exports = {
    validateEmail,
    getUserInfo
};