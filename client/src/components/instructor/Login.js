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
    // If login was successful, redirect to instructor view, or a 'from' redirect location, if passed in
    const { from } = this.props.location.state || { from: { pathname: '/instructor' } }
    console.log(from);
    this.props.history.push(from.pathname);
  }

  render() {
    return (
        <section className="section">
        <div className="container">
          <h1 className="title">Instructor Login</h1>
          <i>Just clicking Log In will mark the session as instructor being logged in</i>
          <div className="column is-one-third-desktop is-half-tablet">
          <div className="field">
            <p className="control has-icons-left has-icons-right">
                <input className="input" type="email" placeholder="Email" />
                <span className="icon is-small is-left">
                <i className="fas fa-envelope"></i>
                </span>
            </p>
            </div>
            <div className="field">
            <p className="control has-icons-left">
                <input className="input" type="password" placeholder="Password" />
                <span className="icon is-small is-left">
                <i className="fas fa-lock"></i>
                </span>
            </p>
            </div>
            <div className="field">
            <p className="control">
                <button className="button is-success" onClick={() => this._logIn() }>
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