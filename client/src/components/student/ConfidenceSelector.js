import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Button group with thumbs-up and thumbs-down buttons to rate or display confidence.
 * Used in QuestionTaker and QuestionReview components.
 */
export default class ConfidenceSelector extends Component {
    render() {
        return (
            <div className="question-confidence-selector">
                <h5>{this.props.title || "I’m confident: "}</h5>
                <div className="buttons has-addons">
                    <button
                        autoFocus={this.props.autoFocus}
                        disabled={this.props.disabled}
                        className={"button is-rounded " + (this.props.confident === true ? "is-active is-link" : "")}
                        onClick={() => this.props.onChange(true)}
                    >
                        <span className="icon is-small">
                            <i className="fas fa-thumbs-up"></i>
                        </span>
                    </button>

                    <button
                        disabled={this.props.disabled}
                        className={"button is-rounded " + (this.props.confident === false ? "is-active is-link" : "")}
                        onClick={() => this.props.onChange(false)}
                    >
                        <span className="icon is-small">
                            <i className="fas fa-thumbs-down"></i>
                        </span>
                    </button>
                </div>
            </div>
        );
    }
}

ConfidenceSelector.propTypes = {
    autoFocus: PropTypes.bool,
    disabled: PropTypes.bool,
    confident: PropTypes.bool,
    title: PropTypes.string
};