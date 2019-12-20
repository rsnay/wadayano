import React, { useEffect, useState } from 'react';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import { Prompt, useParams, useHistory } from 'react-router';

import withAuthCheck from '../shared/AuthCheck';
import PageTitle from '../shared/PageTitle';
import ConceptRater from './ConceptRater';
import QuestionTaker from './QuestionTaker';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import { shuffleArray } from '../../utils';
import fragments from '../../fragments';

const useMountEffect = fn => useEffect(fn, []);

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

// Different phases or stages of the quiz-taking experience
// Student is redirected to the quiz review page after these
const phases = {
  CONCEPTS: 'concepts',
  QUESTIONS: 'questions',
};

const QuizTaker = () => {
  const { quizId } = useParams();
  const history = useHistory();

  // Yes, this is a lot of state...
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState(phases.CONCEPTS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestionCompleted, setCurrentQuestionCompleted] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [randomizedQuestions, setRandomizedQuestions] = useState(null);
  const [quizAttempt, setQuizAttempt] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const [startMutation] = useMutation(START_MUTATION);
  const [completeMutation] = useMutation(COMPLETE_MUTATION);

  // Sends the completeQuiz mutation and displays if grade postback was successful or not (if applicable)
  const completeQuiz = async quizAttemptId => {
    setIsLoading(true);
    try {
      // Pass the quiz attempt ID to be completed
      const result = await completeMutation({ variables: { quizAttemptId } });
      console.log(result);

      // A QuizGradePayload contains isGraded (bool!), postSucceeded (bool), error (string), and quizAttempt (quizAttempt!)
      const quizGradePayload = result.data.completeQuizAttempt;

      // If it was graded, check if the LTI grade passback was successful or not
      if (quizGradePayload.isGraded && quizGradePayload.postSucceeded) {
        ButterToast.raise({
          content: (
            <ToastTemplate content="Your score was posted successfully." className="is-success" />
          ),
        });
      } else if (quizGradePayload.isGraded && !quizGradePayload.postSucceeded) {
        ButterToast.raise({
          content: (
            <ToastTemplate
              content="There was an error posting your score to your learning management system. Your instructor will be notified of your score and will enter it manually."
              className="is-warning"
            />
          ),
          sticky: true,
        });
      }

      // Go to quiz review page (use replace instead of push so that browser back button will take student back to dashboard, not back to the quiz, which would start another attempt)
      history.replace(`/student/quiz/review/${quizAttemptId}`);
    } catch (e) {
      // Catch errors
      let message = '';
      if (e.graphQLErrors && e.graphQLErrors.length > 0) {
        message += e.graphQLErrors[0].message;
      }
      setError(
        `Error completing quiz. Please reload the page and try again. (Your progress will not be lost.) ${message}`
      );
      console.error(`Error completing quiz: ${JSON.stringify(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useMountEffect(() => {
    const startAttempt = async () => {
      // When component is mounted, automatically start or resume the quiz attempt
      try {
        // Pass the quiz ID from the route into the query
        const result = await startMutation({ variables: { quizId } });
        if (result.errors && result.errors.length > 0) {
          throw result;
        }

        // Quiz attempt and quiz data to store in state
        const newQuizAttempt = result.data.startOrResumeQuizAttempt;
        const newQuiz = newQuizAttempt.quiz;

        // Make sure there are questions in the quiz
        if (newQuiz.questions.length === 0) {
          setError('Error loading quiz: there are no questions in this quiz.');
          setIsLoading(false);
          return;
        }

        // Get current location of quiz attempt (number already answered) and resume from there
        // Questions are randomized using a seed based on the quiz attempt ID (and original order
        // from Prisma is always the same), so order is guaranteed
        const newCurrentQuestionIndex = newQuizAttempt.questionAttempts.length;

        // If concepts have been rated, jump to the questions
        let newPhase = phases.CONCEPTS;
        if (newQuizAttempt.conceptConfidences.length > 0) {
          newPhase = phases.QUESTIONS;
        }

        setQuizAttempt(newQuizAttempt);
        setQuiz(newQuiz);
        setCurrentQuestionIndex(newCurrentQuestionIndex);

        // Edge case—if a student answered all questions but didn't click continue
        // after the last question (which is where the grade is actually submitted), submit it now
        if (newCurrentQuestionIndex === newQuiz.questions.length) {
          setIsCompleted(true);
          // Pass in ID directly, since state is not guaranteed to have updated
          completeQuiz(newQuizAttempt.id);
          return;
        }

        // If quiz isn’t finished, randomize the questions, store the data, and go to current question
        const newRandomizedQuestions = shuffleArray(newQuizAttempt.id, [...newQuiz.questions]);
        setRandomizedQuestions(newRandomizedQuestions);
        setPhase(newPhase);
        setIsLoading(false);
        console.log('Quiz attempt: ', newQuizAttempt);
      } catch (e) {
        // Catch errors
        let message = 'Please try again later.';
        if (e.errors && e.errors.length > 0) {
          message = e.errors[0].message;
        }
        setError(`There was an error loading this quiz. ${message}`);
        console.error(`Quiz attempt load error: ${JSON.stringify(e)}`);
      }
    };
    startAttempt();
  });

  useEffect(() => {
    // Have the browser confirm before the student leaves the page
    window.onbeforeunload = () => true;
    return () => (window.onbeforeunload = undefined);
  }, []);

  // After concepts are rated, switch to the questions phase
  const onConceptsRated = () => {
    setPhase(phases.QUESTIONS);
  };

  // Called from a QuestionTaker after its question has been answered, confidence-rated, and reviewed
  const onQuestionCompleted = () => {
    setCurrentQuestionCompleted(true);
  };

  // Called when the next question/continue button is clicked in a question
  const onNextQuestion = () => {
    // If at the end of the quiz...
    const newIndex = currentQuestionIndex + 1;

    // check if newIndex if there is a question attempt for the next question, skip?????
    // ... complete the quiz and submit the grade (still set new currentQuestionIndex so progress bar fills up)
    if (newIndex >= quiz.questions.length) {
      setIsCompleted(true);
      completeQuiz(quizAttempt.id);
    } else {
      // Otherwise go to next question
      setCurrentQuestionIndex(newIndex);
      setCurrentQuestionCompleted(false);
    }
  };

  if (error) {
    return (
      <ErrorBox>
        <p>{error}</p>
      </ErrorBox>
    );
  }

  if (isLoading) {
    return <Spinner />;
  }

  let currentView = null;
  if (phase === phases.CONCEPTS) {
    // Get concepts (and respective question count) from all questions in the quiz
    const conceptQuestionCounts = new Map();
    quiz.questions.forEach(q => {
      if (conceptQuestionCounts.has(q.concept)) {
        conceptQuestionCounts.set(q.concept, conceptQuestionCounts.get(q.concept) + 1);
      } else {
        conceptQuestionCounts.set(q.concept, 1);
      }
    });

    currentView = (
      <ConceptRater
        quizAttemptId={quizAttempt.id}
        conceptQuestionCounts={conceptQuestionCounts}
        onConceptsRated={onConceptsRated}
      />
    );
  } else if (phase === phases.QUESTIONS) {
    currentView = (
      <QuestionTaker
        quizAttemptId={quizAttempt.id}
        question={randomizedQuestions[currentQuestionIndex]}
        key={randomizedQuestions[currentQuestionIndex].id}
        onQuestionCompleted={onQuestionCompleted}
        onNextQuestion={onNextQuestion}
      />
    );
  }

  return (
    <section className="section">
      <div className="container">
        <PageTitle title={`wadayano | ${quiz.title}`} />
        {/* Bigger header with title, and progress bar for tablet and larger */}
        <div className="columns is-hidden-mobile">
          <div className="column">
            <h1 className="title is-1">{quiz.title}</h1>
          </div>
          <div className="column no-select" style={{ margin: '1rem 0 0 0' }}>
            {phase === phases.QUESTIONS && (
              <div className="is-flex-tablet">
                <div style={{ margin: '-.3rem 1rem .5rem 0', flexShrink: 0 }}>
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </div>
                <progress
                  className="progress is-link"
                  value={currentQuestionIndex + (currentQuestionCompleted ? 1 : 0)}
                  max={quiz.questions.length}
                />
              </div>
            )}
          </div>
        </div>
        {/* Smaller progress indicator for mobile */}
        {phase === phases.QUESTIONS && (
          <div
            className="is-hidden-tablet is-pulled-right no-select"
            style={{ marginTop: '-2rem' }}
          >
            <div>
              {currentQuestionIndex + 1} of {quiz.questions.length}
            </div>
          </div>
        )}

        {currentView}
      </div>
      {/* If the student hasn’t completed the quiz, have react router confirm before they navigate away */}
      <Prompt
        when={!isCompleted}
        message="Do you want to pause your quiz attempt? You can resume it from the wadayano course dashboard."
      />
    </section>
  );
};

export default withAuthCheck(QuizTaker, { student: true });
