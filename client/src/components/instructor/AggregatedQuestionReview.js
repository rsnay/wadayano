import React, { Component } from 'react';
import PropTypes from 'prop-types';

import ErrorBox from '../shared/ErrorBox';
import ConfidenceSelector from '../student/ConfidenceSelector';
import { ALPHABET, MULTIPLE_CHOICE } from '../../constants';

// This is a stripped-down version of the QuestionReview component, to be used in the instructor’s aggregated quiz review report
export default class AggregatedQuestionReview extends Component {

  render() {
      console.log(this.props);
    const questionOptions = this.props.question.options;
    const { correctShortAnswers } = this.props.question;
    //const attempt = this.props.aggregatedQuestionAttempt;
    
    const isMultipleChoice = (this.props.question.type === MULTIPLE_CHOICE);
    
    if (isMultipleChoice && questionOptions.length === 0) {
        return <ErrorBox><p>There are no options for this question. Please contact your instructor.</p></ErrorBox>;
    }

    let promptView = (
        <div className="notification question-prompt" dangerouslySetInnerHTML={{__html: this.props.question.prompt}}></div>
    );

    const correctIcon = <span className="icon"><i className="fas fa-check"></i></span>;
    const optionListing = (id, containerClass, iconClass, icon, html, text) => {
        return (<div className={"columns is-mobile question-option-container is-review " + containerClass} key={id}>
            <span className={"column is-1 question-option-letter level-left is-rounded button " + iconClass} >
                <span>{icon}</span>
            </span>
            {/* Only use dangerouslySetInnerHTML if necessary, otherwise just show text (for short answers) */}
            {text ?
                <span className="column question-option-text level-left" >{text}</span>
            :
                <span className="column question-option-text level-left" dangerouslySetInnerHTML={{__html: html}}></span>
            }
        </div>)
    };

    let optionsView;
    if (isMultipleChoice) {
        // Display all options, show number of students who chose each, and indicate which is correct
        optionsView = questionOptions.filter(option => option.text.trim() !== '').map((option, index) => {
            const correct = option.isCorrect;
            const icon = correct ? correctIcon : ALPHABET[index];
            const iconClass = correct ? "has-text-success" : "";

            return optionListing(option.id, '', iconClass, icon, option.text, null);
        });
    } else {
        optionsView = correctShortAnswers.map((answer, index) => {
            return optionListing(index, '', 'has-text-success', correctIcon, null, answer);
        });
    }

    let confidenceSelector = <ConfidenceSelector disabled />;

    let feedbackView = <p className="question-option-text"></p>;

    return (
        <div>
            {promptView}
            <br />
            {optionsView}
            {confidenceSelector}
            {feedbackView}
            <hr />
        </div>
    );
  }
}

AggregatedQuestionReview.propTypes = {
    // Question must include prompt, and options[] with id, isCorrect, and text of each option
    question: PropTypes.object.isRequired,
    /* Aggregated question attempt must include: {
        studentCount: (number of all students who attempted question),
        optionCounts: {
            'optionId': (number of students who chose this option),
            'optionId': (number of students who chose this option),
            'optionId': (number of students who chose this option),
            etc.
        },
        confidentCount: (number of students who were confident)
    }*/
    aggregatedQuestionAttempt: PropTypes.object.isRequired
};
