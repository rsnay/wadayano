import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import { AUTH_ROLE, AUTH_ROLE_STUDENT, AUTH_ROLE_INSTRUCTOR } from '../../constants';

export default class Welcome extends Component {

  componentDidMount() {
    const authRole = localStorage.getItem(AUTH_ROLE);
    if (authRole === AUTH_ROLE_STUDENT) {
      this.props.history.replace('/student');
      return;
    }
    if (authRole === AUTH_ROLE_INSTRUCTOR) {
      this.props.history.replace('/instructor');
      return;
    }
  }

  render() {

    return (
        <section className="section">
        <div className="container">
          <h1 className="title">Welcome to wadayano!</h1>
          <div className="content">
            <p>To get started, log in or sign up.</p>
            <p className="buttons">
              <Link to="/login" className="button is-primary">
                <span className="icon">
                  <i className="fas fa-sign-in-alt"></i>
                </span>
                <span>Log In</span>
              </Link>
              <Link to="/signup" className="button is-primary">
                <span className="icon">
                  <i className="fas fa-user-plus"></i>
                </span>
                <span>Sign Up</span>
              </Link>
            </p>
          </div>
        </div>
      </section>
    )
  }

}