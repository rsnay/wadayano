import React, { Component } from 'react';
import { Redirect } from 'react-router';
import PropTypes from 'prop-types';

import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR, AUTH_ROLE_STUDENT } from '../../constants';


/**
 * A higher-order component that wraps other components and
 * provides an authentication check for the given roles.
 *
 * @export
 * @param {Component} WrappedComponent - Component to wrap
 * @param {Object} authRoles - optional object containing boolean student and/or instructor properites to restrict the authCheck to those roles. If neither property is provided, the check will pass if any user/role is logged in.
 * @returns {WithAuthCheck(Component)} - the wrapped component
 */
export function withAuthCheck(WrappedComponent, authRoles) {
  class WithAuthCheck extends Component {
    constructor(props) {
      super(props);
      let loggedIn = !!localStorage.getItem(AUTH_TOKEN);
      let role = localStorage.getItem(AUTH_ROLE);
      let roles = authRoles || {};
  
      console.log(role, roles);
      let valid = true;
      // Determine if it’s valid, based on current role and what this check is valid for (student and/or instructor)
      if (!loggedIn) { // If not logged in, invalid
        valid = false;
        console.log(19);
      } else if (!(roles.instructor || roles.student)) { // If no restrictions for student/instructor specified, leave it valid
        console.log(22);
      } else if (role !== AUTH_ROLE_INSTRUCTOR && role !== AUTH_ROLE_STUDENT) { // If role somehow doesn’t match either instructor or student, invalid
        valid = false;
        console.log(25);
      } else if (role === AUTH_ROLE_INSTRUCTOR && !roles.instructor) { // If instructor, but not checking for instructor, invalid
        valid = false;
        console.log(28);
      } else if (role === AUTH_ROLE_STUDENT && !roles.student) { // If student, but not checking for student, invalid
        valid = false;
        console.log(31);
      }
      this.valid = valid;
    }

    render() {
      // Wraps the input component in a container, without mutating it.
      console.log(this.valid);
      if (!this.valid) {
          return <Redirect to={{
            pathname: '/login',
            state: { from: this.props.location }
          }} />
      }
      return <WrappedComponent {...this.props} />;
    }
  }
  WithAuthCheck.displayName = `WithAuthCheck(${WrappedComponent.displayName || WrappedComponent.name || 'Component'}`;
  return WithAuthCheck;
}
