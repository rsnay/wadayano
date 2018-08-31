import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ScrollIntoViewIfNeeded from 'react-scroll-into-view-if-needed';

import ErrorBox from '../shared/ErrorBox';

import ConfidenceSelector from './ConfidenceSelector';
import QuestionReview from './QuestionReview';

import { ALPHABET } from '../../constants';

class QuestionTaker extends Component {

  constructor(props) {
    super(props);
    this.state = {
        isLoading: false,
        selectedOption: null,
        confident: null,
        submitted: false,
        // Will get sent from the server after attempting the question
        questionAttempt: null
    };
    this._submitted = false;
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keydown', this._handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this._handleKeyDown);
  }

  // Allow options to be selected by pressing that letter on the keyboard. This is kind of hacky right now
  _handleKeyDown(e) {
    // If the question has already been answered, don't let the selected answer change (without this, it's kind of entertaining!)
    if (this.state.submitted) { return; }

    // If a modifier key is pressed, ignore (otherwise they can't ctrl+c to copy, etc.)
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) { return; }

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

  async _submit() {
        // If the enter button is pressed really quickly in succession, this could get fired twice before the
        if (this._submitted) { return; }
        this._submitted = true;
        this.setState({ isLoading: true });
        const result = await this.props.attemptQuestionMutation({
            variables: {
                quizAttemptId: this.props.quizAttemptId,
                questionId: this.props.question.id,
                optionId: this.state.selectedOption.id,
                isConfident: this.state.confident
            }
        });
        // TODO catch errors
        console.log("question attempt", result.data.attemptQuestion);
        this.setState({ questionAttempt: result.data.attemptQuestion, submitted: true });
        if (this.props.onQuestionCompleted) {
            this.props.onQuestionCompleted();
        }
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

    // Hide empty options
    let options = questionOptions.filter(option => option.text.trim() !== '').map((option, index) => {
        return (<div className="columns is-mobile question-option-container" key={option.id}
            onClick={() => {
                this.setState({ selectedOption: option })
            }}>
            <button className={"column is-1 question-option-letter level-left is-rounded button " + (this.state.selectedOption && this.state.selectedOption.id === option.id ? "is-link" : "")} >
                <span>{ALPHABET[index]}</span>
            </button>
            <span className="column question-option-text level-left">
                {option.text}
            </span>
        </div>);
    });

    let confidenceSelector = (
        <ScrollIntoViewIfNeeded>
            <ConfidenceSelector
                onChange={(confident) => { this.setState({ confident }) }}
                confident={this.state.confident} />
        </ScrollIntoViewIfNeeded>
    );

    let submitButton = (
        <ScrollIntoViewIfNeeded>
        <hr />
        <button autoFocus className={"button is-primary is-medium" + (this.state.isLoading ? " is-loading" : "")} onClick={() => this._submit()}>Submit</button>
        </ScrollIntoViewIfNeeded>
    );

    let review = this.state.questionAttempt && <QuestionReview questionAttempt={this.state.questionAttempt} question={this.props.question} />;

    let continueButton = (
        <button autoFocus className="button is-primary is-medium" onClick={this.props.onNextQuestion}>Continue</button>
    );

    // Question answer view
    if (!this.state.submitted) {
        return (
            <div>
                {prompt}
                <br />
                {options}
                {this.state.selectedOption && confidenceSelector}
                {this.state.confident !== null && submitButton}
            </div>
        );
    } else {
        // Question review view
        return (
            <div>
                {review}
                <br />
                {continueButton}
            </div>
        );
    }
  }
}

QuestionTaker.propTypes = {
    quizAttemptId: PropTypes.string.isRequired,
    question: PropTypes.object.isRequired,
    onQuestionCompleted: PropTypes.func,
    onNextQuestion: PropTypes.func.isRequired
};

const ATTEMPT_QUESTION_MUTATION = gql`
  mutation AttemptQuestion($quizAttemptId: ID!, $questionId: ID!, $optionId: ID!, $isConfident: Boolean!) {
    attemptQuestion(quizAttemptId: $quizAttemptId, questionId: $questionId, optionId: $optionId, isConfident: $isConfident) {
      id
      isCorrect
      isConfident
      option {
          id
          text
      }
      correctOption {
          id
          text
      }
    }
  }
`;

export default graphql(ATTEMPT_QUESTION_MUTATION, { name: 'attemptQuestionMutation' })(QuestionTaker)