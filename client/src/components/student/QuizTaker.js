import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import ConceptRater from './ConceptRater';
import QuestionView from './QuestionView';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import mockData from '../../mockData';

// Different phases or stages of the quiz-taking experience
const phases = {
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

  // After concepts are rated, switch to the questions phase
  _onConceptsRated() {
    this.setState({ phase: phases.QUESTIONS });
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
    if (newIndex >= this.props.quizQuery.quiz.questions.length) {
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
        <p>There was an error loading this quiz. Please return to the dashboard and try again.</p>
      </ErrorBox>
    }

    // Quiz loaded from apollo/graphql query
    let quiz = this.props.quizQuery.quiz;

    // Make sure there are questions in the quiz
    if (quiz.questions.length === 0) {
      return <ErrorBox>
        <p>There are no questions in this quiz.</p>
        <Link to="/student">Return to dashboard</Link>
      </ErrorBox>
    }

    // TODO get actual concepts
    let concepts = [
      {id: "c1", title: "concept 1"},
      {id: "c2", title: "concept 2"},
      {id: "c3", title: "concept 3"},
    ];

    let currentView;
    switch (this.state.phase) {
      case phases.CONCEPTS:
        currentView = <ConceptRater
          concepts={concepts}
          onConceptsRated={() => this._onConceptsRated() }
        />;
        break;
      case phases.QUESTIONS:
        currentView = <QuestionView
          question={quiz.questions[this.state.currentQuestionIndex]}
          key={quiz.questions[this.state.currentQuestionIndex].id}
          onQuestionCompleted={() => this._onQuestionCompleted() }
          onNextQuestion={() => this._onNextQuestion() }
        />;
        break;
      case phases.RESULTS:
        currentView = (
          <div>
            <p>Results view</p>
            <hr />

            <p className="control">
                  <Link to="/student" className="button">
                      Return to Dashboard
                  </Link>
            </p>
          </div>
        );
        break;
      case phases.CONCEPT_REVIEW:
        currentView = 'Concept review';
        break;
    }

    return (
        <section className="section">
        <div className="container">
          {/* Bigger header with title, and progress bar for tablet and larger */}
          <div className="columns is-hidden-mobile">
            <div className="column">
              <h1 className="title">{quiz.title}</h1>
            </div>
            <div className="column" style={{margin: "1rem 0 0 0"}}>
              {this.state.phase === phases.QUESTIONS && <div className="is-flex-tablet">
                <div style={{margin: "-.3rem 1rem .5rem 0", flexShrink: 0}}>Question {this.state.currentQuestionIndex + 1} of {quiz.questions.length}</div>
                <progress className="progress is-link" value={this.state.currentQuestionIndex + (this.state.currentQuestionCompleted ? 1 : 0)} max={quiz.questions.length}></progress>
              </div>}
            </div>
          </div>
          {/* Smaller progress indicator for mobile */}
          <div className="is-hidden-tablet is-pulled-right" style={{marginTop: "-2rem"}}>
            <div>{this.state.currentQuestionIndex + 1} of {quiz.questions.length}</div>
          </div>

          {currentView}

        </div>
      </section>
    )
  }
}

export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz (
      id: $id
    )
    {
      title
      questions {
        id
        prompt
        options {
          id
          text
          isCorrect
        }
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