import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import withAuthCheck from './AuthCheck';

class FeedbackForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      anonymous: false,
      message: '',
      error: '',
      isLoading: false,
      isComplete: false,
    };

    // Pre-bind this function, to make adding it to input fields easier
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  // When the send button is pressed, or form is submitted via enter key
  async submit(e) {
    if (e) {
      e.preventDefault();
    }
    // Prevent re-submission while loading
    if (this.state.isLoading) {
      return;
    }
    // Clear existing error, and set loading
    this.setState({ error: '', isLoading: true });
    // Send feedback mutation
    let { anonymous, message } = this.state;
    // Add user-agent to message
    message += `\n\n${navigator.userAgent}`;

    try {
      const result = await this.props.sendFeedbackMutation({
        variables: {
          anonymous,
          message,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Display success message
      this.setState({ isComplete: true });
    } catch (error) {
      let errorMessage = 'Please try again later.';
      if (error.errors && error.errors.length > 0) {
        errorMessage = error.errors[0].message;
      }
      this.setState({ error: `Error sending feedback: ${errorMessage}`, isLoading: false });
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
    const formCompleted = this.state.message !== '';

    if (this.state.isComplete) {
      return (
        <article className="container message is-success" style={{ marginTop: '3em' }}>
          <div className="message-header">
            <p>Thanks! Your feedback has been sent.</p>
            <span className="icon is-large">
              <i className="fas fa-3x fa-check-circle" aria-hidden="true" />
            </span>
          </div>
          <div className="message-body">
            <Link className="button" to="/">
              Return to Dashboard
            </Link>
          </div>
        </article>
      );
    }

    return (
      <section className="section no-select">
        <div className="container">
          <h1 className="title">Send Feedback</h1>
          <i>
            If you’ve found a bug in wadayano or would like to make a suggestion, please tell us
            about it!
          </i>

          <form
            className="column is-one-third-desktop is-half-tablet"
            onSubmit={e => this.submit(e)}
          >
            {this.state.error && <p className="notification is-danger">{this.state.error}</p>}

            <div className="field">
              <label className="label">Message</label>
              <div className="control">
                <textarea
                  autoFocus
                  className="textarea"
                  name="message"
                  value={this.state.message}
                  onChange={this.handleInputChange}
                />
              </div>
            </div>

            <div className="field">
              <div className="control">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    name="anonymous"
                    checked={this.state.anonymous}
                    onChange={this.handleInputChange}
                  />
                  &nbsp; Send feedback anonymously
                </label>
              </div>
            </div>

            <div className="field">
              <p className="control">
                <button
                  className={`button is-primary${this.state.isLoading ? ' is-loading' : ''}`}
                  disabled={!formCompleted || this.state.isLoading}
                  type="submit"
                >
                  Send
                </button>
              </p>
            </div>
          </form>
        </div>
      </section>
    );
  }
}

const SEND_FEEDBACK_MUTATION = gql`
  mutation SendFeedbackMutation($anonymous: Boolean!, $message: String!) {
    sendFeedback(anonymous: $anonymous, message: $message)
  }
`;

export default withAuthCheck(
  graphql(SEND_FEEDBACK_MUTATION, { name: 'sendFeedbackMutation' })(FeedbackForm),
  { instructor: true, student: true }
);
