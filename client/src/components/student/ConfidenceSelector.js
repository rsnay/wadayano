import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button group with thumbs-up and thumbs-down buttons to rate or display confidence.
 * Used in QuestionTaker and QuestionReview components.
 */
const ConfidenceSelector = ({
  autoFocus = false,
  disabled = false,
  confident = null,
  title = 'I’m confident: ',
  onChange,
}) => (
  <div className="question-confidence-selector">
    <h5>{title}</h5>
    <div className="buttons has-addons">
      <button
        autoFocus={autoFocus}
        disabled={disabled}
        className={`button is-rounded ${confident === true ? 'is-active is-link' : ''}`}
        onClick={() => onChange(true)}
        type="button"
      >
        <span className="icon is-small">
          <i className="fas fa-thumbs-up" />
        </span>
      </button>

      <button
        disabled={disabled}
        className={`button is-rounded ${confident === false ? 'is-active is-link' : ''}`}
        onClick={() => onChange(false)}
        type="button"
      >
        <span className="icon is-small">
          <i className="fas fa-thumbs-down" />
        </span>
      </button>
    </div>
  </div>
);

ConfidenceSelector.propTypes = {
  autoFocus: PropTypes.bool,
  disabled: PropTypes.bool,
  confident: PropTypes.bool,
  title: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default ConfidenceSelector;