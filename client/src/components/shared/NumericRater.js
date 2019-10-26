import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Controlled component to display a group of numeric rating buttons,
 * and pass up the current value when the selection changes
 */
const NumericRater = ({ minRating, maxRating, onChange, autoFocus }) => {

  const [selectedValue, setSelectedValue] = useState(null);

  // Called when a button is clicked
  const buttonClickHandler = i => {
    setSelectedValue(i);
    onChange(i);
  }

  const ratingButtons = [];
  // Loop to make buttons
  for (let i = minRating; i <= maxRating; i++) {
    ratingButtons.push(
      <button
        key={i.toString()}
        autoFocus={
          i === minRating && autoFocus /* Only autofocus first button */
        }
        className={`button ${selectedValue === i ? 'is-selected is-info' : ''}`}
        onClick={() => buttonClickHandler(i)}
        type="button"
      >
        {i}
      </button>
    );
  }
  // Put buttons in a group
  return <div className="buttons has-addons">{ratingButtons}</div>;
}

NumericRater.defaultProps = {
  minRating: 1,
  maxRating: 5,
  onChange: val => console.log(val),
  autoFocus: false,
};

NumericRater.propTypes = {
  minRating: PropTypes.number,
  maxRating: PropTypes.number,
  onChange: PropTypes.func,
  autoFocus: PropTypes.bool,
};

export default NumericRater;
