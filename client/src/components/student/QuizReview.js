import React, { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import track from 'react-tracking';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import { formatScore, wadayanoScore, confidenceAnalysis, predictedScore } from '../../utils';
import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';

import QuestionReview from './QuestionReview';
import Modal from '../shared/Modal';

import WadayanoScore from '../shared/WadayanoScore';
import fragments from '../../fragments';

/**
 * This component (used in the student QuizReviewPage and in the instructor QuizScores) displays
 * overall scores (actual, wadayano, and predicted) for the quiz and for the quiz’s concepts.
 * Questions within each concept can be reviewed.
 */
class QuizReview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showReviewForConcept: null,
    };
  }

  // Show modal with questions for a specific concept
  showConceptReview(result) {
    this.setState({ showReviewForConcept: result.concept });
    this.props.tracking.trackEvent({
      action: 'STUDENT_REVIEW_CONCEPT',
      concept: result.concept,
      conceptScore: result.score,
      conceptPredictedScore: result.predictedScore,
      conceptWadayanoScore: result.wadayanoScore,
    });
  }

  // Calculate results for each concept
  conceptResults(quizAttempt) {
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
  }

  render() {
    if (this.props.quizAttemptQuery && !this.props.quizAttemptQuery.quizAttempt) {
      return <Spinner />;
    }

    if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.error) {
      return (
        <ErrorBox>
          <p>Couldn’t load quiz results. Please try again later.</p>
        </ErrorBox>
      );
    }

    const { quizAttempt } = this.props.quizAttemptQuery;

    let conceptResults;
    try {
      conceptResults = this.conceptResults(quizAttempt);
    } catch (error) {
      conceptResults = [];
      console.error(error);
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
        <PageTitle title={`wadayano | ${quizAttempt.quiz.title} Review`}/>
        {/* Title and overall results */}
        <div className="columns">
          <div className="column is-6">
            {!this.props.hideTitle && <h1 className="subtitle is-2">{quizAttempt.quiz.title}</h1>}
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
        <p className="title">Concepts in this Quiz</p>
        {/* Concept-specific result cards */}
        <div className="tile is-ancestor" style={{ flexWrap: 'wrap' }}>
          {conceptResults.map(result => (
            <div className="tile is-6 is-parent" key={result.concept}>
              <div className="tile is-child box concept-result-card">
                <p className="title">
                  <span>{result.concept}</span>
                  <span className="question-count">
                    {result.questionCount === 1
                      ? '1 Question'
                      : `${result.questionCount} Questions`}
                  </span>
                </p>
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
                    onClick={() => this.showConceptReview(result)}
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
          modalState={this.state.showReviewForConcept !== null}
          closeModal={() => this.setState({ showReviewForConcept: null })}
          title={`Concept Review: ${this.state.showReviewForConcept}`}
        >
          <span className="concept-questions-list">
            {quizAttempt.questionAttempts
              .filter(q => q.question.concept === this.state.showReviewForConcept)
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
  }
}

QuizReview.propTypes = {
  // Used in the graphQL query
  // eslint-disable-next-line react/no-unused-prop-types
  quizAttemptId: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool,
};

QuizReview.defaultProps = {
  hideTitle: false,
};

QuizReview = track(props => ({
  page: 'QuizReview',
  quizAttemptId: props.quizAttemptId,
}))(QuizReview);

const QUIZ_ATTEMPT_QUERY = gql`
  query quizAttemptQuery($id: ID!) {
    quizAttempt(id: $id) {
      ...StudentFullQuizAttempt
    }
  }
  ${fragments.studentFullQuizAttempt}
`;

export default graphql(QUIZ_ATTEMPT_QUERY, {
  name: 'quizAttemptQuery',
  options: props => {
    return { fetchPolicy: 'cache-and-network', variables: { id: props.quizAttemptId } };
  },
})(QuizReview);
