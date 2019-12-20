import React from 'react';
import PropTypes from 'prop-types';

import { ALPHABET } from '../../constants';

export const optionReviewState = {
  CORRECT: 'CORRECT',
  INCORRECT: 'INCORRECT',
  ACTUAL_CORRECT: 'ACTUAL_CORRECT',
  NONE: 'NONE',
};

// Correct is if the student got it correct; actualCorrect is if the student got it wrong, to show what the actual correct answer was.
const correctIcon = (
  <span className="icon">
    <i className="fas fa-check" />
  </span>
);
const actualCorrectIcon = (
  <span className="icon">
    <i className="fas fa-arrow-right" />
  </span>
);
const incorrectIcon = (
  <span className="icon">
    <i className="fas fa-times" />
  </span>
);

const OptionReview = ({ state, text, html, index }) => {
  let icon = null;
  let iconClass = '';
  let containerClass = '';
  switch (state) {
    case optionReviewState.CORRECT:
      icon = correctIcon;
      iconClass = 'is-success';
      break;
    case optionReviewState.INCORRECT:
      icon = incorrectIcon;
      iconClass = 'has-text-danger';
      break;
    case optionReviewState.ACTUAL_CORRECT:
      icon = actualCorrectIcon;
      iconClass = 'has-text-success';
      containerClass = 'actual-correct';
      break;
    default:
      // Otherwise, show letter for option
      icon = ALPHABET[index];
  }

  return (
    <div className={`columns is-mobile question-option-container is-review ${containerClass}`}>
      <span
        className={`column is-1 question-option-letter level-left is-rounded button ${iconClass}`}
      >
        <span>{icon}</span>
      </span>
      {/* Only use dangerouslySetInnerHTML if necessary, otherwise just show text (for short answers) */}
      {text ? (
        <span className="column question-option-text level-left">{text}</span>
      ) : (
        <span
          className="column question-option-text level-left"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
};

OptionReview.propTypes = {
  state: PropTypes.oneOf(Object.keys(optionReviewState)),
  // Text is used for short answer; html for multiple choice
  text: PropTypes.string,
  html: PropTypes.string,
  // Letter shown is derived from index
  index: PropTypes.number,
};

export default OptionReview;
