import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from '../../navigation';
import useForm from 'react-hook-form';
import useApiQuery from '../../useApiQuery';
import { apiRequest } from '../../api';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import ButterToast, { ToastTemplate } from '../shared/Toast';

/**
 * Page that allows instructors to edit their email address and/or password.
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const ProfileEditor = () => {
  const history = useHistory();

  const { loading, error: queryError, data } = useApiQuery('/api/instructor');

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
      await apiRequest('/api/instructor/profile', {
        method: 'PATCH',
        body: { currentPassword, newEmail, newPassword },
      });
      ButterToast.raise({
        content: <ToastTemplate content="Your profile was updated." className="is-success" />,
      });
      // Redirect to course list after successful update
      // This triggers the browser promp to save the updated password
      history.push('/instructor/courses');
    } catch (e) {
      let message = 'Please try again later.';
      if (e.code === 'email_already_exists') {
        message = 'An existing instructor already has the given new email address.';
      } else if (e.code === 'current_password_incorrect') {
        message = 'The current password was incorrect.';
      } else if (e.code === 'password_reset_required') {
        message = 'Your password must be reset before your profile can be changed.';
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
              defaultValue={data.email}
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

      {/* <pre>{JSON.stringify(data)}</pre> */}
    </section>
  );
};

export default ProfileEditor;
