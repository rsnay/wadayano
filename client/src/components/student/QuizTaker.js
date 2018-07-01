import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import QuestionView from './QuestionView';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import mockData from '../../mockData';

// Different phases or stages of the quiz-taking experience
let phases = {
  CONCEPTS: 'concepts',
  QUESTIONS: 'questions',
  RESULTS: 'results',
  CONCEPT_REVIEW: 'concept_review'
};

class QuizTaker extends Component {

  constructor(props) {
    super(props);

    this.state = {
      phase: phases.QUESTIONS,
      conceptConfidences: [],
      currentQuestionIndex: 0,
      currentQuestionCompleted: false,
      questionAttempts: [],
      quizAttempt: null
    };

  }

  // Called from a QuestionView after its question has been answered, confidence-rated, and reviewed
  _onQuestionCompleted() {
    this.setState({currentQuestionCompleted: true});
  }

  // Called when the next question/continue button is clicked in a question
  _onNextQuestion() {
    // If at the end of the quiz...
    let newIndex = this.state.currentQuestionIndex + 1;
    // ... go to results (still set new currentQuestionIndex so progress bar fills up)
    if (newIndex >= this.props.quiz.questions.length) {
      this.setState({
        phase: phases.RESULTS,
        currentQuestionIndex: newIndex
      });
    } else {
      // Otherwise go to next question
      this.setState({
        currentQuestionIndex: newIndex,
        currentQuestionCompleted: false
      });
    }
  }

  render() {
    
    if (this.props.quizQuery && this.props.quizQuery.loading) {
      return <LoadingBox />;
    }

    if (this.props.quizQuery && this.props.quizQuery.error) {
      return <ErrorBox>
        There was an error loading this quiz. Please return to the dashboard and try again.
      </ErrorBox>
    }

    // Quiz loaded from apollo/graphql query
    let quiz = this.props.quizQuery.quiz;

    let currentView;
    switch (this.state.phase) {
      case phases.CONCEPTS:
        currentView = 'Concepts'
        break;
      case phases.QUESTIONS:
        currentView = <QuestionView
          question={quiz.questions[this.state.currentQuestionIndex]}
          key={this.state.currentQuestionIndex}
          onQuestionCompleted={() => this._onQuestionCompleted() }
          onNextQuestion={() => this._onNextQuestion() }
        />;
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
          <progress className="progress is-link" value={this.state.currentQuestionIndex + (this.state.currentQuestionCompleted ? 1 : 0)} max={quiz.questions.length}></progress>
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

export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz (
      id: $id
    )
    {
      title
      isGraded
      available
      questions {
        id
        prompt
      }
    }
  }
`

export default graphql(QUIZ_QUERY, {
  name: 'quizQuery',
  options: (props) => {
    console.log(props.match.params.quizId);
    // Pass the quiz ID from the route into the query
    return { variables: { id: props.match.params.quizId } }
  }
}) (QuizTaker)