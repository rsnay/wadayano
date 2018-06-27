import React, { Component } from 'react';
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

    let options = this.props.question.options.map((option, index) =>
        <div style={{margin: "0.5rem"}}>
        <button className={"is-block button " + (option.isCorrect ? "has-text-success " : " ") + (this.state.selectedOption && this.state.selectedOption.id === option.id ? "is-link" : "")}
            key={option.id}
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
        <a className="button is-primary" onClick={() => this.setState({ submitted: true })}>Submit</a>
    );

    let review = (
        <span>
            Your answer: {this.state.selectedOption &&this.state.selectedOption.text} <br />
            Correct: {this.state.selectedOption && this.state.selectedOption.isCorrect ? "yes" : "no"}
            <br />
        </span>
    );

    let continueButton = (
        <a className="button is-primary " onClick={this.props._onNextQuestion}>Continue</a>
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