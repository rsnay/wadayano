/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { Route, Redirect } from 'react-router';

import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR, AUTH_ROLE_STUDENT } from '../../constants';

/**
 * Determine whether the current user can access this route
 * @param {bool} allowInstructor if access should be allowed for instructors
 * @param {bool} allowStudent if access should be allowed for students
 * @returns {bool} whether access should be allowed
 */
function allowAccess(allowInstructor, allowStudent) {
  const loggedIn = !!localStorage.getItem(AUTH_TOKEN);
  if (!loggedIn) {
    // If not logged in, deny
    return false;
  }

  const currentRole = localStorage.getItem(AUTH_ROLE);
  // Determine access based on current role and what this check is valid for
  if (allowInstructor && currentRole === AUTH_ROLE_INSTRUCTOR) {
    return true;
  }
  if (allowStudent && currentRole === AUTH_ROLE_STUDENT) {
    return true;
  }
  // If role matched neither instructor nor student, or this route allows neither, deny
  return false;
}

/**
 * A <Route> component that wraps components and
 * provides an authentication check for the given roles.
 * Should be used in <App> in place of a regular <Route>.
 */
function AuthRoute({ children, instructor, student, ...rest }) {
  const valid = allowAccess(instructor, student);

  return (
    <Route
      {...rest}
      render={({ location }) =>
        valid ? children : <Redirect to={{ pathname: '/login', state: { from: location } }} />
      }
    />
  );
}

AuthRoute.propTypes = {
  children: PropTypes.element,
  instructor: PropTypes.bool,
  student: PropTypes.bool,
};

export default AuthRoute;
