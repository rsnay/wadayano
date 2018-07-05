import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import ErrorBox from '../shared/ErrorBox';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default class QuestionView extends Component {

  constructor(props) {
    super(props);
    this.state = {
        selectedOption: null,
        confident: null,
        submitted: false,
        correctOption: null
    };
  }

  componentDidMount() {
    document.addEventListener("keydown", this._handleKeyDown.bind(this));
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._handleKeyDown.bind(this));
  }

  // Allow options to be selected by pressing that letter on the keyboard. This is kind of hacky right now
  _handleKeyDown(e) {
    // Check that the question is loaded and has options
    if (this.props.question && this.props.question.options) {
        let optionIndex = -1;
        // 65 is a, and the letters are sequential afterwards
        // TODO get rid of magic number
        if (e.keyCode >= 65 && e.keyCode <= 90) {
            optionIndex = e.keyCode - 65;
            console.log(e.keyCode, optionIndex);
        }
        if (optionIndex >= 0 && this.props.question.options.length > optionIndex) {
            this.setState({ selectedOption: this.props.question.options[optionIndex] });
            e.preventDefault();
        }
    }
  }

  render() {
    const questionOptions = this.props.question.options;
    
    if (questionOptions.length === 0) {
        return <ErrorBox><p>There are no options for this question. Please contact your instructor.</p></ErrorBox>;
    }

    let prompt = (
        <div className="notification">
            {this.props.question.prompt}
        </div>
    );

    let options = questionOptions.map((option, index) =>
        <div className="columns is-mobile question-option-container" key={option.id}
            onClick={() => {
                this.setState({ selectedOption: option })
            }}>
            <button className={"column is-1 question-option-letter level-left is-rounded button " + (option.isCorrect ? "has-text-success " : " ") + (this.state.selectedOption && this.state.selectedOption.id === option.id ? "is-link" : "")} >
                <span>{LETTERS[index]}</span>
            </button>
            <span className="column question-option-text level-left">
                {option.text}
            </span>
        </div>
    );

    let confidenceSelector = (
        <ScrollIntoViewIfNeeded>
        <div className="question-confidence-selector">
            <h5 style={{margin: "0.5rem"}}>I'm confident: </h5>
            <div className="buttons has-addons">
                <button autoFocus className={"button is-rounded " + (this.state.confident === true ? "is-active is-link" : "")} onClick={() => this.setState({ confident: true })}>
                    &nbsp;<span className="icon is-small"><i className="fas fa-thumbs-up"></i></span>&nbsp;
                </button>
                <button className={"button is-rounded " + (this.state.confident === false ? "is-active is-link" : "")} onClick={() => this.setState({ confident: false })}>
                    &nbsp;<span className="icon is-small"><i className="fas fa-thumbs-down"></i></span>&nbsp;
                </button>
            </div>
        </div>
        </ScrollIntoViewIfNeeded>
    );

    let submitButton = (
        <ScrollIntoViewIfNeeded>
        <hr />
        <button autoFocus className="button is-primary" onClick={() => {
            this.setState({ submitted: true });
            this.props.onQuestionCompleted();
        }}>Submit</button>
        </ScrollIntoViewIfNeeded>
    );

    let review = (
        <span>
            Your answer: {this.state.selectedOption &&this.state.selectedOption.text} <br />
            Correct: {this.state.selectedOption && this.state.selectedOption.isCorrect ? "yes" : "no"}
            <hr />
        </span>
    );

    let continueButton = (
        <button autoFocus className="button is-primary " onClick={this.props.onNextQuestion}>Continue</button>
    );

    return (
        <div>
            {prompt}
            <br />
            {!this.state.submitted && options}
            {!this.state.submitted && this.state.selectedOption && confidenceSelector}
            {!this.state.submitted && this.state.confident !== null && submitButton}
            {this.state.submitted === true && review}
            {this.state.submitted === true && continueButton}
        </div>
    )
  }
}

QuestionView.propTypes = {
    question: PropTypes.object.isRequired,
    onQuestionCompleted: PropTypes.func,
    onNextQuestion: PropTypes.func.isRequired
};
