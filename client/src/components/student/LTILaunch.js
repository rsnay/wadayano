import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_STUDENT } from '../../constants';

/**
 * This component just takes the student auth token passed in the route, saves it in localStorage
 * to be used for auth, and then redirects to wherever the launch should actually go.
 */
const LTILaunch = ({
  match: {
    params: { token, action, parameter1 },
  },
  history,
}) => {
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      // Save auth token
      localStorage.setItem(AUTH_TOKEN, token);
      localStorage.setItem(AUTH_ROLE, AUTH_ROLE_STUDENT);
      // Redirect
      history.replace(`/student/${action}/${parameter1}`);
    } catch (err) {
      // Display error
      setError('Something went wrong with the LTI launch. Please try again.');
    }
  }, [action, history, parameter1, token]);

  return error ? (
    <ErrorBox>
      <p>{error}</p>
    </ErrorBox>
  ) : (
    <LoadingBox />
  );
};

LTILaunch.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      token: PropTypes.string.isRequired,
      action: PropTypes.string.isRequired,
      parameter1: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  history: PropTypes.object.isRequired,
};

export default LTILaunch;
