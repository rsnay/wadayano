import React from 'react';
import PropTypes from 'prop-types';

/**
 * This component abstracts using either radio <input />s or a <select> element to select one option from a list.
 * It can be used either bound (provide value and onChange) or unbound (provide name and defaultValue).
 * See the propTypes below for further details.
 */
const OptionSelector = (props) => {
    if (props.type === 'radio') {
        return (
          <div className={props.className || "control"}>
            {props.options.map(option => (
                <React.Fragment key={option.value}>
                <label className="radio">
                    <input type="radio"
                        name={props.name}
                        value={option.value}
                        checked={props.defaultValue ? undefined : (props.value === option.value)}
                        defaultChecked={props.defaultValue ? (props.defaultValue === option.value) : undefined}
                        onChange={() => props.onChange(option.value)}
                    />
                    {option.title || option.value}
                </label>
                {props.multilineRadio && <br />}
                </React.Fragment>
            ))}
          </div>
        );
    } else {
        return (
            <div className={props.className || "select"}>
                <select
                    name={props.name}
                    value={props.value ? props.value : undefined}
                    defaultValue={props.defaultValue ? props.defaultValue : undefined}
                    onChange={(e) => props.onChange(e.target.value)}
                >
                    {props.options.map(option => (
                        <option value={option.value} key={option.value}>{option.title || option.value}</option>
                    ))}
                </select>
            </div>
        );
    }
}

OptionSelector.defaultProps = {
    type: 'radio',
    multilineRadio: true,
    onChange: () => {}
};

OptionSelector.propTypes = {
    type: PropTypes.oneOf(['radio', 'select']),
    multilineRadio: PropTypes.bool,
    className: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.string,
    defaultValue: PropTypes.string,
    onChange: PropTypes.func,
    options: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string,
        value: PropTypes.string.isRequired
    })).isRequired
};

export default OptionSelector;