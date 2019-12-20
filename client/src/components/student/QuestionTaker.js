import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import ErrorBox from '../shared/ErrorBox';

import ConfidenceSelector from './ConfidenceSelector';
import QuestionReview from './QuestionReview';

import {
  ALPHABET,
  KEY_CODE_A,
  KEY_CODE_Z,
  MULTIPLE_CHOICE,
  KEY_CODE_COMMA,
  KEY_CODE_PERIOD,
} from '../../constants';
import fragments from '../../fragments';

const ATTEMPT_QUESTION_MUTATION = gql`
  mutation AttemptQuestion(
    $quizAttemptId: ID!
    $questionId: ID!
    $type: QuestionType!
    $optionId: ID
    $shortAnswer: String
    $isConfident: Boolean!
  ) {
    attemptQuestion(
      quizAttemptId: $quizAttemptId
      questionId: $questionId
      type: $type
      optionId: $optionId
      shortAnswer: $shortAnswer
      isConfident: $isConfident
    ) {
      ...StudentFullQuestionAttempt
    }
  }
  ${fragments.studentFullQuestionAttempt}
`;

/**
 * This component is used in QuizTaker, and is responsible for displaying a question,
 * getting the student’s answer, submitting the question attempt to the server, and
 * displaying a QuestionReview to show if the student was correct.
 */
const QuestionTaker = ({ quizAttemptId, question, onQuestionCompleted, onNextQuestion }) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [isConfident, setIsConfident] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(null);
  const [error, setError] = useState(null);
  // Will get sent from the server after attempting the question
  const [questionAttempt, setQuestionAttempt] = useState(null);

  const [attemptQuestionMutation] = useMutation(ATTEMPT_QUESTION_MUTATION);

  // Allow multiple-choice options to be selected by pressing that letter on the keyboard (or ,. to select confidence).
  const handleKeyDown = useCallback(
    e => {
      // If the question has already been answered, don't let the selected answer change (without this, it’s kind of entertaining!)
      if (isSubmitted || isSubmitting) {
        return;
      }

      // If a modifier key is pressed, ignore (otherwise they can't ctrl+c to copy, etc.)
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        return;
      }

      // Check that the question is loaded and has options
      if (question && question.options) {
        // Select confidence with , and .
        if (e.keyCode === KEY_CODE_COMMA || e.keyCode === KEY_CODE_PERIOD) {
          setIsConfident(e.keyCode === KEY_CODE_COMMA);
          e.preventDefault();
        }

        let optionIndex = -1;
        // 65 is A, and the letters are sequential afterwards through Z
        if (e.keyCode >= KEY_CODE_A && e.keyCode <= KEY_CODE_Z) {
          optionIndex = e.keyCode - KEY_CODE_A;
        }
        // Filter to non-empty options
        const questionOptions = question.options.filter(option => option.text.trim() !== '');
        // Make sure there are this many options (If C was pressed, make sure there are ≥ 3 non-empty options)
        if (optionIndex >= 0 && questionOptions.length > optionIndex) {
          setSelectedOption(questionOptions[optionIndex]);
          e.preventDefault();
        }
      }
    },
    [isSubmitted, isSubmitting, question]
  );

  useEffect(() => {
    // Presently, confidence cannot be selected with ,. on short-answer questions.
    // This could be added in the future (checking if focus is in the short-answer field first)
    if (question.type === MULTIPLE_CHOICE) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return () => {};
  }, [handleKeyDown, question]);

  const submit = async () => {
    // If the enter button is pressed really quickly in succession, this could get fired twice before a re-render
    if (isSubmitting || isSubmitted) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Send question attempt
      const result = await attemptQuestionMutation({
        variables: {
          quizAttemptId,
          questionId: question.id,
          type: question.type,
          optionId: selectedOption ? selectedOption.id : null,
          shortAnswer,
          isConfident,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Get the actual question attempt result (which contains if student was correct, and actual correct answer)
      setQuestionAttempt(result.data.attemptQuestion);
      setIsSubmitted(true);
      if (onQuestionCompleted) {
        onQuestionCompleted();
      }
    } catch (e) {
      let message = '';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      setError(
        `Error submitting answer. If this error continues, please reload the page and try again. (Your progress up to this question will not be lost.) ${message}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hide blank options
  const questionOptions = question.options.filter(option => option.text.trim() !== '');
  const isMultipleChoice = question.type === MULTIPLE_CHOICE;

  if (isMultipleChoice && questionOptions.length === 0) {
    return (
      <ErrorBox>
        <p>There are no options for this question. Please contact your instructor.</p>
      </ErrorBox>
    );
  }

  const prompt = (
    <div
      className="notification question-prompt"
      dangerouslySetInnerHTML={{ __html: question.prompt }}
    />
  );

  // Hide empty options
  const options =
    isMultipleChoice &&
    questionOptions.map((option, index) => {
      return (
        // The div element has a button that triggers the click, as well as key events.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
        <div
          key={option.id}
          className="columns is-mobile question-option-container"
          onClick={() => {
            if (!(isSubmitting || isSubmitted)) {
              setSelectedOption(option);
            }
          }}
        >
          <button
            className={`column is-1 question-option-letter level-left is-rounded button ${
              selectedOption && selectedOption.id === option.id ? 'is-link' : ''
            }`}
            type="button"
          >
            <span>{ALPHABET[index]}</span>
          </button>
          <span
            className="column question-option-text level-left"
            dangerouslySetInnerHTML={{ __html: option.text }}
          />
        </div>
      );
    });

  const shortAnswerInput = !isMultipleChoice && (
    <div className="columns">
      <div className="column is-two-thirds-tablet field">
        <input
          className="input is-medium"
          type="text"
          placeholder="Enter your answer"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          value={shortAnswer}
          onChange={e => setShortAnswer(e.target.value)}
        />
      </div>
    </div>
  );

  const confidenceSelector = (
    <ScrollIntoViewIfNeeded>
      <ConfidenceSelector
        onChange={confident => {
          setIsConfident(confident);
        }}
        confident={isConfident}
        disabled={isSubmitting || isSubmitted}
      />
    </ScrollIntoViewIfNeeded>
  );

  const submitButton = (
    <ScrollIntoViewIfNeeded>
      <hr />
      {error && <p className="notification is-danger">{error}</p>}
      <button
        autoFocus
        className={`button is-primary is-medium${isSubmitting ? ' is-loading' : ''}`}
        disabled={isSubmitting}
        onClick={submit}
        type="submit"
      >
        Submit
      </button>
    </ScrollIntoViewIfNeeded>
  );

  const review = questionAttempt && (
    <QuestionReview questionAttempt={questionAttempt} question={question} />
  );

  const continueButton = (
    <button
      autoFocus
      className="button is-primary is-medium"
      onClick={onNextQuestion}
      type="button"
    >
      Continue
    </button>
  );

  // Question answer view
  if (!isSubmitted) {
    return (
      <>
        {prompt}
        <br />

        {options}
        {shortAnswerInput}

        {(selectedOption || shortAnswer !== '') && confidenceSelector}
        {(selectedOption || shortAnswer !== '') && isConfident !== null && submitButton}
      </>
    );
  }
  // Question review view
  return (
    <>
      {review}
      <hr />
      {continueButton}
    </>
  );
};

QuestionTaker.propTypes = {
  quizAttemptId: PropTypes.string.isRequired,
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    prompt: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  onQuestionCompleted: PropTypes.func,
  onNextQuestion: PropTypes.func.isRequired,
};

export default QuestionTaker;
