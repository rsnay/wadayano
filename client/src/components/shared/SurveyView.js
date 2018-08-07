import React, { Component } from 'react';
import PropTypes from 'prop-types';

// A stateless, controlled component to display a course survey for previewing or taking (the parent component must provide the selected answers to and receive changes from this component)
export default class SurveyView extends Component {

    // When an option is selected, pass up the change
    _handleOptionClick(questionIndex, optionIndex) {
        if (this.props.onChange) {
            let newAnswers = {...this.props.selectedAnswers};
            newAnswers[questionIndex] = optionIndex;
            this.props.onChange(newAnswers);
        }
    }

    // Display selected answers from props, and pass selected answers up.
    render() {
        // If there's no change handler, disable the radio buttons
        const disabled = !this.props.onChange;
        const selectedAnswers = this.props.selectedAnswers || {};

        let questions = this.props.survey.questions.map(q => (
            <div className="survey-question" key={q.index}>
                <p className="survey-question-prompt notification">{q.index}.&nbsp; {q.prompt}</p>
                <div className="control">
                    {q.options.map(o => (
                        <label className="survey-question-option" key={q.index + 'o' + o.index}>
                            <input
                                type="radio"
                                name={"question" + q.index}
                                value={o.index}
                                disabled={disabled}
                                checked={selectedAnswers[q.index] === o.index}
                                onChange={() => this._handleOptionClick(q.index, o.index)}
                                />
                            <span className="survey-question-option-text">
                                {o.text}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        ))
        return (
            <div>
            {questions}
            </div>
        );
    }
}

SurveyView.propTypes = {
    survey: PropTypes.object.isRequired,
    selectedAnswers: PropTypes.object,
    onChange: PropTypes.func
};