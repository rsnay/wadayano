import React, { Component } from 'react';
import PropTypes from 'prop-types';

import ErrorBox from '../shared/ErrorBox';
import ConfidenceSelector from '../student/ConfidenceSelector';
import { ALPHABET } from '../../constants';

// This is basically a non-interactive stripped-down version of the QuestionTaker component, to be used in the instructor’s aggregated quiz review report
export default class AggregatedQuestionReview extends Component {

  render() {
      console.log(this.props);
    const questionOptions = this.props.question.options;
    const attempt = this.props.aggregatedQuestionAttempt;
    
    if (questionOptions.length === 0) {
        return <ErrorBox><p>There are no options for this question. Please contact your instructor.</p></ErrorBox>;
    }

    let promptView = (
        <div className="notification question-prompt" dangerouslySetInnerHTML={{__html: this.props.question.prompt}}></div>
    );

    let correctIcon = <span className="icon"><i className="fas fa-check"></i></span>;

    // Display all options, show number of students who chose each, and indicate which is correct
    let optionsView = questionOptions.filter(option => option.text.trim() !== '').map((option, index) => {
        const correct = option.isCorrect;
        const icon = correct ? correctIcon : ALPHABET[index];
        const iconClass = correct ? "has-text-success" : "";

        return (<div className="columns is-mobile question-option-container is-review" key={option.id}>
            <span className={"column is-1 question-option-letter level-left is-rounded button " + iconClass} >
                <span>{icon}</span>
            </span>
            <span className="column question-option-text level-left" dangerouslySetInnerHTML={{__html: option.text}}></span>
        </div>);
    });

    let confidenceSelector = <ConfidenceSelector disabled />;

    let feedbackView = <p className="question-option-text">TODO</p>;

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
