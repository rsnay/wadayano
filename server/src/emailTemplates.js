function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
  
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

const header = (title) => {
    return `
<div style="font-family: BlinkMacSystemFont, -apple-system, 'Segoe UI', 'Roboto', 'Oxygen', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; margin: 1em; max-width: 30em; padding: 1.5em 1.5em 0.8em 1.5em; background: #eee; border-radius: 10px;">
    <img style="float: left; margin: 8px 5px 0 0" class="iconMedium" src="https://wadayano.com/favicon.ico" />
<h2 style="font-weight: 300;">${title}</h2>
    <hr style="border: 0; border-top: 1px solid #6CC5D6; clear; both" />`;
}

const footer = `</div>`;

const requestPasswordReset = function(token) {
    return `
    ${header('wadayano')}
    <p>A request has been submitted to reset the password for your wadayano account.</p>
<p>If you didn’t submit this request, you can ignore it. This link will expire in 24 hours.</p>
    <p><a href="https://www.wadayano.com/reset-password/${token}"  style="display: inline-block; padding: 1em; background-color: #6CC5D6; color: #fff; border-radius: 5px; text-decoration: none;">Reset Password</a></p>
    ${footer}
If the button above doesn’t work, copy this link into your browser to reset your password:
https://www.wadayano.com/reset-password/${token}
    `;
}

const feedback = function(sentFrom, message) {
    return `
    ${header('wadayano feedback')}
    <p>The following message was sent from ${escapeHtml(sentFrom)}</p>
    <hr style="border: 0; border-top: 1px solid #6CC5D6; clear; both" />
    <p>${escapeHtml(message)}</p>
    ${footer}
    `;
}

const courseAddedNotification = function(courseTitle, courseId) {
    return `
    ${header('wadayano')}
    <p>You’ve been invited to join “${courseTitle},” a course in wadayano!</p>
    <p>This course has been automatically added to your instructor account.</p>
    <p><a href="https://www.wadayano.com/instructor/course/${courseId}"  style="display: inline-block; padding: 1em; background-color: #6CC5D6; color: #fff; border-radius: 5px; text-decoration: none;">View Course</a></p>
    ${footer}
    `;
}

const courseInviteNotification = function(courseTitle, courseId) {
    return `
    ${header('wadayano')}
    <p>You’ve been invited to join “${courseTitle},” a course in wadayano!</p>
    <p>It appears you don’t have a wadayano account yet. Sign up using the email address this notification was sent to, and the course will be automatically added to your account. (This invite will expire in 48 hours.)</p>
    <p><a href="https://www.wadayano.com/signup"  style="display: inline-block; padding: 1em; background-color: #6CC5D6; color: #fff; border-radius: 5px; text-decoration: none;">Create Your Account</a></p>
    ${footer}
    `;
}

const passbackFailedNotification = function(error, ltiInfo) {
    return `
    ${header('wadayano')}
    <p>Grade passback failed on ${new Date().toLocaleString()}</p>
    <pre>${error}</pre>
    <pre>${JSON.stringify(ltiInfo)}</pre>
    ${footer}
    `;
}

module.exports = {
    requestPasswordReset,
    feedback,
    courseAddedNotification,
    courseInviteNotification,
    passbackFailedNotification
};
