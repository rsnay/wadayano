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

const requestPasswordReset = function(token) {
    return `
<div style="font-family: BlinkMacSystemFont, -apple-system, 'Segoe UI', 'Roboto', 'Oxygen', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; margin: 1em; max-width: 30em; padding: 1.5em 1.5em 0.8em 1.5em; background: #eee; border-radius: 10px;">
    <img style="float: left; margin: 8px 5px 0 0" class="iconMedium" src="https://wadayano.com/favicon.ico" />
<h2 style="font-weight: 300;">wadayano</h2>
    <hr style="border: 0; border-top: 1px solid #6CC5D6; clear; both" />
    <p>A request has been submitted to reset the password for your wadayano account.</p>
<p>If you didn’t submit this request, you can ignore it. This link will expire in 24 hours.</p>
    <p><a href="https://www.wadayano.com/reset-password/${token}"  style="display: inline-block; padding: 1em; background-color: #6CC5D6; color: #fff; border-radius: 5px; text-decoration: none;">Reset Password</a></p>
</div>
If the button above doesn’t work, copy this link into your browser to reset your password:
https://www.wadayano.com/reset-password/${token}
    `;
}

const feedback = function(sentFrom, message) {
    return `
<div style="font-family: BlinkMacSystemFont, -apple-system, 'Segoe UI', 'Roboto', 'Oxygen', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; margin: 1em; max-width: 30em; padding: 1.5em 1.5em 0.8em 1.5em; background: #eee; border-radius: 10px;">
    <img style="float: left; margin: 8px 5px 0 0" class="iconMedium" src="https://wadayano.com/favicon.ico" />
    <h2 style="font-weight: 300;">wadayano feedback</h2>
    <p>The following message was sent from ${escapeHtml(sentFrom)}</p>
    <hr style="border: 0; border-top: 1px solid #6CC5D6; clear; both" />
    <p>${escapeHtml(message)}</p>
</div>
    `;
}

module.exports = {
    requestPasswordReset,
    feedback
};
