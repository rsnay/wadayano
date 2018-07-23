import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import { Prompt } from 'react-router';

import ConceptRater from './ConceptRater';
import QuestionView from './QuestionView';
import QuizReview from './QuizReview';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

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
      isLoading: true,
      error: '',
      phase: phases.CONCEPTS,
      conceptConfidences: [],
      currentQuestionIndex: 0,
      currentQuestionCompleted: false,
      questionAttempts: [],
      quizAttempt: null
    };
  }

  async componentDidMount() {
    // When component is mounted, automatically start or resume the quiz attempt
    try {
      // Pass the quiz ID from the route into the query
      const result = await this.props.startMutation({
        variables: {
          quizId: this.props.match.params.quizId
        }
      });
        
      // Store quiz attempt and quiz data in state
      const quizAttempt = result.data.startOrResumeQuizAttempt;
      const quiz = quizAttempt.quiz;
      this.setState({ quizAttempt, quiz, isLoading: false });
    } catch (e) {
      // Catch errors
      let message = 'Please try again later.';
      if (e.graphQLErrors && e.graphQLErrors.length > 0) {
        message = e.graphQLErrors[0].message;
      }
      this.setState({ error: message, isLoading: false });
      console.error('Quiz attempt load error: ' + JSON.stringify(e));
    }
  }

  componentDidUpdate() {
    // If the student isn't to the results screen yet, have the browser confirm before they leave the page
    if (this.state.phase !== phases.RESULTS) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
  }

  componentWillUnmount() {
    // Remove leave confirmation when the user navigates away
    window.onbeforeunload = undefined;
  }

  // After concepts are rated, switch to the questions phase
  _onConceptsRated() {
    this.setState({ phase: phases.QUESTIONS });
  }

  // Called from a QuestionView after its question has been answered, confidence-rated, and reviewed
  _onQuestionCompleted(questionAttempt) {
    // Add this questionAttempt to our quizAttempt
    // TODO
    this.setState({currentQuestionCompleted: true});
  }

  // Called when the next question/continue button is clicked in a question
  _onNextQuestion() {
    // If at the end of the quiz...
    let newIndex = this.state.currentQuestionIndex + 1;
    // ... go to results (still set new currentQuestionIndex so progress bar fills up)
    if (newIndex >= this.state.quiz.questions.length) {
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
    
    if (this.state.isLoading) {
      return <LoadingBox />;
    }

    if (this.state.error) {
      return <ErrorBox>
        <p>There was an error loading this quiz. {this.state.error}</p>
      </ErrorBox>
    }

    // Quiz loaded from apollo/graphql mutation
    let { quiz } = this.state;

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
          quizAttemptId={this.state.quizAttempt.id}
          question={quiz.questions[this.state.currentQuestionIndex]}
          key={quiz.questions[this.state.currentQuestionIndex].id}
          onQuestionCompleted={() => this._onQuestionCompleted() }
          onNextQuestion={() => this._onNextQuestion() }
        />;
        break;

      case phases.RESULTS:
        currentView = (
          <div>
            <QuizReview quizAttemptId={"TODO"} />
            <hr />
            <p className="control">
                  <Link to="/student" className="button is-medium">
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
            <div className="column no-select" style={{margin: "1rem 0 0 0"}}>
              {this.state.phase === phases.QUESTIONS && <div className="is-flex-tablet">
                <div style={{margin: "-.3rem 1rem .5rem 0", flexShrink: 0}}>Question {this.state.currentQuestionIndex + 1} of {quiz.questions.length}</div>
                <progress className="progress is-link" value={this.state.currentQuestionIndex + (this.state.currentQuestionCompleted ? 1 : 0)} max={quiz.questions.length}></progress>
              </div>}
            </div>
          </div>
          {/* Smaller progress indicator for mobile */}
          {this.state.phase === phases.QUESTIONS && <div className="is-hidden-tablet is-pulled-right no-select" style={{marginTop: "-2rem"}}>
            <div>{this.state.currentQuestionIndex + 1} of {quiz.questions.length}</div>
          </div>}

          {currentView}

        </div>
        {/* If the student isn't to the results screen yet, have react router confirm before they navigate away */}
        <Prompt
          when={this.state.phase !== phases.RESULTS}
          message="Are you sure you want to leave this quiz? Your score will not be saved."
        />
      </section>
    )
  }
}

const START_MUTATION = gql`
  mutation StartMutation($quizId: ID!) {
    startOrResumeQuizAttempt(quizId: $quizId) {
      id
      quiz {
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
      questionAttempts {
        id
        question {
          id
        }
        option {
          id
        }
        isCorrect
        isConfident
      }
      conceptConfidences {
        id
        concept {
          id
          title
        }

      }
    }
  }
`;

export default compose(
  graphql(START_MUTATION, { name: 'startMutation' }),
  //graphql(START_MUTATION, { name: 'startMutation' })
)(QuizTaker)