import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';

import useForm from 'react-hook-form';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import OptionSelector from '../shared/OptionSelector';

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

/**
 * A form, intended for inclusion in a modal dialog in the quiz editor, to edit quiz information or delete the quiz.
 */
const QuizInfoForm = ({ quiz, onCancel, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit } = useForm();

  const [saveQuizMutation] = useMutation(QUIZ_SAVE);
  const [deleteQuizMutation] = useMutation(QUIZ_DELETE);
  const history = useHistory();

  const saveQuiz = async formData => {
    // Prevent re-submission while performing operation
    if (isSaving || isDeleting) {
      return;
    }
    // Validation was already performed by react-hook-form
    setIsSaving(true);

    try {
      // Send the mutation
      const result = await saveQuizMutation({
        variables: {
          id: quiz.id,
          // The “name” attributes of the form elements match the
          // quiz property names.
          data: formData,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      ButterToast.raise({
        content: <ToastTemplate content="Quiz info saved." className="is-success" />,
      });

      // Let parent know that save has finished
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error(error);
      ButterToast.raise({
        content: <ToastTemplate content="Error saving quiz info." className="is-danger" />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuiz = async () => {
    const confirmMessage =
      'Are you sure you want to delete this quiz? All students’ attempts for this quiz will also be deleted.';
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setIsDeleting(false);
    try {
      const result = await deleteQuizMutation({
        variables: {
          id: quiz.id,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      ButterToast.raise({
        content: <ToastTemplate content="Quiz was deleted." className="is-info" />,
      });
      // Redirect to course details after successful deletion
      history.push(`/instructor/course/${quiz.course.id}`);
    } catch (error) {
      setIsDeleting(false);
      ButterToast.raise({
        content: <ToastTemplate content="Error deleting quiz." className="is-danger" />,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(saveQuiz)}>
      <label className="label is-medium">
        Quiz Title
        <br />
        <input
          name="title"
          ref={register}
          className="input"
          type="text"
          placeholder="e.g. Lipids Review"
          defaultValue={quiz.title}
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
        name="type"
        inputRef={register}
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
          <button className="button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`button is-danger${isDeleting ? ' is-loading' : ''}`}
            type="button"
            disabled={isDeleting}
            onClick={() => deleteQuiz(quiz)}
          >
            Delete Quiz
          </button>
          <button
            className={`button is-primary${isSaving ? ' is-loading' : ''}`}
            type="submit"
            disabled={isSaving}
          >
            Save Changes
          </button>
        </p>
      </div>
    </form>
  );
};

QuizInfoForm.propTypes = {
  quiz: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default QuizInfoForm;
