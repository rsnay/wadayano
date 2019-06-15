import React from 'react';
import PropTypes from 'prop-types';

/**
 * This component abstracts using either radio <input />s or a <select> element to select one option from a list.
 * It can be used either bound (provide value and onChange) or unbound (provide name and defaultValue).
 * See the propTypes below for further details.
 */
const OptionSelector = ({
  type,
  multilineRadio,
  className,
  name,
  value,
  defaultValue,
  onChange,
  options,
}) => {
  if (type === 'radio') {
    return (
      <div className={className}>
        {options.map(option => (
          <React.Fragment key={option.value}>
            <label className="radio">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={defaultValue ? undefined : value === option.value}
                defaultChecked={defaultValue ? defaultValue === option.value : undefined}
                onChange={() => onChange(option.value)}
              />
              {option.title || option.value}
            </label>
            {multilineRadio && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  }
  return (
    <div className={className || 'select'}>
      <select
        name={name}
        value={value || undefined}
        defaultValue={defaultValue || undefined}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(option => (
          <option value={option.value} key={option.value}>
            {option.title || option.value}
          </option>
        ))}
      </select>
    </div>
  );
};

OptionSelector.defaultProps = {
  type: 'radio',
  multilineRadio: true,
  className: 'control',
  onChange: () => {},
  name: '',
  value: undefined,
  defaultValue: undefined,
};

OptionSelector.propTypes = {
  type: PropTypes.oneOf(['radio', 'select']),
  multilineRadio: PropTypes.bool,
  className: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onChange: PropTypes.func,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default OptionSelector;
