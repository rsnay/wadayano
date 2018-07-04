import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

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

  render() {
      const questionOptions = this.props.question.options || 
           [
              {id: "1", isCorrect: false, text: "Wrong 1 \n Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nec iaculis mauris"},
              {id: "2", isCorrect: true, text: "Right 2"},
              {id: "3", isCorrect: false, text: "Wrong 3"},
              {id: "4", isCorrect: false, text: "Wrong 4"},
          ];


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
        <div className="question-confidence-selector">
            <h5 style={{margin: "0.5rem"}}>I'm confident: </h5>
            <div className="buttons has-addons">
                <button className={"button is-rounded " + (this.state.confident === true ? "is-active is-link" : "")} onClick={() => this.setState({ confident: true })}>
                    &nbsp;<span className="icon is-small"><i className="fas fa-thumbs-up"></i></span>&nbsp;
                </button>
                <button className={"button is-rounded " + (this.state.confident === false ? "is-active is-link" : "")} onClick={() => this.setState({ confident: false })}>
                    &nbsp;<span className="icon is-small"><i className="fas fa-thumbs-down"></i></span>&nbsp;
                </button>
            </div>
    </div>);

    let submitButton = (
        <a className="button is-primary" onClick={() => {
            this.setState({ submitted: true });
            this.props.onQuestionCompleted();
        }}>Submit</a>
    );

    let review = (
        <span>
            Your answer: {this.state.selectedOption &&this.state.selectedOption.text} <br />
            Correct: {this.state.selectedOption && this.state.selectedOption.isCorrect ? "yes" : "no"}
            <br />
        </span>
    );

    let continueButton = (
        <a className="button is-primary " onClick={this.props.onNextQuestion}>Continue</a>
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
