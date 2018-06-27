import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import QuestionView from './QuestionView';

import mockData from '../../mockData';

// Different phases or stages of the quiz-taking experience
let phases = {
  CONCEPTS: 'concepts',
  QUESTIONS: 'questions',
  RESULTS: 'results',
  CONCEPT_REVIEW: 'concept_review'
};

export default class QuizTaker extends Component {

  constructor(props) {
    super(props);

    // Get quiz based on quizId in url
    let quiz = mockData.quizzes.find(quiz => quiz.id === props.match.params.quizId) || false;

    this.state = {
      phase: phases.QUESTIONS,
      conceptConfidences: [],
      currentQuestionIndex: 0,
      questionAttempts: [],
      quizAttempt: null,
      quiz: quiz,
      loadError: !quiz
    };

  }

  // Called from a QuestionView after its question has been answered, confidence-rated, and reviewed
  _onNextQuestion() {
    // If at the end of the quiz...
    let newIndex = this.state.currentQuestionIndex + 1;
    // ... go to results (still set new currentQuestionIndex so progress bar fills up)
    if (newIndex >= this.props.quiz.questions.length) {
      this.setState({ phase: phases.RESULTS, currentQuestionIndex: newIndex });
    } else {
      // Otherwise go to next question
      this.setState({ currentQuestionIndex: newIndex });
    }
  }

  render() {
    if (this.state.loadError) {
      return <div class="container notification is-danger">
        There was an error loading this quiz. Please return to the dashboard and try again.
      </div>
    }
    // TODO this will probably come from props with graphql and apollo
    let quiz = this.state.quiz;

    let currentView;
    switch (this.state.phase) {
      case phases.CONCEPTS:
        currentView = 'Concepts'
        break;
      case phases.QUESTIONS:
        currentView = <QuestionView
          question={quiz.questions[this.state.currentQuestionIndex]}
          key={this.state.currentQuestionIndex}
          _onNextQuestion={() => this._onNextQuestion() } />;
        break;
      case phases.RESULTS:
        currentView = 'Results view';
        break;
      case phases.CONCEPT_REVIEW:
        currentView = 'Concept review';
        break;
    }

    return (
        <section class="section">
        <div class="container">
          <h1 class="title">{quiz.title}</h1>
          <i>{quiz.questions.length} questions</i>
          <progress className="progress is-link" value={this.state.currentQuestionIndex} max={quiz.questions.length}></progress>
          <hr />

          {currentView}

          <hr />

          <p class="control">
                <Link to="/student" className="button">
                    Return to Dashboard
                </Link>
          </p>

        </div>
      </section>
    )
  }
}

QuizTaker.defaultProps = {
  quiz: mockData.quizzes[0]
};