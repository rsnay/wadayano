import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR } from '../../constants';

class Login extends Component {

  constructor(props) {
    super(props);

    this.state = {
      signupMode: false, // Determines if log in or sign up form will be shown
      email: '',
      password: '',
      passwordConfirm: '',
      error: '',
      isLoading: false
    };

    // Pre-bind this function, to make adding it to input fields easier
    this._handleInputChange = this._handleInputChange.bind(this);
  }

  // When the log in or sign up button is pressed, or form is submitted via enter key
  _submit(e) {
    if (e) {
      e.preventDefault();
    }
    // Clear existing error, and set loading
    this.setState({ error: '', isLoading: true });
    if (this.state.signupMode) {
      this._signUp();
    } else {
      this._logIn();
    }
  }

  // Log in the instructor
  async _logIn() {
    // Send login mutation
    const { email, password } = this.state;
    try {
      const result = await this.props.instructorLoginMutation({
        variables: {
          email,
          password
        }
      });
      // Get token and save it
      const { token } = result.data.instructorLogin;
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_INSTRUCTOR);
      // Continue
      this._redirect();
    } catch (e) {
      let message = 'Please try again later.';
      if (e.graphQLErrors && e.graphQLErrors.length > 0) {
        message = e.graphQLErrors[0].message;
      }
      this.setState({ error: 'Error logging in: ' + message, isLoading: false });
      console.error('Login error: ' + JSON.stringify(e));
    }
  }

  // Sign up a new instructor
  async _signUp() {
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
          password
        }
      });
      // Get token and save it
      const { token } = result.data.instructorSignup;
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_INSTRUCTOR);
      // Continue
      this._redirect();
    } catch (e) {
      let message = 'Please try again later.';
      if (e.graphQLErrors && e.graphQLErrors.length > 0) {
        message = e.graphQLErrors[0].message;
        // Decode some error messages
        if (message.indexOf('unique constraint would be violated') >= 0) {
          message = 'An instructor with this email address already exists.';
        }
      }
      this.setState({ error: 'Error signing up: ' + message, isLoading: false });
      console.error('Login error: ' + JSON.stringify(e));
    }
  }


  // If login or signup was successful, redirect to instructor view, or a 'from' redirect location, if passed in
  _redirect() {
    const { from } = this.props.location.state || { from: { pathname: '/instructor' } }
    this.props.history.push(from.pathname);
  }

  // Called when the form fields change
  // This function is from https://reactjs.org/docs/forms.html
  _handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  // Submit on enter press in password fields
  _handleFormKeyPress(event) {
      if (event.key === 'Enter') {
          event.target.blur();
          this._submit();
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
          <h1 className="title">Instructor {this.state.signupMode ? "Signup" : "Login"}</h1>
          <i>If you are a student using wadayano in a course, simply launch it from your LMS (i.e. Canvas).</i>
          <form className="column is-one-third-desktop is-half-tablet" onSubmit={(e) => this._submit(e) }>

            {this.state.error && <p className="notification is-danger">{this.state.error}</p> }

            <div className="field">
              <p className="control has-icons-left has-icons-right">
                  <input
                    autoFocus
                    required
                    value={this.state.email}
                    name="email"
                    onChange={this._handleInputChange}
                    className="input"
                    type="email"
                    placeholder="Email"
                  />
                  <span className="icon is-small is-left">
                  <i className="fas fa-envelope"></i>
                  </span>
              </p>
            </div>

            <div className="field">
              <p className="control has-icons-left">
                  <input
                    required
                    value={this.state.password}
                    name="password"
                    onChange={this._handleInputChange}
                    className="input"
                    type="password"
                    placeholder="Password"
                  />
                  <span className="icon is-small is-left">
                  <i className="fas fa-lock"></i>
                  </span>
              </p>
            </div>

            {this.state.signupMode && <div className="field">
              <p className="control has-icons-left">
                  <input
                    value={this.state.passwordConfirm}
                    name="passwordConfirm"
                    onChange={this._handleInputChange}
                    className="input"
                    type="password"
                    placeholder="Confirm Password"
                  />
                  <span className="icon is-small is-left">
                  <i className="fas fa-lock"></i>
                  </span>
              </p>
            </div>}

            <div className="field">
              <p className="control">
                  <button
                    className={"button is-primary" + (this.state.isLoading ? " is-loading" : "")}
                    disabled={!formCompleted}
                    onClick={() => this._submit() }>
                  {this.state.signupMode ? "Sign Up" : "Log In"}
                  </button>
              </p>
            </div>
          </form>

          <div className="field">
            {this.state.signupMode ? 
              <button className="button is-text" onClick={() => this.setState({ signupMode: false }) }>Already have an account? Log In</button>
            :
              <button className="button is-text" onClick={() => this.setState({ signupMode: true }) }>New to wadayano? Sign Up</button>
            }
          </div>
        </div>
      </section>
    )
  }
}

const SIGNUP_MUTATION = gql`
  mutation SignupMutation($email: String!, $password: String!) {
    instructorSignup(email: $email, password: $password) {
      token
    }
  }
`

const LOGIN_MUTATION = gql`
  mutation LoginMutation($email: String!, $password: String!) {
    instructorLogin(email: $email, password: $password) {
      token
    }
  }
`

export default compose(
  graphql(SIGNUP_MUTATION, { name: 'instructorSignupMutation' }),
  graphql(LOGIN_MUTATION, { name: 'instructorLoginMutation' }),
)(Login)