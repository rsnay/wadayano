import React, { Component } from 'react';
import PropTypes from 'prop-types';

// A stateless component to display a course survey for previewing or taking
export default class SurveyView extends Component {
    constructor(props) {
        super(props);
    }

    // TODO display selected answers from props, and pass selected answers up.
    render() {
        let questions = this.props.survey.questions.map(q => (
            <div className="survey-question" key={q.index}>
                <p className="survey-question-prompt notification">{q.index}.&nbsp; {q.prompt}</p>
                <div className="control">
                    {q.options.map(o => (
                        <label className="survey-question-option" key={q.index + 'o' + o.index}>
                            <input type="radio" />
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
    survey: PropTypes.object.isRequired
};