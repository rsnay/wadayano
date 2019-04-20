import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import { Prompt } from 'react-router';

import { withAuthCheck } from '../shared/AuthCheck';
import ConceptRater from './ConceptRater';
import QuestionTaker from './QuestionTaker';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import { shuffleArray } from '../../utils';
import fragments from '../../fragments';

// Different phases or stages of the quiz-taking experience
// Student is redirected to the quiz review page after these
const phases = {
  CONCEPTS: 'concepts',
  QUESTIONS: 'questions',
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
      isComplete: false
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

      // Make sure there are questions in the quiz
      if (quiz.questions.length === 0) {
        this.setState({ error: "There are no questions in this quiz.", isLoading: false });
        return;
      }

      // Get current location of quiz attempt (number already answered) and resume from there
      // Questions are randomized using a seed based on the quiz attempt ID (and original order from Prisma is always the same), so order is guaranteed
      const currentQuestionIndex = quizAttempt.questionAttempts.length;

      // If concepts have been rated, jump to the questions
      let phase = phases.CONCEPTS;
      if (quizAttempt.conceptConfidences.length > 0) {
        phase = phases.QUESTIONS;
      }
      // Edge case—if a student answered all questions but didn't click continue after the last question (where the grade is actually submitted), submit it now
      if (currentQuestionIndex === quiz.questions.length) {
        this.setState({
          quizAttempt,
          quiz,
          currentQuestionIndex,
          isComplete: true
        });
        this._completeQuiz();
        return;
      }

      // If quiz isn’t finished, randomize the questions, store the data, and go to current question
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
    // If the student hasn’t completed the quiz, have the browser confirm before they leave the page
    if (!this.state.isComplete) {
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
    this.setState({currentQuestionCompleted: true});
  }

  // Called when the next question/continue button is clicked in a question
  _onNextQuestion() {
    // If at the end of the quiz...
    let newIndex = this.state.currentQuestionIndex + 1;
    
    //check if newIndex if there is a question attempt for the next question, skip?????
    // ... complete the quiz and submit the grade (still set new currentQuestionIndex so progress bar fills up)
    if (newIndex >= this.state.quiz.questions.length) {
      this.setState({ isComplete: true });
      this._completeQuiz();
    } else {
      // Otherwise go to next question
      this.setState({
        currentQuestionIndex: newIndex,
        currentQuestionCompleted: false
      });
    }
  }

  // Sends the completeQuiz mutation and displays if grade postback was successful or not (if applicable)
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
        
      this.setState({ isLoading: false });

      // Go to quiz review page (use replace instead of push so that browser back button will take student back to dashboard, not back to the quiz, which would start another attempt)
      this.props.history.replace('/student/quiz/review/' + this.state.quizAttempt.id);

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
    
    if (this.state.isLoading ) {
      return <LoadingBox />;
    }

    if (this.state.error) {
      return <ErrorBox>
        <p>There was an error loading this quiz. {this.state.error}</p>
      </ErrorBox>
    }

    // Quiz loaded from apollo/graphql mutation
    let { quiz } = this.state;

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
        {/* If the student hasn’t completed the quiz, have react router confirm before they navigate away */}
        <Prompt
          when={!this.state.isComplete}
          message="Do you want to pause your quiz attempt? You can resume it from the wadayano course dashboard."
        />
      </section>
    )
  }
}

const START_MUTATION = gql`
  mutation StartMutation($quizId: ID!) {
    startOrResumeQuizAttempt(quizId: $quizId) {
      ...StudentFullQuizAttempt
    }
  }
  ${fragments.studentFullQuizAttempt}
`;

const COMPLETE_MUTATION = gql`
  mutation CompleteMutation($quizAttemptId: ID!) {
    completeQuizAttempt(quizAttemptId: $quizAttemptId) {
      isGraded
      postSucceeded
      error
    }
  }
`;

export default withAuthCheck(compose(
  graphql(START_MUTATION, { name: 'startMutation' }),
  graphql(COMPLETE_MUTATION, { name: 'completeMutation' }),
)(QuizTaker), {student: true});
