import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { INSTRUCTOR_LOGGED_IN } from '../../constants';
export default class Login extends Component {
  state = {
  }

  _logIn() {
    localStorage.setItem(INSTRUCTOR_LOGGED_IN, "true");
    // If login was successful, redirect to instructor view
    this.props.history.push('/instructor');
  }

  render() {
    return (
        <section class="section">
        <div class="container">
          <h1 class="title">Instructor Login</h1>
          <i>Just clicking Log In will mark the session as instructor being logged in</i>
          <div class="column is-one-third-desktop is-half-tablet">
          <div class="field">
            <p class="control has-icons-left has-icons-right">
                <input class="input" type="email" placeholder="Email" />
                <span class="icon is-small is-left">
                <i class="fas fa-envelope"></i>
                </span>
            </p>
            </div>
            <div class="field">
            <p class="control has-icons-left">
                <input class="input" type="password" placeholder="Password" />
                <span class="icon is-small is-left">
                <i class="fas fa-lock"></i>
                </span>
            </p>
            </div>
            <div class="field">
            <p class="control">
                <button class="button is-success" onClick={() => this._logIn() }>
                Log In
                </button>
            </p>
          </div>
          </div>
        </div>
      </section>
    )
  }

}