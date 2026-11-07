/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';

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
 * Wraps route content and checks the roles allowed to access it.
 */
function AuthRoute({ children, instructor, student }) {
  const valid = allowAccess(instructor, student);
  const location = useLocation();
  return valid ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

AuthRoute.propTypes = {
  children: PropTypes.element,
  instructor: PropTypes.bool,
  student: PropTypes.bool,
};

export default AuthRoute;
