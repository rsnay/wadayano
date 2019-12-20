import React, { useState } from 'react';
import { useQuery } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { useTracking } from 'react-tracking';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import { formatScore, wadayanoScore, confidenceAnalysis, predictedScore } from '../../utils';
import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';

import QuestionReview from './QuestionReview';
import Modal from '../shared/Modal';

import WadayanoScore from '../shared/WadayanoScore';
import fragments from '../../fragments';

const QUIZ_ATTEMPT_QUERY = gql`
  query quizAttemptQuery($id: ID!) {
    quizAttempt(id: $id) {
      ...StudentFullQuizAttempt
    }
  }
  ${fragments.studentFullQuizAttempt}
`;

// Calculate results for each concept
const calculateConceptResults = quizAttempt => {
  // Get concepts from all attempted questions in the quiz
  const quizConcepts = Array.from(
    new Set(quizAttempt.questionAttempts.map(q => q.question.concept))
  );

  const conceptResults = quizConcepts.map(concept => {
    const conceptQuestions = quizAttempt.questionAttempts.filter(
      questionAttempt => questionAttempt.question.concept === concept
    );

    // Package up information about this concept
    const result = {};
    result.concept = concept;
    result.questionCount = conceptQuestions.length;
    result.correctCount = conceptQuestions.filter(attempt => attempt.isCorrect).length;
    result.score = result.correctCount / result.questionCount;
    result.predictedScore = predictedScore(quizAttempt, concept);
    result.wadayanoScore = wadayanoScore(quizAttempt, concept);
    result.confidenceAnalysis = confidenceAnalysis(quizAttempt, concept);

    return result;
  });

  return conceptResults;
};

/**
 * This component (used in the student QuizReviewPage and in the instructor QuizScores) displays
 * overall scores (actual, wadayano, and predicted) for the quiz and for the quiz’s concepts.
 * Questions within each concept can be reviewed.
 */
const QuizReview = ({ quizAttemptId, hideTitle = false }) => {
  const [showReviewForConcept, setShowReviewForConcept] = useState(null);
  const tracking = useTracking();

  const { error, data } = useQuery(QUIZ_ATTEMPT_QUERY, {
    fetchPolicy: 'cache-and-network',
    variables: { id: quizAttemptId },
  });

  // Show modal with questions for a specific concept
  const showConceptReview = result => {
    setShowReviewForConcept(result.concept);
    tracking.trackEvent({
      page: 'QuizReview',
      quizAttemptId,
      action: 'STUDENT_REVIEW_CONCEPT',
      concept: result.concept,
      conceptScore: result.score,
      conceptPredictedScore: result.predictedScore,
      conceptWadayanoScore: result.wadayanoScore,
    });
  };

  if (!(data && data.quizAttempt)) {
    return <Spinner />;
  }

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load quiz results. Please try again later.</p>
      </ErrorBox>
    );
  }

  const { quizAttempt } = data;

  let conceptResults = [];
  try {
    conceptResults = calculateConceptResults(quizAttempt);
  } catch (e) {
    console.error(e);
    ButterToast.raise({
      content: (
        <ToastTemplate
          content="There was an error generating the full report for this quiz. This may occur if the quiz has been modified by the instructor. Please contact us if this problem persists."
          className="is-danger"
        />
      ),
    });
  }

  return (
    <div className="quiz-review-container">
      <PageTitle title={`wadayano | ${quizAttempt.quiz.title} Review`} />
      {/* Title and overall results */}
      <div className="columns">
        <div className="column is-6">
          {!hideTitle && <h1 className="subtitle is-2">{quizAttempt.quiz.title}</h1>}
          <h2 className="subtitle is-2">
            Score: {formatScore(quizAttempt.score)}&nbsp;
            <span className="has-text-weight-light">
              ({formatScore(predictedScore(quizAttempt))} Predicted)
            </span>
          </h2>
          <WadayanoScore
            score={wadayanoScore(quizAttempt)}
            confidenceAnalysis={confidenceAnalysis(quizAttempt)}
          />
        </div>
      </div>

      <h2 className="subtitle is-3">Concepts in this Quiz</h2>
      {/* Concept-specific result cards */}
      <div className="tile is-ancestor" style={{ flexWrap: 'wrap' }}>
        {conceptResults.map(result => (
          <div className="tile is-6 is-parent" key={result.concept}>
            <div className="tile is-child box concept-result-card">
              <h3 className="title is-3">
                <span>{result.concept}</span>
                <span className="question-count">
                  {result.questionCount === 1 ? '1 Question' : `${result.questionCount} Questions`}
                </span>
              </h3>
              <p className="title">
                Score: {formatScore(result.score)}{' '}
                <span className="has-text-weight-light">
                  ({formatScore(result.predictedScore)} Predicted)
                </span>
              </p>
              <WadayanoScore
                score={result.wadayanoScore}
                confidenceAnalysis={result.confidenceAnalysis}
              />
              <footer>
                <button
                  className="button is-primary is-block is-fullwidth"
                  onClick={() => showConceptReview(result)}
                  type="button"
                >
                  View Details
                </button>
              </footer>
            </div>
          </div>
        ))}
      </div>

      {/* Concept-specific review modal */}
      <Modal
        modalState={showReviewForConcept !== null}
        closeModal={() => setShowReviewForConcept(null)}
        title={`Concept Review: ${showReviewForConcept}`}
      >
        <span className="concept-questions-list">
          {quizAttempt.questionAttempts
            .filter(q => q.question.concept === showReviewForConcept)
            .map(conceptQuestion => (
              <div className="question-review" key={conceptQuestion.id}>
                <QuestionReview
                  questionAttempt={conceptQuestion}
                  question={conceptQuestion.question}
                />
                <hr />
              </div>
            ))}
        </span>
      </Modal>
    </div>
  );
};

QuizReview.propTypes = {
  quizAttemptId: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool,
};

export default QuizReview;
