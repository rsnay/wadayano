import React, { Component } from 'react';
import { Redirect } from 'react-router';
import PropTypes from 'prop-types';

import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR, AUTH_ROLE_STUDENT } from '../../constants';

export default class AuthCheck extends Component {
  render() {
    let loggedIn = !!localStorage.getItem(AUTH_TOKEN);
    let role = localStorage.getItem(AUTH_ROLE);

    let valid = true;
    // Determine if it's valid, based on current role and what this check is valid for (student and/or instructor)
    if (!loggedIn) { // If not logged in, invalid
      valid = false;
    } else if (!(this.props.instructor || this.props.student)) { // If no restrictions for student/instructor specified, leave it valid
    } else if (role !== AUTH_ROLE_INSTRUCTOR && role !== AUTH_ROLE_STUDENT) { // If role somehow doesn't match either instructor or student, invalid
      valid = false;
    } else if (role === AUTH_ROLE_INSTRUCTOR && !this.props.instructor) { // If instructor, but not checking for instructor, invalid
      valid = false;
    } else if (role === AUTH_ROLE_STUDENT && !this.props.student) { // If student, but not checking for student, invalid
      valid = false;
    }

    if (!valid) {
        console.log(this.props.location);
        return <Redirect to={{
          pathname: '/login',
          state: { from: this.props.location }
        }} />
    }
    return null;
  }
}

AuthCheck.propTypes = {
  // Simply put the instructor and/or student prop in the component (no value required) to make the check valid for those role(s)
  instructor: PropTypes.any,
  student: PropTypes.any,
  // If it's desired that the instructor be redirectedd to the URL being attempted to access, pass in the location prop. Not required.
  location: PropTypes.object
}