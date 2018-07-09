import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import ErrorBox from '../shared/ErrorBox';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { INSTRUCTOR_TOKEN } from '../../constants';

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

  // When the log in or sign up button is pressed
  _submit() {
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
      const result = await this.props.loginMutation({
        variables: {
          email,
          password
        }
      });
      const { token } = result.data.login;
      console.log(result);
      localStorage.setItem(INSTRUCTOR_TOKEN, token);
    } catch (e) {
      this.setState({ error: 'Error logging in. Please try again later.', isLoading: false });
      console.error('Login error: ' + e);
    }
  }

  // Sign up a new instructor
  async _signUp() {
    // Check that passwords match
    if (this.state.password !== this.state.passwordConfirm) {
      this.setState({ error: 'Passwords do not match.', isLoading: false });
    }
    // Check for minimum password length (should also be verified on server)
    if (this.state.password.length < 6) {
      this.setState({ error: 'Password must be at least 6 characters', isLoading: false });
    }

    // Send signup mutation
    const { email, password } = this.state;
    const result = await this.props.signupMutation({
      variables: {
        email,
        password
      }
    });
    console.log(result);
    const { token } = result.data.login;
    localStorage.setItem(INSTRUCTOR_TOKEN, token);
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
        <section className="section">
        <div className="container">
          <h1 className="title">Instructor {this.state.signupMode ? "Signup" : "Login"}</h1>
          <i>If you are a student using wadayano in a course, simply launch it from your LMS (i.e. Canvas).</i>
          {this.state.error && <ErrorBox><p>{this.state.error}</p></ErrorBox> }
          <div className="column is-one-third-desktop is-half-tablet">
            <div className="field">
              <p className="control has-icons-left has-icons-right">
                  <input
                    autoFocus
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
                    value={this.state.password}
                    name="password"
                    onChange={this._handleInputChange}
                    onKeyPress={(e) => this._handleFormKeyPress(e)}
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
                    onKeyPress={(e) => this._handleFormKeyPress(e)}
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
                    className={"button is-success" + (this.state.isLoading ? " is-loading" : "")}
                    disabled={!formCompleted}
                    onClick={() => this._submit() }>
                  {this.state.signupMode ? "Sign Up" : "Log In"}
                  </button>
              </p>
            </div>
            <div className="field">
              {this.state.signupMode ? 
                <button className="button is-text" onClick={() => this.setState({ signupMode: false }) }>Already have an account? Log In</button>
              :
                <button className="button is-text" onClick={() => this.setState({ signupMode: true }) }>New to wadayano? Sign Up</button>
              }
            </div>
          </div>
        </div>
      </section>
    )
  }
}

const SIGNUP_MUTATION = gql`
  mutation SignupMutation($email: String!, $password: String!) {
    signup(email: $email, password: $password, role: "instructor") {
      token
    }
  }
`

const LOGIN_MUTATION = gql`
  mutation LoginMutation($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
    }
  }
`

export default compose(
  graphql(SIGNUP_MUTATION, { name: 'signupMutation' }),
  graphql(LOGIN_MUTATION, { name: 'loginMutation' }),
)(Login)