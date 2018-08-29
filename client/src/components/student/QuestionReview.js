import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ShowMore from 'react-show-more';

import ErrorBox from '../shared/ErrorBox';
import ConfidenceSelector from './ConfidenceSelector';
import { ALPHABET } from '../../constants';

const CORRECT_FEEDBACKS = [
    'Nice!',
    'Keep up the great work!',
    'Exactly right!',
    'You’ve got this!'
];

// This is basically a non-interactive stripped-down version of the QuestionTaker component, to be used in the post-quiz review (the post-question review is simply handled within the QuestionTaker)
export default class QuestionReview extends Component {

  _randomCorrectFeedback() {
      const i = Math.floor(Math.random() * CORRECT_FEEDBACKS.length);
      return CORRECT_FEEDBACKS[i];
  }

  render() {
    const questionOptions = this.props.question.options;
    const attempt = this.props.questionAttempt;
    
    if (questionOptions.length === 0) {
        return <ErrorBox><p>There are no options for this question. Please contact your instructor.</p></ErrorBox>;
    }

    let promptView = (
        <div className="notification question-prompt">
            <ShowMore>
                {this.props.question.prompt}
            </ShowMore>
        </div>
    );

    // Correct is if the student got it correct; actualCorrect is if the student got it wrong, to show what the actual correct answer was.
    let correctIcon = <span className="icon"><i className="fas fa-check"></i></span>;
    let actualCorrectIcon = <span className="icon"><i className="fas fa-arrow-right"></i></span>;
    let incorrectIcon = <span className="icon"><i className="fas fa-times"></i></span>;

    let optionsView;
    // If attempt was correct, only display the correct option
    if (attempt.isCorrect) {
        optionsView = (
            <div className="columns is-mobile question-option-container is-review">
                <span className="column is-1 question-option-letter level-left is-rounded button is-success">
                    <span>{correctIcon}</span>
                </span>
                <span className="column question-option-text level-left">
                    {questionOptions.filter(o => o.id === attempt.option.id)[0].text}
                </span>
            </div>
        );
    } else {
        // Otherwise, display all options (selected is incorrect), and indicate which *was* correct
        optionsView = questionOptions.map((option, index) => {
            const correct = (attempt.correctOption.id === option.id);
            const incorrect = (attempt.option.id === option.id);
            const icon = correct ? actualCorrectIcon : (incorrect ? incorrectIcon : ALPHABET[index]);
            const iconClass = correct ? "has-text-success" : (incorrect ? "has-text-danger" : "");
            const containerClass = correct ? "actual-correct" : "";
            const answerPrefix = correct ? "Correct: " : (incorrect ? "Selected: " : "");

            // Hide empty options
            if (option.text.trim() === '') {
                return null;
            }

            return (<div className={"columns is-mobile question-option-container is-review " + containerClass} key={option.id}>
                <span className={"column is-1 question-option-letter level-left is-rounded button " + iconClass} >
                    <span>{icon}</span>
                </span>
                <span className="column question-option-text level-left">
                    {answerPrefix}{option.text}
                </span>
            </div>);
        });
    }

    let confidenceSelector = <ConfidenceSelector confident={attempt.isConfident} disabled />;

    let feedbackView = attempt.isCorrect &&  attempt.isConfident && <p className="question-option-text">{this._randomCorrectFeedback()}</p>;

    return (
        <div>
            {promptView}
            <br />
            {optionsView}
            {confidenceSelector}
            {feedbackView}
        </div>
    );
  }
}

QuestionReview.propTypes = {
    // Question must include prompt, options[], and id and text of each option
    question: PropTypes.object.isRequired,
    // Question attempt must include isCorrect, isConfident, option (containing id), and correctOption (containing id)
    questionAttempt: PropTypes.object.isRequired
};
