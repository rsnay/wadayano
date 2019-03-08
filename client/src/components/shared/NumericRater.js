import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Controlled component to display a group of numeric rating buttons,
 * and pass up the current value when the selection changes
 */
class NumericRater extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedValue: null
        };
    }

    // Called when a button is clicked
    buttonClickHandler(i) {
        return () => {
            this.setState({ selectedValue: i })
            this.props.onChange(i);
        };
    }

    render() {
        let ratingButtons = [];
        // Loop to make buttons
        for (var i = this.props.minRating; i <= this.props.maxRating; i++) {
            ratingButtons.push(
                <button key={i.toString()}
                    autoFocus={i === this.props.minRating && this.props.autoFocus /* Only autofocus first button */}
                    className={"button " + (this.state.selectedValue === i ? "is-selected is-info" : "")}
                    onClick={this.buttonClickHandler(i)}
                >
                    {i}
                </button>
            );
        }
        // Put buttons in a group
        return (
            <div className="buttons has-addons">
                {ratingButtons}
            </div>
        );
    }
}

NumericRater.defaultProps = {
    minRating: 1,
    maxRating: 5,
    onChange: (val) => alert(val),
    autoFocus: false
};

NumericRater.propTypes = {
    minRating: PropTypes.number,
    maxRating: PropTypes.number,
    onChange: PropTypes.func,
    autoFocus: PropTypes.bool
};

export default NumericRater;