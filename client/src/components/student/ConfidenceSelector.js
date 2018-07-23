import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class ConfidenceSelector extends Component {
    render() {
        return (
        <div className="question-confidence-selector">
        <h5 style={{margin: "0.5rem", fontSize: "1.2rem"}}>I’m confident: </h5>
        <div className="buttons has-addons">
            <button autoFocus={this.props.autoFocus}
                disabled={this.props.disabled}
                className={"button is-rounded " + (this.props.confident === true ? "is-active is-link" : "")}
                onClick={() => this.props.onChange(true)}
            >
                &nbsp;<span className="icon is-small">
                    <i className="fas fa-thumbs-up"></i>
                </span>&nbsp;
            </button>
            <button
                disabled={this.props.disabled}
                className={"button is-rounded " + (this.props.confident === false ? "is-active is-link" : "")}
                onClick={() => this.props.onChange(false)}
            >
                &nbsp;<span className="icon is-small">
                    <i className="fas fa-thumbs-down"></i>
                </span>&nbsp;
            </button>
        </div>
        </div>
        );
    }
}

ConfidenceSelector.propTypes = {
    autoFocus: PropTypes.bool,
    disabled: PropTypes.bool,
    confident: PropTypes.bool
}