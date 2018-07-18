import React, { Component } from 'react';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_STUDENT } from '../../constants';

// This component just takes the student auth token passed in the route, saves it in localStorage to be used for auth, and then redirects to wherever the launch should actually go
export default class LTILaunch extends Component {

  constructor(props) {
    super(props);

    this.state = {
      signupMode: false, // Determines if log in or sign up form will be shown
      email: '',
      password: '',
      passwordConfirm: '',
      error: '',
      isLoading: false
    };
  }

  componentDidMount() {
    try {
      const { params } = this.props.match;
      // Save auth token
      localStorage.setItem(AUTH_TOKEN, params.token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_STUDENT);
      // Redirect
      this.props.history.replace(`/student/${params.action}/${params.parameter1}`);
    } catch (error) {
      this.setState({ error: 'Something went wrong with the LTI launch. Please try again.'});
    }
  }

  render() {

    if (this.props.quizQuery && this.props.quizQuery.loading) {
      return <LoadingBox />;
    }

    if (this.state.error) {
      return <ErrorBox>
        <p>{this.state.error}</p>
      </ErrorBox>
    } else {
      return <LoadingBox />;
    }
  }
}