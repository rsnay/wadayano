import React from 'react';
import PropTypes from 'prop-types';

/**
 * A stateless, controlled component to display a course survey for previewing
 * or taking (the parent component must provide the selected answers to and
 * receive changes from this component)
 */
const SurveyView = ({ survey, selectedAnswers = {}, onChange }) => {
  // When an option is selected, pass up the change
  const handleOptionClick = (questionIndex, optionIndex) => {
    if (onChange) {
      const newAnswers = { ...selectedAnswers };
      newAnswers[questionIndex] = optionIndex;
      onChange(newAnswers);
    }
  };

  // Display selected answers from props, and pass selected answers up.
  // If there's no change handler, disable the radio buttons
  const disabled = !onChange;

  if (!survey || !survey.questions || survey.questions.length === 0) {
    return (
      <p className="survey-question-prompt notification">There are no questions in this survey.</p>
    );
  }

  const questions = survey.questions.map(q => (
    <div className="survey-question" key={q.index}>
      <p className="survey-question-prompt notification">
        {q.index}.&nbsp; {q.prompt}
      </p>
      <div className="control">
        {q.options.map(o => (
          <label className="survey-question-option" key={`${q.index}o${o.index}`}>
            <input
              type="radio"
              name={`question${q.index}`}
              value={o.index}
              disabled={disabled}
              checked={selectedAnswers[q.index] === o.index}
              onChange={() => handleOptionClick(q.index, o.index)}
            />
            <span className="survey-question-option-text">{o.text}</span>
          </label>
        ))}
      </div>
    </div>
  ));

  return <div>{questions}</div>;
};

SurveyView.propTypes = {
  survey: PropTypes.shape({
    questions: PropTypes.arrayOf(
      PropTypes.shape({
        index: PropTypes.number.isRequired,
        options: PropTypes.arrayOf(
          PropTypes.shape({
            index: PropTypes.number.isRequired,
            text: PropTypes.string.isRequired,
          })
        ),
      })
    ),
  }).isRequired,
  selectedAnswers: PropTypes.object,
  onChange: PropTypes.func,
};

export default SurveyView;
