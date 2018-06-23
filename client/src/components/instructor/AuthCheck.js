import React, { Component } from 'react';
import { Redirect } from 'react-router';

import { INSTRUCTOR_LOGGED_IN } from '../../constants';

export default class CourseList extends Component {
  render() {
    let instructorLoggedIn = localStorage.getItem(INSTRUCTOR_LOGGED_IN) === "true";

    if (!instructorLoggedIn) {
        return <Redirect to="/login" />
    }
    return null;
  }
}