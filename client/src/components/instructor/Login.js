import React, { useState, useEffect } from 'react';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import { useLocation, useHistory } from 'react-router';
import useForm from 'react-hook-form';
import ButterToast, { ToastTemplate } from '../shared/Toast';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR } from '../../constants';

const SIGNUP_MUTATION = gql`
  mutation SignupMutation($email: String!, $password: String!) {
    instructorSignup(email: $email, password: $password) {
      token
    }
  }
`;

const LOGIN_MUTATION = gql`
  mutation LoginMutation($email: String!, $password: String!) {
    instructorLogin(email: $email, password: $password) {
      token
    }
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation LoginMutation($email: String!) {
    instructorRequestPasswordReset(email: $email)
  }
`;

const Login = () => {
  const location = useLocation();
  const history = useHistory();

  // Determine from URL to start in login or signup mode
  const [signupMode, setSignupMode] = useState(location.pathname.match('signup'));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [instructorLoginMutation] = useMutation(LOGIN_MUTATION);
  const [instructorSignupMutation] = useMutation(SIGNUP_MUTATION);
  const [instructorRequestPasswordResetMutation] = useMutation(REQUEST_PASSWORD_RESET_MUTATION);

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
      const result = await instructorLoginMutation({
        variables: { email, password },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Get token and save it
      const { token } = result.data.instructorLogin;
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_INSTRUCTOR);
      // Continue
      redirect();
    } catch (e) {
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
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
      const result = await instructorSignupMutation({
        variables: { email, password },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Get token and save it
      const { token } = result.data.instructorSignup;
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
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
        // Decode some error messages
        if (message.indexOf('unique constraint would be violated') >= 0) {
          message = 'An instructor with this email address already exists.';
        }
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
    const result = await instructorRequestPasswordResetMutation({
      variables: { email: emailInput.trim() },
    });
    if (result.errors && result.errors.length > 0) {
      ButterToast.raise({
        content: <ToastTemplate content={result.errors[0].message} className="is-danger" />,
        timeout: 12000,
      });
    } else if (result.data.instructorRequestPasswordReset === true) {
      ButterToast.raise({
        content: (
          <ToastTemplate
            content={`An email was sent to ${emailInput} with further instructions.`}
            className="is-success"
          />
        ),
        sticky: true,
      });
    } else {
      ButterToast.raise({
        content: (
          <ToastTemplate
            content={`No account was found for ${emailInput}, or there was an unexpected error sending the password reset email.`}
            className="is-danger"
          />
        ),
        timeout: 12000,
      });
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
            className="button is-text"
            onClick={() => {
              localStorage.setItem('authRole', 'student');
              localStorage.setItem(
                'authToken',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjamt2bGNqa3YwYW5xMDcyMndocXhqN3VzIiwiaXNJbnN0cnVjdG9yIjpmYWxzZSwiaWF0IjoxNTM0MzY1MjExfQ.WiREqvv4IbpyX-xtQrxNIxrL-tfWcrDvr9G1LwT2JBY'
              );
              history.push('/student/dashboard');
            }}
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
