import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from './AuthCheck';

class FeedbackForm extends Component {

  constructor(props) {
    super(props);

    this.state = {
      anonymous: false,
      message: '',
      error: '',
      isLoading: false,
      isComplete: false
    };

    // Pre-bind this function, to make adding it to input fields easier
    this._handleInputChange = this._handleInputChange.bind(this);
  }

  // When the send button is pressed, or form is submitted via enter key
  async _submit(e) {
    if (e) {
      e.preventDefault();
    }
    // Clear existing error, and set loading
    this.setState({ error: '', isLoading: true });
    // Send feedback mutation
    let { anonymous, message } = this.state;
    // Add user-agent to message
    message += '\n\n' + navigator.userAgent;

    try {
      const result = await this.props.sendFeedbackMutation({
        variables: {
          anonymous,
          message
        }
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Display success message
      this.setState({ isComplete: true });
    } catch (e) {
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      this.setState({ error: 'Error sending feedback: ' + message, isLoading: false });
    }
  }

  // Called when the form fields change
  // This function is from https://reactjs.org/docs/forms.html
  _handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }

  render() {

    let formCompleted = this.state.message !== '';

    if (this.state.isComplete) {
      return (
          <article className="container message is-success" style={{marginTop: "3em"}}>
              <div className="message-header">
                  <p>Thanks! Your feedback has been sent.</p>
                  <span className="icon is-large"><i className="fas fa-3x fa-check-circle" aria-hidden="true"></i></span>
              </div>
              <div className="message-body">
                  <Link className="button" to="/">Return to Dashboard</Link>
              </div>
          </article>
      );
    }

    return (
        <section className="section no-select">
        <div className="container">
          <h1 className="title">Send Feedback</h1>
          <i>If you’ve found a bug in wadayano or would like to make a suggestion, please tell us about it!</i>

          <form className="column is-one-third-desktop is-half-tablet" onSubmit={(e) => this._submit(e) }>

            {this.state.error && <p className="notification is-danger">{this.state.error}</p> }

            <div className="field">
              <label className="label">Message</label>
              <div className="control">
                <textarea className="textarea" name="message" value={this.state.message} onChange={this._handleInputChange} />
              </div>
            </div>

            <div className="field">
              <div className="control">
                <label className="checkbox">
                  <input type="checkbox" name="anonymous" checked={this.state.anonymous} onChange={this._handleInputChange} />
                  &nbsp; Send feedback anonymously
                </label>
              </div>
            </div>

            <div className="field">
              <p className="control">
                  <button
                    className={"button is-primary" + (this.state.isLoading ? " is-loading" : "")}
                    disabled={!formCompleted}>
                    Send
                  </button>
              </p>
            </div>
          </form>

        </div>
      </section>
    )
  }
}

const SEND_FEEDBACK_MUTATION = gql`
  mutation SendFeedbackMutation($anonymous: Boolean!, $message: String!) {
    sendFeedback(anonymous: $anonymous, message: $message)
  }
`

export default withAuthCheck( graphql(SEND_FEEDBACK_MUTATION, { name: 'sendFeedbackMutation' }) (FeedbackForm), { instructor: true, student: true });