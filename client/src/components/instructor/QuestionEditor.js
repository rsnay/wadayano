import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { NavigationPrompt as Prompt } from '../shared/NavigationPrompt';
import update from 'immutability-helper';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import {
  ALPHABET,
  QUESTION_TYPE_NAMES,
  DEFAULT_QUESTION_TYPE,
  MULTIPLE_CHOICE,
  SHORT_ANSWER,
} from '../../constants';
import { stripTags } from '../../utils';
import { apiRequest } from '../../api';

import ErrorBox from '../shared/ErrorBox';
import ConceptSelector from './ConceptSelector';
import { PromptEditor, OptionEditor } from './RichTextEditor';
import OptionSelector from '../shared/OptionSelector';

const unsavedAlertMessage =
  'You have unsaved questions in this quiz. Do you want to discard these changes?';

// Used in question state initializer
const initialQuestion = (isNew, questionId) => {
  // If not a new question, set to null until loaded from server
  if (!isNew) return null;

  // If new, create a skeleton question with temp IDs
  return {
    id: questionId,
    concept: '',
    prompt: '',
    type: DEFAULT_QUESTION_TYPE,
    options: [
      { id: '_newOption1', text: '', isCorrect: false },
      { id: '_newOption2', text: '', isCorrect: false },
      { id: '_newOption3', text: '', isCorrect: false },
      { id: '_newOption4', text: '', isCorrect: false },
      { id: '_newOption5', text: '', isCorrect: false },
      { id: '_newOption6', text: '', isCorrect: false },
      { id: '_newOption7', text: '', isCorrect: false },
      { id: '_newOption8', text: '', isCorrect: false },
    ],
    correctShortAnswers: [],
  };
};

/**
 * This component allows question editing (used in QuizEditor), including the concept, prompt,
 * question type, and multiple choice options or correct short answers.
 * It handles saving and deleting the question itself, and provides callbacks to alert the QuizEditor.
 * This is currently the most complex component in wadayano!
 */
const QuestionEditor = ({
  elementId,
  courseId,
  quizId,
  questionId,
  questionIndex,
  defaultPrompt,
  isNew,
  onDelete,
  onNewSave,
}) => {
  // New questions default to expanded
  const [isExpanded, setIsExpanded] = useState(isNew);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);
  const [questionQuery, setQuestionQuery] = useState({
    loading: false,
    error: null,
    data: null,
  });
  // Modified question object
  const [question, setQuestion] = useState(initialQuestion(isNew, questionId));

  const handleBeforeUnload = useCallback(
    e => {
      // Warn of any unsaved changes before navigating away
      if (isDirty) {
        e.returnValue = unsavedAlertMessage;
        return unsavedAlertMessage;
      }
    },
    [isDirty]
  );

  useEffect(() => {
    // Add beforeunload listener to alert user of unsaved changes
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  async function loadQuestion() {
    setQuestionQuery({ loading: true, error: null, data: null });
    try {
      const data = await apiRequest(
        `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
      );
      setQuestionQuery({ loading: false, error: null, data });
    } catch (queryError) {
      setQuestionQuery({ loading: false, error: queryError, data: null });
    }
  }

  useEffect(() => {
    // Have overall loading state reflect query loading state
    setIsLoading(questionQuery.loading);
    // If the query loaded, set the question or an error
    if (questionQuery.error) {
      setError('Error loading question. Please try again later.');
    } else if (!questionQuery.loading && questionQuery.data) {
      if (questionQuery.data.question) {
        setQuestion(questionQuery.data.question);
        setIsExpanded(true);
      } else {
        setError('Error loading question: question not found');
      }
    }
  }, [questionQuery]);

  async function deleteQuestion() {
    if (
      !window.confirm(
        'Remove this question from the quiz? Existing student attempt records will be retained.'
      )
    ) {
      return;
    }
    setIsDeleting(true);
    setIsDirty(false);
    setIsExpanded(false);
    try {
      await apiRequest(
        `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
        { method: 'DELETE' },
      );
      setIsDeleting(false);
      // Let the main editor know this question was deleted, so it can be hidden without having to reload entire quiz
      if (onDelete) {
        onDelete();
      }
    } catch (e) {
      let message = 'Please try again later.';
      if (e.code === 'question_not_found') {
        message = 'This question is no longer in the quiz.';
      }

      setError(`There was an error deleting this question: ${message}`);
      setIsDeleting(false);
    }
  }

  // Performs various checks on a given question (for before the quiz is saved)
  // Returns true if valid, or a message describing why it’s invalid
  function validateQuestion() {
    const { prompt, concept, type } = question;
    // Ensure the question has a non-empty prompt
    if (prompt === null || prompt.trim() === '') {
      return 'Please enter a prompt for this question';
    }
    // Ensure the question has a non-empty concept
    if (concept === null || concept.trim() === '') {
      return 'Please enter a concept for this question';
    }
    if (type === MULTIPLE_CHOICE) {
      // Ensure there are at least 2 non-empty options
      let optionCount = 0;
      let noCorrectOption = true;
      let correctOptionEmpty = false;
      question.options.forEach(option => {
        const { text, isCorrect } = option;
        const isEmpty = text === null || text.trim() === '';
        if (!isEmpty) {
          optionCount++;
        }
        if (isCorrect) {
          noCorrectOption = false;
        }
        // Ensure that the correct option is non-empty
        if (isCorrect && isEmpty) {
          correctOptionEmpty = true;
        }
      });
      if (optionCount < 2) {
        return 'The question must have 2 or more non-blank options';
      }
      if (noCorrectOption) {
        return 'There must be a correct option (choose with the radio button to the left of the option).';
      }
      if (correctOptionEmpty) {
        return 'The correct option must not be be blank';
      }
    } else if (type === SHORT_ANSWER) {
      // Ensure there is at least 1 non-empty correct short answer
      const shortAnswers = question.correctShortAnswers.filter(answer => answer.trim() !== '');
      if (shortAnswers.length === 0) {
        return 'There must be at least one non-blank correct short answer.';
      }
    }
    // Question is valid
    return true;
  }

  async function saveQuestion() {
    setIsLoading(true);
    const valid = validateQuestion();
    if (valid !== true) {
      alert(`Please correct this error: ${valid}`);
      setIsLoading(false);
      return;
    }
    const updatedQuestion = {
      type: question.type,
      prompt: question.prompt,
      concept: question.concept,
      options: question.options.map(({ id, text, isCorrect }) => ({ id, text, isCorrect })),
      correctShortAnswers: question.correctShortAnswers,
    };
    try {
      if (isNew) {
        const result = await apiRequest(
          `/api/quizzes/${encodeURIComponent(quizId)}/questions`,
          { method: 'POST', body: { question: updatedQuestion } },
        );

        // Tell the quiz editor that this question is now saved in the database
        // Pass in the temp "_new0" ID, as well as the saved question, which will contain the actual ID from the database
        // This component relies on QuizEditor updating this QuestionEditor’s questionId prop with the new ID
        onNewSave(questionId, result.question);
      } else {
        await apiRequest(
          `/api/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`,
          { method: 'PUT', body: { question: updatedQuestion } },
        );
      }
      // Collapse editor and mark as not dirty or loading
      setIsExpanded(false);
      setIsDirty(false);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      alert('Error saving question. Please copy the question to a document and try again later.');
      setIsLoading(false);
    }
  }

  function discardChanges() {
    // If it’s a new question, it hasn’t been saved to server, so ‘delete’ the question to remove it entirely
    if (isNew) {
      // If there is content in the prompt, confirm deletion
      if (
        question.prompt.trim() !== '' &&
        !window.confirm(
          'This question has never been saved, so its content will be lost. Remove this question?'
        )
      ) {
        return;
      }
      // Remove the question
      if (onDelete) {
        onDelete();
      }
    } else {
      // If it’s been previously saved, reset the question to what the server last returned
      setQuestion(questionQuery.data ? questionQuery.data.question : null);
    }
    setIsDirty(false);
    setIsExpanded(false);
  }

  function handlePromptChange(newPrompt) {
    const newQuestion = update(question, { $merge: { prompt: newPrompt } });
    setQuestion(newQuestion);
    setIsDirty(true);
  }

  function handleConceptChange(newConcept) {
    const newQuestion = update(question, { $merge: { concept: newConcept } });
    setQuestion(newQuestion);
    setIsDirty(true);
  }

  function handleTypeChange(newType) {
    const newQuestion = update(question, { $merge: { type: newType } });
    setQuestion(newQuestion);
    setIsDirty(true);
  }

  function handleOptionChange(optionIndex, newOption) {
    const newQuestion = update(question, {
      options: { [optionIndex]: { $merge: { text: newOption } } },
    });
    setQuestion(newQuestion);
    setIsDirty(true);
  }

  function handleCorrectOptionChange(optionIndex, checked) {
    const previousCorrectIndex = question.options.findIndex(o => o.isCorrect === true);

    // Update correct option
    let newQuestion = update(question, {
      options: {
        [optionIndex]: { $merge: { isCorrect: true } },
      },
    });

    // Set previously-correct option as not correct, if there was one
    if (previousCorrectIndex > -1) {
      newQuestion = update(newQuestion, {
        options: {
          [previousCorrectIndex]: { $merge: { isCorrect: false } },
        },
      });
    }

    setQuestion(newQuestion);
    setIsDirty(true);
  }

  function handleShortAnswerChange(index, newShortAnswer) {
    let newQuestion;
    // Remove empty short answer
    if (newShortAnswer === '') {
      newQuestion = update(question, { correctShortAnswers: { $splice: [[index, 1]] } });
    } else {
      // Otherwise update it
      newQuestion = update(question, {
        correctShortAnswers: { [index]: { $set: newShortAnswer } },
      });
    }
    setQuestion(newQuestion);
    setIsDirty(true);
  }

  if (error) {
    return (
      <ErrorBox>
        <p>{error}</p>
      </ErrorBox>
    );
  }

  const saveButton = isExpanded && (
    <button
      className={`button is-primary${isLoading ? ' is-loading' : ''}`}
      onClick={saveQuestion}
      type="submit"
    >
      <span>Save</span>
    </button>
  );

  const cancelButton = isExpanded && (
    <button className="button" onClick={discardChanges} type="button">
      Cancel
    </button>
  );

  const editButton = !isExpanded && (
    <button
      className={`button${isLoading ? ' is-loading' : ''}`}
      disabled={isDeleting}
      onClick={loadQuestion}
      type="button"
    >
      <span className="icon">
        <i className="fas fa-edit" />
      </span>
      <span>Edit</span>
    </button>
  );

  const deleteButton = !isNew && (
    <button
      className={`button${isDeleting ? ' is-loading' : ''}`}
      onClick={deleteQuestion}
      title="Delete Question"
      type="button"
    >
      <span className="icon">
        <i className="fas fa-trash-alt" />
      </span>
    </button>
  );

  const promptEditor = isExpanded && (
    <ScrollIntoViewIfNeeded className="panel-block quiz-editor-question-prompt">
      <span className="quiz-editor-question-prompt-placeholder">
        {question.prompt.trim() === '' ? <>Question&nbsp;Prompt</> : ''}
      </span>
      <PromptEditor
        value={question.prompt}
        onEditorChange={newPrompt => handlePromptChange(newPrompt)}
      />
    </ScrollIntoViewIfNeeded>
  );

  const metadataEditor = isExpanded && (
    <div className="panel-block quiz-editor-question-concept">
      <label className="is-inline" style={{ marginRight: '1rem' }}>
        Concept
      </label>
      <ConceptSelector
        concept={question.concept}
        onChange={c => handleConceptChange(c)}
        courseId={courseId}
        autoFocus
      />

      <OptionSelector
        className="quiz-editor-question-type"
        value={question.type}
        onChange={value => handleTypeChange(value)}
        type="radio"
        multilineRadio={false}
        options={[
          { value: MULTIPLE_CHOICE, title: QUESTION_TYPE_NAMES[MULTIPLE_CHOICE] },
          { value: SHORT_ANSWER, title: QUESTION_TYPE_NAMES[SHORT_ANSWER] },
        ]}
      />
    </div>
  );

  let optionsEditor = null;
  if (isExpanded && question.type === MULTIPLE_CHOICE) {
    let lastVisibleOption = question.options.length;
    for (let i = question.options.length - 1; i >= 0; i--) {
      if (question.options[i].text.trim() === '' && i >= 1) {
        lastVisibleOption = i;
      } else {
        break;
      }
    }
    console.log(lastVisibleOption);
    optionsEditor = isExpanded && question.type === MULTIPLE_CHOICE && (
      <form>
        {question.options.map(
          (option, optionIndex) =>
            optionIndex <= lastVisibleOption && (
              <div className="panel-block is-flex quiz-editor-question-option" key={option.id}>
                <label
                  className={`radio is-flex${
                    optionIndex === lastVisibleOption ? ' is-invisible' : ''
                  }`}
                >
                  <input
                    id={`${option.id}radio`}
                    key={`${option.id}radio`}
                    checked={option.isCorrect}
                    onChange={e => handleCorrectOptionChange(optionIndex, e.currentTarget.value)}
                    name={`question${question.id}`}
                    disabled={option.text.trim() === ''}
                    type="radio"
                  />
                  <span>{ALPHABET[optionIndex]}</span>
                </label>
                <span className="quiz-editor-question-option-tinymce-container">
                  {option.text.trim() === '' && (
                    <span className="quiz-editor-question-option-placeholder">
                      {optionIndex === lastVisibleOption
                        ? 'Add an option'
                        : '(Leave option empty to hide on quiz)'}
                    </span>
                  )}
                  <OptionEditor
                    value={option.text}
                    onEditorChange={newOption => handleOptionChange(optionIndex, newOption)}
                  />
                </span>
              </div>
            )
        )}
      </form>
    );
  }

  // Always display an empty answer textbox at the end to easily add another
  // Add the empty to a copy of the correctShortAnswers array to not actually store in question
  const correctShortAnswers = question ? question.correctShortAnswers.slice() : [];
  correctShortAnswers.push('');
  const shortAnswersEditor = isExpanded && question.type === SHORT_ANSWER && (
    <div className="panel-block is-block quiz-editor-question-short-answers">
      Correct short answers (whitespace and case will be ignored when comparing with students’
      responses)
      {correctShortAnswers.map((shortAnswer, index) => (
        <input
          value={shortAnswer}
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          onChange={e => handleShortAnswerChange(index, e.target.value)}
          placeholder="Add a correct answer"
          className="input"
          type="text"
        />
      ))}
    </div>
  );

  return (
    <div className="panel question-editor" id={elementId}>
      {!isExpanded && (
        <p className="panel-heading is-flex">
          <span className="question-editor-title" onClick={loadQuestion}>
            {questionIndex !== null && `${questionIndex + 1}. `}
            {stripTags(question ? question.prompt : defaultPrompt)}
          </span>

          <span className="is-pulled-right is-flex question-editor-button-group">
            {deleteButton}
            {editButton}
            {cancelButton}
            {saveButton}
          </span>
        </p>
      )}

      {metadataEditor}
      {promptEditor}
      {optionsEditor}
      {shortAnswersEditor}

      {isExpanded && (
        <p className="panel-heading is-flex question-editor-footer">
          <span className="is-pulled-right is-flex question-editor-button-group">
            {deleteButton}
            {editButton}
            {cancelButton}
            {saveButton}
          </span>
        </p>
      )}

      {/* If the question was modified, have react router confirm before user navigates away */}
      <Prompt when={isDirty} message={unsavedAlertMessage} />
    </div>
  );
};

QuestionEditor.propTypes = {
  elementId: PropTypes.string,
  // courseId is needed for getting concept suggestions from the course
  courseId: PropTypes.string,
  // quizId is needed for adding the new question to the correct quiz
  quizId: PropTypes.string.isRequired,
  // questionId can be _new([0-9]*) for new questions that are added to quiz, but not saved yet
  questionId: PropTypes.string.isRequired,
  questionIndex: PropTypes.number,
  defaultPrompt: PropTypes.string,
  // Flag if the question hasn’t been saved to server and doesn’t have a permanant ID
  isNew: PropTypes.bool,
  onDelete: PropTypes.func,
  onNewSave: PropTypes.func,
};

export default QuestionEditor;
