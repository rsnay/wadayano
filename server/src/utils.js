const {APP_SECRET } = require('../config');

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function getUserId(context) {
    const Authorization = context.request.get('Authorization')
    if (Authorization) {
      const token = Authorization.replace('Bearer ', '')
      const { instructorId } = jwt.verify(token, APP_SECRET)
      return instructorId
    }
  
    throw new Error('Not authenticated')
  }

module.exports = {
    validateEmail,
    getUserId
};