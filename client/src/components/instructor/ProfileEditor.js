import React, { Component } from 'react';
import { Link, Redirect } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import compose from '../../compose';
import withAuthCheck from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import ButterToast, { ToastTemplate } from '../shared/Toast';

class ProfileEditor extends Component {
  constructor(props) {
    super(props);

    this.state = {
      instructorLoaded: false,
      isSaving: false,
      shouldRedirect: false,
      currentPassword: '',
      newEmail: '',
      newPassword: '',
      newPasswordConfirm: '',
      error: '',
    };

    // Pre-bind this function, to make adding it to input fields easier
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (
      !nextProps.instructorQuery.error &&
      !nextProps.instructorQuery.loading &&
      !prevState.instructorLoaded
    ) {
      return {
        newEmail: nextProps.instructorQuery.currentInstructor.email,
        instructorLoaded: true,
      };
    }
    return null;
  }

  // When the update button is pressed or form is submitted via enter key
  submit(e) {
    if (e) {
      e.preventDefault();
    }
    // Prevent re-submission while loading
    if (this.state.isSaving) {
      return;
    }
    this.updateProfile();
  }

  // Update the instructor’s email address and/or password
  async updateProfile() {
    this.setState({ error: '', isSaving: true });
    // Check that passwords match
    if (
      this.state.newPassword.length > 0 &&
      this.state.newPassword !== this.state.newPasswordConfirm
    ) {
      this.setState({ error: 'New passwords do not match.', isSaving: false });
      return;
    }

    // Send update profile mutation
    const { id } = this.props.instructorQuery.currentInstructor;
    const { currentPassword, newEmail, newPassword } = this.state;
    try {
      const result = await this.props.instructorUpdateProfileMutation({
        variables: {
          id,
          currentPassword,
          newEmail,
          newPassword,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      console.log('Update result', result);
      // Show success message
      this.setState({ isSaving: false, shouldRedirect: true }, () => {
        ButterToast.raise({
          content: <ToastTemplate content="Your profile was updated." className="is-success" />,
        });
      });
    } catch (e) {
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      // Decode a specific error message
      if (message.indexOf('unique constraint would be violated') >= 0) {
        message = 'An existing instructor already has the given new email address.';
      }
      this.setState({ error: `Error updating profile: ${message}`, isSaving: false });
      console.error(`Error updating profile: ${JSON.stringify(e)}`);
    }
  }

  // Called when the form fields change
  // This function is from https://reactjs.org/docs/forms.html
  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value,
    });
  }

  render() {
    if (this.props.instructorQuery && this.props.instructorQuery.loading) {
      return <Spinner />;
    }

    if (this.props.instructorQuery && this.props.instructorQuery.error) {
      return (
        <ErrorBox>
          <p>Error loading profile. Please try again later.</p>
        </ErrorBox>
      );
    }

    // Redirect to course list after successful update
    // This is necessary to trigger the browser prompting to save the updated password
    if (this.state.shouldRedirect) {
      return <Redirect push to="/instructor" />;
    }

    const { currentPassword, newEmail, newPassword, newPasswordConfirm } = this.state;

    const formCompleted =
      currentPassword &&
      (newPassword || newPasswordConfirm ? newPasswordConfirm === newPassword : true);

    return (
      <section className="section no-select container">
        <h1 className="title is-3">My Profile</h1>
        <i>Enter your current password to change your email address or set a new password.</i>
        <br />
        <i>Leave new password or email blank to keep existing password/email.</i>

        <form className="column is-one-third-desktop is-half-tablet" onSubmit={e => this.submit(e)}>
          {this.state.error && <p className="notification is-danger">{this.state.error}</p>}

          <div className="field">
            <label className="label">Current Password</label>
            <p className="control has-icons-left">
              <input
                required
                value={currentPassword}
                name="currentPassword"
                onChange={this.handleInputChange}
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
                value={newEmail}
                name="newEmail"
                onChange={this.handleInputChange}
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
                value={newPassword}
                name="newPassword"
                onChange={this.handleInputChange}
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
                value={newPasswordConfirm}
                name="newPasswordConfirm"
                onChange={this.handleInputChange}
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
                className={`button is-primary${this.state.isSaving ? ' is-loading' : ''}`}
                disabled={!formCompleted || this.state.isSaving}
                onClick={() => this.submit()}
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
          If you need to delete your instructor account, please{' '}
          <Link to="/feedback">contact us</Link>.
        </p>

        {/* <pre>{JSON.stringify(instructor)}</pre> */}
      </section>
    );
  }
}

// Get the instructor’s profile, so that email address can be pre-filled
const INSTRUCTOR_QUERY = gql`
  query instructorQuery {
    currentInstructor {
      id
      email
      createdAt
      courses {
        id
      }
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

export default withAuthCheck(
  compose(
    graphql(INSTRUCTOR_QUERY, { name: 'instructorQuery' }),
    graphql(INSTRUCTOR_UPDATE_PROFILE_MUTATION, { name: 'instructorUpdateProfileMutation' })
  )(ProfileEditor),
  { instructor: true }
);
