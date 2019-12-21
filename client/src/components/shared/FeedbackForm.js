import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import useForm from 'react-hook-form';

const SEND_FEEDBACK_MUTATION = gql`
  mutation SendFeedbackMutation($anonymous: Boolean!, $message: String!) {
    sendFeedback(anonymous: $anonymous, message: $message)
  }
`;

/**
 * Page that lets logged-in instructors and students send us feedback.
 * If feedback is marked as anonymous, the user’s ID won’t be with the message.
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const FeedbackForm = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const [sendFeedbackMutation] = useMutation(SEND_FEEDBACK_MUTATION);

  const { register, handleSubmit } = useForm();

  // When the send button is pressed, or form is submitted via enter key
  const sendFeedback = async formData => {
    // Prevent re-submission while loading
    if (isLoading) {
      return;
    }
    // Clear existing error, and set loading
    setError('');
    setIsLoading(false);

    const { anonymous } = formData;
    // Add user-agent to message
    const message = `${formData.message}\n\n${navigator.userAgent}`;

    try {
      const result = await sendFeedbackMutation({
        variables: { anonymous, message },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Display success message
      setIsComplete(true);
    } catch (e) {
      let errorMessage = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        errorMessage = e.errors[0].message;
      }
      setError(`Error sending feedback: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  if (isComplete) {
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
          If you’ve found a bug in wadayano or would like to make a suggestion, please tell us about
          it!
        </i>

        <form
          className="column is-one-third-desktop is-half-tablet"
          onSubmit={handleSubmit(sendFeedback)}
        >
          {error && <p className="notification is-danger">{error}</p>}

          <div className="field">
            <label className="label">Message</label>
            <div className="control">
              <textarea autoFocus className="textarea" name="message" ref={register} />
            </div>
          </div>

          <div className="field">
            <div className="control">
              <label className="checkbox">
                <input type="checkbox" name="anonymous" ref={register} />
                &nbsp; Send feedback anonymously
              </label>
            </div>
          </div>

          <div className="field">
            <p className="control">
              <button
                className={`button is-primary${isLoading ? ' is-loading' : ''}`}
                disabled={isLoading}
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
};

export default FeedbackForm;
