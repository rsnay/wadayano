import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useQuery, useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import useForm from 'react-hook-form';

import withAuthCheck from '../shared/AuthCheck';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import ButterToast, { ToastTemplate } from '../shared/Toast';

// Get the instructor’s profile, so that email address can be pre-filled
const INSTRUCTOR_QUERY = gql`
  query instructorQuery {
    currentInstructor {
      id
      email
      createdAt
    }
  }
`;

const INSTRUCTOR_UPDATE_PROFILE_MUTATION = gql`
  mutation instructorUpdateProfileMutation(
    $id: ID!
    $currentPassword: String!
    $newEmail: String
    $newPassword: String
  ) {
    instructorUpdateProfile(
      id: $id
      currentPassword: $currentPassword
      newEmail: $newEmail
      newPassword: $newPassword
    )
  }
`;

const ProfileEditor = () => {
  const history = useHistory();

  const { loading, error: queryError, data } = useQuery(INSTRUCTOR_QUERY);
  const [instructorUpdateProfileMutation] = useMutation(INSTRUCTOR_UPDATE_PROFILE_MUTATION);

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { register, handleSubmit } = useForm();

  // Update the instructor’s email address and/or password
  const updateProfile = async ({ newEmail, currentPassword, newPassword, newPasswordConfirm }) => {
    // Prevent re-submission while loading
    if (isSaving) {
      return;
    }

    // Check that passwords match
    if (newPassword !== newPasswordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    // Check for minimum password length (should also be verified on server)
    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Clear existing error, and set saving
    setError('');
    setIsSaving(true);

    // Send update profile mutation
    try {
      const { id } = data.currentInstructor;
      const result = await instructorUpdateProfileMutation({
        variables: { id, currentPassword, newEmail, newPassword },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      ButterToast.raise({
        content: <ToastTemplate content="Your profile was updated." className="is-success" />,
      });
      // Redirect to course list after successful update
      // This triggers the browser promp to save the updated password
      history.push('/instructor/courses');
    } catch (e) {
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      // Decode a specific error message
      if (message.indexOf('unique constraint would be violated') >= 0) {
        message = 'An existing instructor already has the given new email address.';
      }
      setError(`Error updating profile: ${message}`);
      console.error(`Error updating profile: ${JSON.stringify(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (queryError) {
    return (
      <ErrorBox>
        <p>Error loading profile. Please try again later.</p>
      </ErrorBox>
    );
  }

  return (
    <section className="section no-select container">
      <h1 className="title is-3">My Profile</h1>
      <i>Enter your current password to change your email address or set a new password.</i>
      <br />
      <i>Leave new password or email blank to keep existing password/email.</i>

      <form
        className="column is-one-third-desktop is-half-tablet"
        onSubmit={handleSubmit(updateProfile)}
      >
        {error && <p className="notification is-danger">{error}</p>}

        <div className="field">
          <label className="label">Current Password</label>
          <p className="control has-icons-left">
            <input
              required
              name="currentPassword"
              ref={register}
              className="input"
              type="password"
              placeholder="Current Password"
            />
            <span className="icon is-small is-left">
              <i className="fas fa-lock" />
            </span>
          </p>
        </div>

        <div className="field">
          <label className="label">Email Address</label>
          <p className="control has-icons-left has-icons-right">
            <input
              name="newEmail"
              ref={register}
              defaultValue={data.currentInstructor.email}
              className="input"
              type="email"
              maxLength={255}
              placeholder="Email Address"
            />
            <span className="icon is-small is-left">
              <i className="fas fa-envelope" />
            </span>
          </p>
        </div>

        <div className="field">
          <label className="label">New Password</label>
          <p className="control has-icons-left">
            <input
              name="newPassword"
              ref={register}
              className="input"
              type="password"
              placeholder="New Password"
            />
            <span className="icon is-small is-left">
              <i className="fas fa-lock" />
            </span>
          </p>
        </div>

        <div className="field">
          <p className="control has-icons-left">
            <input
              name="newPasswordConfirm"
              ref={register}
              className="input"
              type="password"
              placeholder="Confirm New Password"
            />
            <span className="icon is-small is-left">
              <i className="fas fa-lock" />
            </span>
          </p>
        </div>

        <div className="field">
          <p className="control">
            <button
              className={`button is-primary${isSaving ? ' is-loading' : ''}`}
              disabled={isSaving}
              type="submit"
            >
              Update Profile
            </button>
          </p>
        </div>
      </form>

      <br />

      <h2 className="subtitle is-4">Delete My Account</h2>
      <p className="content">
        If you need to delete your account, please <Link to="/feedback">contact us</Link>.
      </p>

      {/* <pre>{JSON.stringify(data.currentInstructor)}</pre> */}
    </section>
  );
};

export default withAuthCheck(ProfileEditor, { instructor: true });
