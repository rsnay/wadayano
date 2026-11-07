import React, { useState } from 'react';
import { useParams } from 'react-router';
import { useHistory } from '../../navigation';
import useForm from 'react-hook-form';
import { apiRequest } from '../../api';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR } from '../../constants';

/**
 * Page that allows an instructor to reset account password. Acessible
 * through an email, which has a URL including the password reset token.
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const ResetPassword = () => {
  // Password reset token from URL
  const { token } = useParams();
  const history = useHistory();

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { register, handleSubmit } = useForm();

  // When the reset password button is pressed, or form is submitted via enter key
  // Reset password, and log in the instructor
  const resetPassword = async ({ password, passwordConfirm }) => {
    // Prevent re-submission while loading
    if (isLoading) {
      return;
    }

    // Check that passwords match
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    // Check for minimum password length (should also be verified on server)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Clear existing error, and set loading
    setError('');
    setIsLoading(true);

    // Send reset mutation
    try {
      const { token: newToken } = await apiRequest('/api/auth/password-resets', {
        method: 'POST',
        body: { token, password },
      });
      // Get token and save it
      localStorage.setItem(AUTH_TOKEN, newToken);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_INSTRUCTOR);
      // Show success message
      setIsComplete(true);
    } catch (e) {
      let message = 'Please try again later.';
      if (e.code === 'invalid_or_expired_reset_token') {
        message = 'This password reset link is invalid or has expired. Request a new link and try again.';
      }
      setError(`Error resetting password: ${message}`);
      setIsLoading(false);
      console.error(`Error resetting password: ${JSON.stringify(e)}`);
    }
  };

  const redirect = () => {
    // Continue to instructor dashboard, not allowing back navigation
    history.replace('/instructor/courses');
  };

  if (isComplete) {
    return (
      <article className="container message is-success" style={{ marginTop: '3em' }}>
        <div className="message-header">
          <p>Thanks! Your password has been reset.</p>
          <span className="icon is-large">
            <i className="fas fa-3x fa-check-circle" aria-hidden="true" />
          </span>
        </div>
        <div className="message-body">
          <button onClick={redirect} className="button" type="button">
            Continue to Dashboard
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="section no-select">
      <div className="container">
        <h1 className="title">Reset Password</h1>
        <i>Enter and confirm your new password.</i>
        <form
          className="column is-one-third-desktop is-half-tablet"
          onSubmit={handleSubmit(resetPassword)}
        >
          {error && <p className="notification is-danger">{error}</p>}

          <div className="field">
            <p className="control has-icons-left">
              <input
                required
                name="password"
                ref={register}
                className="input"
                type="password"
                placeholder="Password"
              />
              <span className="icon is-small is-left">
                <i className="fas fa-lock" />
              </span>
            </p>
          </div>

          <div className="field">
            <p className="control has-icons-left">
              <input
                required
                name="passwordConfirm"
                ref={register}
                className="input"
                type="password"
                placeholder="Confirm Password"
              />
              <span className="icon is-small is-left">
                <i className="fas fa-lock" />
              </span>
            </p>
          </div>

          <div className="field">
            <p className="control">
              <button
                className={`button is-primary${isLoading ? ' is-loading' : ''}`}
                disabled={isLoading}
                type="submit"
              >
                Reset Password
              </button>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ResetPassword;
