import React from 'react';
import PropTypes from 'prop-types';

import ErrorBox from '../shared/ErrorBox';
import ConfidenceSelector from './ConfidenceSelector';
import { MULTIPLE_CHOICE } from '../../constants';
import OptionReview, { optionReviewState } from './OptionReview';

const CORRECT_FEEDBACKS = [
  'Nice!',
  'Keep up the great work!',
  'Exactly right!',
  'You’ve got this!',
];
function randomCorrectFeedback() {
  const i = Math.floor(Math.random() * CORRECT_FEEDBACKS.length);
  return CORRECT_FEEDBACKS[i];
}

// This is basically a non-interactive stripped-down version of the QuestionTaker component, to be used in the post-question and post-quiz review
const QuestionReview = ({ question, questionAttempt: attempt }) => {
  // Eliminate blanks options
  const questionOptions = question.options.filter(option => option.text.trim() !== '');

  const isMultipleChoice = question.type === MULTIPLE_CHOICE;

  if (isMultipleChoice && questionOptions.length === 0) {
    return (
      <ErrorBox>
        <p>There are no options for this question. Please contact your instructor.</p>
      </ErrorBox>
    );
  }

  const promptView = (
    <div
      className="notification question-prompt"
      dangerouslySetInnerHTML={{ __html: question.prompt }}
    />
  );

  let optionsView;
  // If attempt was correct, only display the correct answer
  if (attempt.isCorrect) {
    // Either the correct option’s HTML, or the student’s correct short answer text
    if (isMultipleChoice) {
      const correctHtml = questionOptions.filter(o => o.id === attempt.option.id)[0].text;
      optionsView = <OptionReview state={optionReviewState.CORRECT} html={correctHtml} />;
    } else {
      optionsView = <OptionReview state={optionReviewState.CORRECT} text={attempt.shortAnswer} />;
    }
  } else if (isMultipleChoice) {
    // Otherwise, display all options (selected is incorrect), and indicate which *was* correct
    optionsView = questionOptions.map((option, index) => {
      let state = optionReviewState.NONE;
      if (attempt.correctOption.id === option.id) {
        state = optionReviewState.ACTUAL_CORRECT;
      } else if (attempt.option.id === option.id) {
        state = optionReviewState.INCORRECT;
      }

      return <OptionReview key={option.id} state={state} text={option.text} index={index} />;
    });
  } else {
    // Display incorrect student short answer, and one correct short answer
    optionsView = [
      <OptionReview
        key="incorrect"
        state={optionReviewState.INCORRECT}
        text={attempt.shortAnswer}
      />,
      <OptionReview
        key="correct"
        state={optionReviewState.ACTUAL_CORRECT}
        text={attempt.correctShortAnswer}
      />,
    ];
  }

  const confidenceSelector = <ConfidenceSelector confident={attempt.isConfident} disabled />;

  const feedbackView = attempt.isCorrect && attempt.isConfident && (
    <p className="question-option-text">{randomCorrectFeedback()}</p>
  );

  return (
    <div>
      {promptView}
      <br />
      {optionsView}
      {confidenceSelector}
      {feedbackView}
    </div>
  );
};

QuestionReview.propTypes = {
  // Question must include prompt, type, options[], and id and text of each option (if multiple choice)
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    prompt: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  // Question attempt must include isCorrect, isConfident, option (containing id), correctOption (containing id), shortAnswer, and correctShortAnswer
  questionAttempt: PropTypes.shape({
    isCorrect: PropTypes.bool.isRequired,
    isConfident: PropTypes.bool.isRequired,
    option: PropTypes.object,
    correctOption: PropTypes.object,
    shortAnswer: PropTypes.string,
    correctShortAnswer: PropTypes.string,
  }).isRequired,
};

export default QuestionReview;
