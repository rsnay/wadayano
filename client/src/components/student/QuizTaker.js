import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import { Prompt } from 'react-router';

import { withAuthCheck } from '../shared/AuthCheck';
import ConceptRater from './ConceptRater';
import QuestionTaker from './QuestionTaker';
import QuizReview from './QuizReview';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import { shuffleArray } from '../../utils';

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
      quiz: null,
      randomizedQuestions: null,
      quizAttempt: null,
      quizGradePayload: null
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
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
        
      // Quiz attempt and quiz data to store in state
      const quizAttempt = result.data.startOrResumeQuizAttempt;
      const quiz = quizAttempt.quiz;

      // Get current location of quiz attempt, and resume at that point
      // It looks like the list order is guaranteed from prisma, so this should be fine: https://www.prisma.io/forum/t/list-array-order-guaranteed/2235
      const currentQuestionIndex = quizAttempt.questionAttempts.length;

      // If concepts have been rated, jump to the questions
      let phase = phases.CONCEPTS;
      if (quizAttempt.conceptConfidences.length > 0) {
        phase = phases.QUESTIONS;
      }
      // Edge case—if a student answered all questions but didn't continue to the results (where the grade is actually submitted), submit it now
      if (currentQuestionIndex === quiz.questions.length) {
        this.setState({
          quizAttempt,
          quiz,
          currentQuestionIndex,
          phase: phases.RESULTS
        });
        this._completeQuiz();
        return;
      }

      // Otherwise randomize the questions, store the data, and go to current question
      let randomizedQuestions = shuffleArray(quizAttempt.id, [...quiz.questions]);

      this.setState({
        quizAttempt,
        quiz,
        randomizedQuestions,
        phase,
        currentQuestionIndex,
        isLoading: false
      });
      console.log('Quiz attempt: ', quizAttempt);

    } catch (e) {
      // Catch errors
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
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

  // Called from a QuestionTaker after its question has been answered, confidence-rated, and reviewed
  _onQuestionCompleted(questionAttempt) {
    // Add this questionAttempt to our quizAttempt
    // TODO
    this.setState({currentQuestionCompleted: true});
  }

  // Called when the next question/continue button is clicked in a question
  _onNextQuestion() {
    // If at the end of the quiz...
    let newIndex = this.state.currentQuestionIndex + 1;
    // Change to Random
    
    
    //check if newIndex if there is a question attempt for the next question, skip?????
    // ... go to results (still set new currentQuestionIndex so progress bar fills up)
    if (newIndex >= this.state.quiz.questions.length) {
      this.setState({
        phase: phases.RESULTS,
        currentQuestionIndex: newIndex
      });
      this._completeQuiz();
    } else {
      // Otherwise go to next question
      this.setState({
        currentQuestionIndex: newIndex,
        currentQuestionCompleted: false
      });
    }
  }

  // Sends the completeQuiz mutation. The resulting data gets used in the QuizReview component
  async _completeQuiz() {
    this.setState({ isLoading: true });
    try {
      // Pass the quiz attempt ID to be completed
      const result = await this.props.completeMutation({
        variables: {
          quizAttemptId: this.state.quizAttempt.id
        }
      });
      console.log(result);

      // A QuizGradePayload contains isGraded (bool!), postSucceeded (bool), error (string), and quizAttempt (quizAttempt!)
      const quizGradePayload = result.data.completeQuizAttempt;

      // If it was graded, check if the LTI grade passback was successful or not
      if (quizGradePayload.isGraded) {

        if (quizGradePayload.postSucceeded) {
          ButterToast.raise({
            content: <ToastTemplate content="Your score was posted successfully." className="is-success" />
          });
        } else {
          ButterToast.raise({
            content: <ToastTemplate content="There was an error posting your score to your learning management system. Your instructor will be notified of your score and will enter it manually." className="is-warning" />,
            sticky: true
          });
        } 
      }
        
      // Store quizGradePayload info in state
      this.setState({ quizGradePayload, isLoading: false });
    } catch (e) {
      // Catch errors
      let message = 'Error completing quiz. ';
      if (e.graphQLErrors && e.graphQLErrors.length > 0) {
        message += e.graphQLErrors[0].message;
      }
      this.setState({ error: message, isLoading: false });
      console.error('Error completing quiz: ' + JSON.stringify(e));
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

    let currentView;
    switch (this.state.phase) {
      case phases.CONCEPTS:
        // Get concepts (and respective question count) from all questions in the quiz
        let conceptQuestionCounts = new Map();
        quiz.questions.forEach(q => {
          if (conceptQuestionCounts.has(q.concept)) {
            conceptQuestionCounts.set(q.concept, conceptQuestionCounts.get(q.concept) + 1);
          } else {
            conceptQuestionCounts.set(q.concept, 1);
          }
        });

        currentView = <ConceptRater
          quizAttemptId={this.state.quizAttempt.id}
          conceptQuestionCounts={conceptQuestionCounts}
          onConceptsRated={() => this._onConceptsRated() }
        />;
        break;
        
      case phases.QUESTIONS:
        currentView = <QuestionTaker
          quizAttemptId={this.state.quizAttempt.id}
          question={this.state.randomizedQuestions[this.state.currentQuestionIndex]}
          key={this.state.randomizedQuestions[this.state.currentQuestionIndex].id}
          onQuestionCompleted={() => this._onQuestionCompleted() }
          onNextQuestion={() => this._onNextQuestion() }
        />;
        break;

      case phases.RESULTS:
        currentView = (
          <div>
            <QuizReview quizAttempt={this.state.quizGradePayload.quizAttempt} />
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
      
      default:
        currentView = null;
    }

    return (
        <section className="section">
        <div className="container">
          {/* Bigger header with title, and progress bar for tablet and larger */}
          <div className="columns is-hidden-mobile">
            <div className="column">
              <h1 className="title is-1">{quiz.title}</h1>
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
          message="Do you want to pause your quiz attempt? You can resume it from the wadayano course dashboard."
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
        id
        title
        questions {
          id
          prompt
          concept
          options {
            id
            text
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
        concept
        confidence
      }
    }
  }
`;

const COMPLETE_MUTATION = gql`
  mutation CompleteMutation($quizAttemptId: ID!) {
    completeQuizAttempt(quizAttemptId: $quizAttemptId) {
      isGraded
      postSucceeded
      error
      quizAttempt {
        id
        completed
        score
        postSucceeded
        quiz {
          id
          title
          questions {
            id
            prompt
            concept
            options {
              id
              text
            }
          }
        }
        questionAttempts {
          id
          question {
            id
            prompt
            concept
          }
          option {
            id
            text
          }
          correctOption {
            id
            text
          }
          isCorrect
          isConfident
        }
        conceptConfidences {
          id
          concept
          confidence
        }
      }
    }
  }
`;

export default withAuthCheck(compose(
  graphql(START_MUTATION, { name: 'startMutation' }),
  graphql(COMPLETE_MUTATION, { name: 'completeMutation' }),
)(QuizTaker), {student: true});
