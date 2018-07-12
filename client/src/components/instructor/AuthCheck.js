import React, { Component } from 'react';
import { Redirect } from 'react-router';
import PropTypes from 'prop-types';

import { INSTRUCTOR_TOKEN } from '../../constants';

export default class AuthCheck extends Component {
  render() {
    let instructorLoggedIn = !!localStorage.getItem(INSTRUCTOR_TOKEN);

    if (!instructorLoggedIn) {
        console.log(this.props.location);
        return <Redirect to={{
          pathname: '/login',
          state: { from: this.props.location }
        }} />
    }
    return null;
  }
}

// If it's desired that the instructor be redirectedd to the URL being attempted to access, pass in the location prop. Not required.
AuthCheck.propTypes = {
  location: PropTypes.object
}