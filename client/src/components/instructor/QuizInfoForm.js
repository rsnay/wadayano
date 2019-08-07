import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import compose from '../../compose';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import OptionSelector from '../shared/OptionSelector';

/**
 * A form, intended for inclusion in a modal dialog in the quiz editor, to edit quiz information or delete the quiz.
 */
class QuizInfoForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isSaving: false,
      isDeleting: false,
    };
  }

  async saveQuiz(e) {
    if (e) {
      e.preventDefault();
    }
    // Prevent re-submission while performing operation
    if (this.state.isSaving || this.state.isDeleting) {
      return;
    }
    // Check that form is valid (e.g. for URL validation)
    if (!this.formElement.reportValidity()) {
      return;
    }
    // Collect data to update in the quiz
    const { quiz } = this.props;
    const quizData = {
      title: document.getElementById(quiz.id).value,
      type: Array.from(document.getElementsByName('quizType')).find(r => r.checked).value,
    };
    this.setState({ isSaving: true });

    try {
      // Send the mutation
      const result = await this.props.saveQuizMutation({
        variables: {
          id: quiz.id,
          data: quizData,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      ButterToast.raise({
        content: <ToastTemplate content="Quiz info saved." className="is-success" />,
      });

      // Let parent know that save has finished
      if (this.props.onSave) {
        this.props.onSave();
      }
    } catch (error) {
      ButterToast.raise({
        content: <ToastTemplate content="Error saving quiz info." className="is-danger" />,
      });
    } finally {
      this.setState({ isSaving: false });
    }
  }

  async deleteQuiz(quiz) {
    const confirmMessage =
      'Are you sure you want to delete this quiz? All students’ attempts for this quiz will also be deleted.';
    if (!window.confirm(confirmMessage)) {
      return;
    }
    this.setState({ isDeleting: true });
    try {
      const result = await this.props.quizDeleteMutation({
        variables: {
          id: quiz.id,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Redirect to course details after successful deletion
      this.props.history.push(`/instructor/course/${quiz.course.id}`);
      ButterToast.raise({
        content: <ToastTemplate content="Quiz was deleted." className="is-info" />,
      });
    } catch (error) {
      this.setState({ isDeleting: false });
      ButterToast.raise({
        content: <ToastTemplate content="Error deleting quiz." className="is-danger" />,
      });
    }
  }

  render() {
    const { quiz } = this.props;
    return (
      <form onSubmit={e => this.saveQuiz(e)} ref={el => (this.formElement = el)}>
        <label className="label is-medium">
          Quiz Title
          <br />
          <input
            className="input"
            type="text"
            placeholder="e.g. Lipids Review"
            defaultValue={quiz.title}
            id={quiz.id}
            style={{ maxWidth: '42rem' }}
            required
            pattern="(.|\s)*\S(.|\s)*"
            maxLength={200}
          />
        </label>

        <label className="label is-medium">
          Quiz Type
          <br />
        </label>
        <OptionSelector
          type="radio"
          name="quizType"
          defaultValue={quiz.type}
          options={[
            { value: 'GRADED', title: 'Graded quiz (must be launched from LMS)' },
            {
              value: 'PRACTICE',
              title: 'Practice quiz (students can launch from wadayano dashboard or LMS)',
            },
          ]}
        />
        <hr />

        <div className="field is-grouped">
          <p className="control buttons">
            <button className="button" type="button" onClick={this.props.onCancel}>
              Cancel
            </button>
            <button
              className={`button is-danger${this.state.isDeleting ? ' is-loading' : ''}`}
              type="button"
              disabled={this.state.isDeleting}
              onClick={() => this.deleteQuiz(quiz)}
            >
              Delete Quiz
            </button>
            <button
              className={`button is-primary${this.state.isSaving ? ' is-loading' : ''}`}
              type="submit"
              disabled={this.state.isSaving}
              onClick={() => this.saveQuiz()}
            >
              Save Changes
            </button>
          </p>
        </div>
      </form>
    );
  }
}

QuizInfoForm.propTypes = {
  quiz: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

const QUIZ_SAVE = gql`
  mutation quizSaveMutation($id: ID!, $data: QuizUpdateInput!) {
    updateQuiz(id: $id, data: $data) {
      id
    }
  }
`;

const QUIZ_DELETE = gql`
  mutation quizDeleteMutation($id: ID!) {
    deleteQuiz(id: $id) {
      id
    }
  }
`;

export default withRouter(
  compose(
    graphql(QUIZ_SAVE, { name: 'saveQuizMutation' }),
    graphql(QUIZ_DELETE, { name: 'quizDeleteMutation' })
  )(QuizInfoForm)
);
