import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import JSON5 from 'json5';

import useForm from 'react-hook-form';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import Modal from '../shared/Modal';

const SAVE_QUIZ_MUTATION = gql`
  mutation quizSaveMutation($id: ID!, $data: QuizUpdateInput!) {
    updateQuiz(id: $id, data: $data) {
      id
    }
  }
`;

/**
 * Modal component to show a form (used within QuizEditor) requesting question JSON to import.
 * This component saves the data into the quiz, and signals the parent component to reload when it saves.
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const QuizJSONImportModal = ({ quizId, onClose }) => {
  const [isImporting, setIsImporting] = useState(false);
  const { handleSubmit, register } = useForm();
  const [saveQuizMutation] = useMutation(SAVE_QUIZ_MUTATION);

  // Update the quiz with the new questions
  const importJSON = async ({ jsonInput }) => {
    setIsImporting(true);
    try {
      // Parse with JSON5 to be more lenient about non-quoted property names, trailing commas, etc.
      const questionData = JSON5.parse(jsonInput.replace(/\r?\n|\r/g, ''));
      // Send the mutation
      const result = await saveQuizMutation({
        variables: {
          id: quizId,
          data: { questions: { create: questionData } },
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result.errors[0];
      }
      ButterToast.raise({
        content: (
          <ToastTemplate content="Questions imported successfully." className="is-success" />
        ),
        timeout: 3000,
      });
      // Close this modal, and tell the QuizEditor to refetch data
      onClose(true);
    } catch (error) {
      console.error(error);
      ButterToast.dismissAll();
      ButterToast.raise({
        content: (
          <ToastTemplate
            content={`The entered JSON was invalid, or there was an error importing the questions: ${error}`}
            className="is-danger"
          />
        ),
        timeout: 3000,
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal modalState title="Import Question JSON" closeModal={() => onClose(false)}>
      <form onSubmit={handleSubmit(importJSON)}>
        <textarea
          name="jsonInput"
          ref={register}
          className="textarea is-medium"
          rows={10}
          placeholder="Paste question JSON to import into this quiz"
          disabled={isImporting}
        />

        <hr />

        <div className="field is-grouped">
          <p className="control">
            <button
              className="button"
              onClick={() => onClose(false)}
              disabled={isImporting}
              type="button"
            >
              Cancel
            </button>
          </p>
          <p className="control">
            <button
              className={`button is-primary${isImporting ? ' is-loading' : ''}`}
              disabled={isImporting}
              type="submit"
            >
              Import Questions
            </button>
          </p>
        </div>
      </form>
    </Modal>
  );
};

QuizJSONImportModal.propTypes = {
  quizId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default QuizJSONImportModal;
