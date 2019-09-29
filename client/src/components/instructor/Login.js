import React, { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import compose from '../../compose';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR } from '../../constants';

class Login extends Component {
  constructor(props) {
    super(props);

    // Determine from URL to start in login or signup mode
    const signupMode = this.props.match.path.match('signup');
    this.state = {
      signupMode, // Determines if log in or sign up form will be shown
      email: '',
      password: '',
      passwordConfirm: '',
      error: '',
      isLoading: false,
    };

    // Pre-bind this function, to make adding it to input fields easier
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  // If a user is on signup page and clicks login in the header, we need to detect that as well.
  componentWillReceiveProps(nextProps) {
    // Determine from URL to show login or signup mode
    const signupMode = nextProps.match.path.match('signup');
    this.setState({ signupMode });
  }

  // When the log in or sign up button is pressed, or form is submitted via enter key
  submit(e) {
    if (e) {
      e.preventDefault();
    }
    // Prevent re-submission while loading
    if (this.state.isLoading) {
      return;
    }
    // Clear existing error, and set loading
    this.setState({ error: '', isLoading: true });
    if (this.state.signupMode) {
      this.signUp();
    } else {
      this.logIn();
    }
  }

  // Log in the instructor
  async logIn() {
    // Send login mutation
    const { email, password } = this.state;
    try {
      const result = await this.props.instructorLoginMutation({
        variables: {
          email,
          password,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Get token and save it
      const { token } = result.data.instructorLogin;
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_INSTRUCTOR);
      // Continue
      this.redirect();
    } catch (e) {
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      this.setState({ error: `Error logging in: ${message}`, isLoading: false });
      console.error(`Login error: ${JSON.stringify(e)}`);
    }
  }

  // Sign up a new instructor
  async signUp() {
    // Check that passwords match
    if (this.state.password !== this.state.passwordConfirm) {
      this.setState({ error: 'Passwords do not match.', isLoading: false });
      return;
    }
    // Check for minimum password length (should also be verified on server)
    if (this.state.password.length < 6) {
      this.setState({ error: 'Password must be at least 6 characters', isLoading: false });
      return;
    }

    // Send signup mutation
    const { email, password } = this.state;
    try {
      const result = await this.props.instructorSignupMutation({
        variables: {
          email,
          password,
        },
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
      this.redirect();
    } catch (e) {
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
        // Decode some error messages
        if (message.indexOf('unique constraint would be violated') >= 0) {
          message = 'An instructor with this email address already exists.';
        }
      }
      this.setState({ error: `Error signing up: ${message}`, isLoading: false });
      console.error(`Signup error: ${JSON.stringify(e)}`);
    }
  }

  // Quick way to submit a request for a password reset
  async requestPasswordReset() {
    const email = window.prompt(
      'Enter the email address connected with your wadayano instructor account. If you are a student, simply launch wadayano from your learning management system.'
    );
    if (!email || email.trim() === '') {
      return;
    }
    const result = await this.props.instructorRequestPasswordResetMutation({
      variables: {
        email: email.trim(),
      },
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
            content={`An email was sent to ${email} with further instructions.`}
            className="is-success"
          />
        ),
        sticky: true,
      });
    } else {
      ButterToast.raise({
        content: (
          <ToastTemplate
            content={`No account was found for ${email}, or there was an unexpected error sending the password reset email.`}
            className="is-danger"
          />
        ),
        timeout: 12000,
      });
    }
  }

  // If login or signup was successful, redirect to instructor view, or a 'from' redirect location, if passed in
  redirect() {
    const { from } = this.props.location.state || { from: { pathname: '/instructor/courses' } };
    this.props.history.push(from.pathname);
  }

  // Called when the form fields change
  // This function is from https://reactjs.org/docs/forms.html
  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value,
    });
  }

  // Submit on enter press in password fields
  handleFormKeyPress(event) {
    if (event.key === 'Enter') {
      event.target.blur();
      this.submit();
    }
  }

  render() {
    let formCompleted = this.state.email && this.state.password;
    if (this.state.signupMode) {
      formCompleted = formCompleted && this.state.passwordConfirm;
    }

    return (
      <section className="section no-select">
        <div className="container">
          <h1 className="title">Instructor {this.state.signupMode ? 'Signup' : 'Login'}</h1>
          <i>
            If you are a student using wadayano in a course, simply launch it from your LMS (e.g.
            Learning Suite or Canvas).
          </i>
          <form
            className="column is-one-third-desktop is-half-tablet"
            onSubmit={e => this.submit(e)}
          >
            {this.state.error && <p className="notification is-danger">{this.state.error}</p>}

            <div className="field">
              <p className="control has-icons-left has-icons-right">
                <input
                  autoFocus
                  required
                  value={this.state.email}
                  name="email"
                  onChange={this.handleInputChange}
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
                  required
                  value={this.state.password}
                  name="password"
                  onChange={this.handleInputChange}
                  className="input"
                  type="password"
                  placeholder="Password"
                />
                <span className="icon is-small is-left">
                  <i className="fas fa-lock" />
                </span>
              </p>
            </div>

            {this.state.signupMode && (
              <div className="field">
                <p className="control has-icons-left">
                  <input
                    value={this.state.passwordConfirm}
                    name="passwordConfirm"
                    onChange={this.handleInputChange}
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
                  className={`button is-primary${this.state.isLoading ? ' is-loading' : ''}`}
                  type="submit"
                  disabled={!formCompleted}
                >
                  {this.state.signupMode ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </div>
          </form>

          <div className="field">
            {this.state.signupMode ? (
              <button
                className="button is-text"
                onClick={() => this.setState({ signupMode: false })}
                type="button"
              >
                Already have an account? Log In
              </button>
            ) : (
              <button
                className="button is-text"
                onClick={() => this.setState({ signupMode: true })}
                type="button"
              >
                New to wadayano? Sign Up
              </button>
            )}
          </div>

          <div className="field">
            <button
              className="button is-text"
              onClick={() => this.requestPasswordReset()}
              type="button"
            >
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
                this.props.history.push('/student/dashboard');
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
  }
}

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

export default compose(
  graphql(SIGNUP_MUTATION, { name: 'instructorSignupMutation' }),
  graphql(LOGIN_MUTATION, { name: 'instructorLoginMutation' }),
  graphql(REQUEST_PASSWORD_RESET_MUTATION, { name: 'instructorRequestPasswordResetMutation' })
)(Login);
