import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { INSTRUCTOR_LOGGED_IN } from '../../constants';

export default class Login extends Component {

  constructor(props) {
    super(props);

    this.state = {
      signupMode: false, // Determines if log in or sign up form will be shown
      email: '',
      password: '',
      passwordConfirm: '',
      agreement: false
    };

    // Pre-bind this function, to make adding it to input fields easier
    this._handleInputChange = this._handleInputChange.bind(this);
  }

  // When the log in or sign up button is pressed
  _submit() {
    if (this.state.signupMode) {
      this._signUp();
    } else {
      this._logIn();
    }
  }

  // Log in the instructor
  _logIn() {
    localStorage.setItem(INSTRUCTOR_LOGGED_IN, 'true');
    // If login was successful, redirect to instructor view, or a 'from' redirect location, if passed in
    const { from } = this.props.location.state || { from: { pathname: '/instructor' } }
    console.log(from);
    this.props.history.push(from.pathname);
  }

  // Sign up a new instructor
  _signUp() {

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

  render() {
    return (
        <section className="section">
        <div className="container">
          <h1 className="title">Instructor {this.state.signupMode ? "Signup" : "Login"}</h1>
          <i>If you are a student using wadayano in a course, simply launch it from your LMS (i.e. Canvas).</i>
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
                  <button className="button is-success" onClick={() => this._submit() }>
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