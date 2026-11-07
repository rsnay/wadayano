import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useHistory } from '../../navigation';
import useForm from 'react-hook-form';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import { apiRequest } from '../../api';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import {
  AUTH_TOKEN,
  AUTH_ROLE,
  AUTH_ROLE_INSTRUCTOR,
  AUTH_ROLE_STUDENT,
} from '../../constants';

/**
 * Page for instructors to log in and sign up
 * The page switches modes based on the /login or /signup route
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const Login = () => {
  const location = useLocation();
  const history = useHistory();

  // Determine from URL to start in login or signup mode
  const [signupMode, setSignupMode] = useState(location.pathname.match('signup'));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit } = useForm();

  useEffect(() => {
    setSignupMode(location.pathname.match('signup'));
  }, [location.pathname]);

  // If login or signup was successful, redirect to instructor view, or a 'from' redirect location, if passed in
  const redirect = () => {
    const { from } = location.state || { from: { pathname: '/instructor/courses' } };
    history.push(from.pathname);
  };

  // Log in the instructor
  async function logIn({ email, password }) {
    // Send login mutation
    try {
      const { token } = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      // Get token and save it
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_INSTRUCTOR);
      // Continue
      redirect();
    } catch (e) {
      let message = 'Please try again later.';
      if (e.code === 'invalid_credentials') {
        message = 'Invalid email and/or password.';
      } else if (e.code === 'password_reset_required') {
        message = 'Your password must be reset before you can sign in. Use “Forgot Your Password?” below.';
      }
      setError(`Error logging in: ${message}`);
      setIsLoading(false);
      console.error(`Login error: ${JSON.stringify(e)}`);
    }
  }

  // Sign up a new instructor
  async function signUp({ email, password, passwordConfirm }) {
    // Check that passwords match
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }
    // Check for minimum password length (should also be verified on server)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    // Send signup mutation
    try {
      const { token } = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: { email, password },
      });
      // Get token and save it
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_INSTRUCTOR);
      // Display a welcome toast
      ButterToast.raise({
        content: (
          <ToastTemplate
            content="Welcome to wadayano! Create your first course to get started."
            className="is-success"
          />
        ),
        sticky: true,
      });
      // Continue
      redirect();
    } catch (e) {
      let message = 'Please try again later.';
      if (e.code === 'email_already_exists') {
        message = 'An instructor with this email address already exists.';
      } else if (e.code === 'invalid_email') {
        message = 'Invalid email address.';
      }
      setError(`Error signing up: ${message}`);
      setIsLoading(false);
      console.error(`Signup error: ${JSON.stringify(e)}`);
    }
  }

  // When the log in or sign up button is pressed, or form is submitted via enter key
  const submit = formData => {
    // Prevent re-submission while loading
    if (isLoading) {
      return;
    }
    // Clear existing error, and set loading
    setError('');
    setIsLoading(true);
    if (signupMode) {
      signUp(formData);
    } else {
      logIn(formData);
    }
  };

  // Quick way to submit a request for a password reset
  async function requestPasswordReset() {
    const emailInput = window.prompt(
      'Enter the email address connected with your wadayano instructor account. If you are a student, simply launch wadayano from your learning management system.'
    );
    if (!emailInput || emailInput.trim() === '') {
      return;
    }
    try {
      await apiRequest('/api/auth/password-reset-requests', {
        method: 'POST',
        body: { email: emailInput.trim() },
      });
      ButterToast.raise({
        content: (
          <ToastTemplate
            content="If an account exists for that address, a password reset email has been sent."
            className="is-success"
          />
        ),
        sticky: true,
      });
    } catch {
      ButterToast.raise({
        content: (
          <ToastTemplate
            content="Unable to request a password reset. Please try again later."
            className="is-danger"
          />
        ),
        timeout: 12000,
      });
    }
  }

  async function logInDemoStudent() {
    if (isLoading) {
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { token, redirectTo } = await apiRequest('/api/demo/student-session', {
        method: 'POST',
      });
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_STUDENT);
      history.push(redirectTo);
    } catch (loginError) {
      setError(`Error logging in as demo student: ${loginError.code || 'request_failed'}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="section no-select">
      <div className="container">
        <h1 className="title">Instructor {signupMode ? 'Signup' : 'Login'}</h1>
        <i>
          If you are a student using wadayano in a course, simply launch it from your LMS (e.g.
          Learning Suite or Canvas).
        </i>
        <form
          className="column is-one-third-desktop is-half-tablet"
          onSubmit={handleSubmit(submit)}
        >
          {error && <p className="notification is-danger">{error}</p>}

          <div className="field">
            <p className="control has-icons-left has-icons-right">
              <input
                name="email"
                ref={register}
                autoFocus
                required
                className="input"
                type="email"
                maxLength={255}
                placeholder="Email"
              />
              <span className="icon is-small is-left">
                <i className="fas fa-envelope" />
              </span>
            </p>
          </div>

          <div className="field">
            <p className="control has-icons-left">
              <input
                name="password"
                ref={register}
                required
                className="input"
                type="password"
                placeholder="Password"
              />
              <span className="icon is-small is-left">
                <i className="fas fa-lock" />
              </span>
            </p>
          </div>

          {signupMode && (
            <div className="field">
              <p className="control has-icons-left">
                <input
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
          )}

          <div className="field">
            <p className="control">
              <button
                className={`button is-primary${isLoading ? ' is-loading' : ''}`}
                type="submit"
                disabled={isLoading}
              >
                {signupMode ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </form>

        <div className="field">
          {signupMode ? (
            <button className="button is-text" onClick={() => setSignupMode(false)} type="button">
              Already have an account? Log In
            </button>
          ) : (
            <button className="button is-text" onClick={() => setSignupMode(true)} type="button">
              New to wadayano? Sign Up
            </button>
          )}
        </div>

        <div className="field">
          <button className="button is-text" onClick={requestPasswordReset} type="button">
            Forgot Your Password?
          </button>
        </div>

        <div className="field">
          <button
            className={`button is-text${isLoading ? ' is-loading' : ''}`}
            onClick={logInDemoStudent}
            disabled={isLoading}
            type="button"
          >
            <span className="icon">
              <i className="fas fa-user-graduate" />
            </span>
            <span>Demo Student Login</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Login;
