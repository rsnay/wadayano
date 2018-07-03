import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

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
              {id: "1", isCorrect: false, text: "Wrong 1"},
              {id: "2", isCorrect: true, text: "Right 2"},
              {id: "3", isCorrect: false, text: "Wrong 3"},
              {id: "4", isCorrect: false, text: "Wrong 4"},
          ];

    let options = questionOptions.map((option, index) =>
        <div style={{margin: "0.5rem"}} key={option.id}>
        <button className={"is-block button " + (option.isCorrect ? "has-text-success " : " ") + (this.state.selectedOption && this.state.selectedOption.id === option.id ? "is-link" : "")}
            onClick={() => {
                this.setState({ selectedOption: option })
            }}
            index={index}>
                {option.text}
        </button>
        </div>
    );

    let confidenceSelector = (
        <div>
            <h5 style={{margin: "0.5rem"}}>I'm confident: </h5>
            <div class="tabs is-toggle is-toggle-rounded">
                <ul>
                    <li className={this.state.confident === true ? "is-active" : ""}>
                    <a onClick={() => this.setState({ confident: true })}>
                        <span class="icon is-small"><i class="fas fa-thumbs-up"></i></span>
                    </a>
                    </li>
                    <li className={this.state.confident === false ? "is-active" : ""}>
                    <a onClick={() => this.setState({ confident: false })}>
                        <span class="icon is-small"><i class="fas fa-thumbs-down"></i></span>
                    </a>
                    </li>
                </ul>
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
            {this.props.question.prompt}
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
}