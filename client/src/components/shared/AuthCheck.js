import React, { Component } from 'react';
import { Redirect } from 'react-router';

import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_INSTRUCTOR, AUTH_ROLE_STUDENT } from '../../constants';

/**
 * A higher-order component that wraps other components and
 * provides an authentication check for the given roles.
 * Should typically only be used on components that act as pages.
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
            let currentRole = localStorage.getItem(AUTH_ROLE);
            let allowedRoles = authRoles || {};
            
            let valid = true;
            // Determine if it’s valid, based on current role and what this check is valid for (student and/or instructor)
            if (!loggedIn) {
                // If not logged in, invalid
                valid = false;
            } else if (!(allowedRoles.instructor || allowedRoles.student)) {
                // If no restrictions for student/instructor specified, leave it valid
            } else if (currentRole !== AUTH_ROLE_INSTRUCTOR && currentRole !== AUTH_ROLE_STUDENT) {
                // If role somehow doesn’t match either instructor or student, invalid
                valid = false;
            } else if (currentRole === AUTH_ROLE_INSTRUCTOR && !allowedRoles.instructor) {
                // If instructor, but not checking for instructor, invalid
                valid = false;
            } else if (currentRole === AUTH_ROLE_STUDENT && !allowedRoles.student) {
                // If student, but not checking for student, invalid
                valid = false;
            }
            this.valid = valid;
        }
        
        render() {
            // Redirect to login if unauthorized, and pass the location to redirect to via state
            if (!this.valid) {
                return <Redirect to={{
                    pathname: '/login',
                    state: { from: this.props.location }
                }} />
            }
            // Wraps the input component in a container, without mutating it.
            return <WrappedComponent {...this.props} />;
        }
    }
    WithAuthCheck.displayName = `WithAuthCheck(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    return WithAuthCheck;
}
