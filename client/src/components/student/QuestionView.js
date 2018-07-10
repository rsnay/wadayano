import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import ErrorBox from '../shared/ErrorBox';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CORRECT_FEEDBACKS = [
    'Nice!',
    'Keep up the great work!',
    'Exactly right!',
    'You’ve got this!'
];

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

  _randomCorrectFeedback() {
      const i = Math.floor(Math.random() * CORRECT_FEEDBACKS.length);
      return CORRECT_FEEDBACKS[i];
  }

  render() {
    const questionOptions = this.props.question.options;
    
    if (questionOptions.length === 0) {
        return <ErrorBox><p>There are no options for this question. Please contact your instructor.</p></ErrorBox>;
    }

    let prompt = (
        <div className="notification question-prompt">
            {this.props.question.prompt}
        </div>
    );

    let options = questionOptions.map((option, index) =>
        <div className="columns is-mobile question-option-container" key={option.id}
            onClick={() => {
                this.setState({ selectedOption: option })
            }}>
            <button className={"column is-1 question-option-letter level-left is-rounded button " + (this.state.selectedOption && this.state.selectedOption.id === option.id ? "is-link" : "")} >
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

    let review = this.state.selectedOption && (
        <span>
            <div className="columns is-mobile question-option-container is-review">
                <span className={"column is-1 question-option-letter level-left is-rounded button " + (this.state.selectedOption.isCorrect ? "is-success" : "is-danger")}>
                    <span><span className="icon"><i className={this.state.selectedOption.isCorrect ? "fas fa-check" : "fas fa-times"}></i></span></span>
                </span>
                <span className="column question-option-text level-left">
                    {this.state.selectedOption.text}
                </span>
            </div>
            {this.state.selectedOption.isCorrect ?
                <p>{this._randomCorrectFeedback()}</p>
            :
                <p className="question-option-text">Correct answer: {this.props.question.options.filter(q => q.isCorrect)[0].text}</p>
            }
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
