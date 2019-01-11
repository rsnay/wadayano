import React, { Component } from 'react';
import PropTypes from 'prop-types';

import ErrorBox from '../shared/ErrorBox';
import ConfidenceSelector from './ConfidenceSelector';
import { ALPHABET, MULTIPLE_CHOICE } from '../../constants';

const CORRECT_FEEDBACKS = [
    'Nice!',
    'Keep up the great work!',
    'Exactly right!',
    'You’ve got this!'
];

// This is basically a non-interactive stripped-down version of the QuestionTaker component, to be used in the post-question and post-quiz review
export default class QuestionReview extends Component {

  _randomCorrectFeedback() {
      const i = Math.floor(Math.random() * CORRECT_FEEDBACKS.length);
      return CORRECT_FEEDBACKS[i];
  }

  render() {
    let questionOptions = this.props.question.options.filter(option => option.text.trim() !== '');
    const attempt = this.props.questionAttempt;
    
    const isMultipleChoice = (this.props.question.type === MULTIPLE_CHOICE);
    
    if (isMultipleChoice && questionOptions.length === 0) {
        return <ErrorBox><p>There are no options for this question. Please contact your instructor.</p></ErrorBox>;
    }

    let promptView = (
        <div className="notification question-prompt" dangerouslySetInnerHTML={{__html: this.props.question.prompt}}></div>
    );

    // Correct is if the student got it correct; actualCorrect is if the student got it wrong, to show what the actual correct answer was.
    let correctIcon = <span className="icon"><i className="fas fa-check"></i></span>;
    let actualCorrectIcon = <span className="icon"><i className="fas fa-arrow-right"></i></span>;
    let incorrectIcon = <span className="icon"><i className="fas fa-times"></i></span>;

    const optionListing = (id, containerClass, iconClass, icon, text) => {
        return (<div className={"columns is-mobile question-option-container is-review " + containerClass} key={id}>
            <span className={"column is-1 question-option-letter level-left is-rounded button " + iconClass} >
                <span>{icon}</span>
            </span>
            <span className="column question-option-text level-left" dangerouslySetInnerHTML={{__html: text}}></span>
        </div>)
    };

    let optionsView;
    // If attempt was correct, only display the correct answer
    if (attempt.isCorrect) {
        // Either the correct option’s HTML, or the student’s correct short answer text
        let correctAnswerText;
        if (isMultipleChoice) {
            correctAnswerText = questionOptions.filter(o => o.id === attempt.option.id)[0].text;
        } else {
            correctAnswerText = attempt.shortAnswer;
        }

        optionsView = optionListing('correct', '', 'is-success', correctIcon, correctAnswerText);
    } else {
        if (isMultipleChoice) {
            // Otherwise, display all options (selected is incorrect), and indicate which *was* correct
            optionsView = questionOptions.map((option, index) => {
                const correct = (attempt.correctOption.id === option.id);
                const incorrect = (attempt.option.id === option.id);
                const icon = correct ? actualCorrectIcon : (incorrect ? incorrectIcon : ALPHABET[index]);
                const iconClass = correct ? "has-text-success" : (incorrect ? "has-text-danger" : "");
                const containerClass = correct ? "actual-correct" : "";
                return optionListing(option.id, containerClass, iconClass, icon, option.text);
            });
        } else {
            // Display incorrect student short answer, and one correct short answer
            optionsView = [
                optionListing('incorrect', '', 'has-text-danger', incorrectIcon, attempt.shortAnswer),
                optionListing('actualCorrect', 'actual-correct', 'has-text-success', actualCorrectIcon, attempt.correctShortAnswer)
            ];
        }
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
    // Question must include prompt, type, options[], and id and text of each option
    question: PropTypes.object.isRequired,
    // Question attempt must include isCorrect, isConfident, option (containing id), correctOption (containing id), shortAnswer, and correctShortAnswer
    questionAttempt: PropTypes.object.isRequired
};
