import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import { formatScore, wadayanoScore, confidenceAnalysis, predictedScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import QuestionReview from './QuestionReview';
import Modal from '../shared/Modal';

import WadayanoScore from '../shared/WadayanoScore';
import fragments from '../../fragments';

class QuizReview extends Component {

    constructor(props) {
        super(props);
        this.state = {
            showReviewForConcept: null,
        };
    }

    // Calculate results for each concept
    conceptResults(quizAttempt){
        // Get concepts from all attempted questions in the quiz
        const quizConcepts = Array.from(new Set(quizAttempt.questionAttempts.map(q => q.question.concept)));

        let conceptResults = quizConcepts.map((concept) => {
            const conceptQuestions = quizAttempt.questionAttempts.filter(questionAttempt => questionAttempt.question.concept === concept);

            // Package up information about this concept
            let result = {};
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
        if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.loading) {
            return <LoadingBox />;
        }

        if (this.props.quizAttemptQuery && this.props.quizAttemptQuery.error) {
            return <ErrorBox><p>Couldn’t load quiz results. Please try again later.</p></ErrorBox>;
        }

        const quizAttempt = this.props.quizAttemptQuery.quizAttempt;

        let conceptResults;
        try {
            conceptResults = this.conceptResults(quizAttempt);
        } catch (error) {
            conceptResults = [];
            console.error(error);
            ButterToast.raise({
                content: <ToastTemplate content="There was an error generating the full report for this quiz. This may occur if the quiz has been modified by the instructor. Please contact us if this problem persists." className="is-danger" />
            });
        }

        return (
            <div className="quiz-review-container">
                {/* Title and overall results */}
                <div className="columns">
                    <div className="column is-6">
                    <h2 className="subtitle is-2">{quizAttempt.quiz.title}</h2>
                        <h2 className="subtitle is-2">
                            Score: {formatScore(quizAttempt.score)}&nbsp;
                            <span className="has-text-weight-light">
                                ({formatScore(predictedScore(quizAttempt))} Predicted)
                            </span>
                        </h2>
                        <WadayanoScore score={wadayanoScore(quizAttempt)} confidenceText={confidenceAnalysis(quizAttempt).text} />
                    </div>
                </div>
                {/* Concept-specific result cards */}
                <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
                {conceptResults.map(result => 
                    <div className="tile is-6 is-parent" key={result.concept}>
                        <div className="tile is-child box">
                            <p className="title">
                                <span>{result.concept}</span>
                                <span className="question-count">
                                    {result.questionCount === 1 ? '1 Question' : result.questionCount + ' Questions'}
                                </span>
                            </p>
                            <p className="title">
                                Score: {formatScore(result.score)} <span className="has-text-weight-light">({formatScore(result.predictedScore)} Predicted)</span>
                            </p>
                            <WadayanoScore score={result.wadayanoScore} confidenceText={result.confidenceAnalysis.text} />
                            <footer className="">
                                <button
                                className="button is-primary is-block"
                                style={{width: "100%"}}
                                onClick = {() => this.setState({ showReviewForConcept: result.concept })}>
                                    View Details
                                </button>
                            </footer>
                        </div>
                    </div>
                )}
                </div>

                {/* Concept-specific review modal */}
                <Modal
                    modalState={this.state.showReviewForConcept !== null}
                    closeModal={() => this.setState({ showReviewForConcept: null })}
                    title={"Concept Review: " + this.state.showReviewForConcept}>
                    <span className="concept-questions-list">
                        {quizAttempt.questionAttempts
                            .filter(q => q.question.concept === this.state.showReviewForConcept)
                            .map(conceptQuestion => (
                            <div className="question-review" key={conceptQuestion.id}>
                                <QuestionReview questionAttempt={conceptQuestion} question={conceptQuestion.question} />
                                <hr />
                            </div>
                        ))}
                    </span>
                </Modal>
            </div>)
    }
}

QuizReview.propTypes = {
    quizAttemptId: PropTypes.string.isRequired
};

const QUIZ_ATTEMPT_QUERY = gql`
  query quizAttemptQuery($id: ID!) {
    quizAttempt(id: $id) {
        ...StudentFullQuizAttempt
    }
  }
  ${fragments.studentFullQuizAttempt}
`

export default withAuthCheck(compose(
    graphql(QUIZ_ATTEMPT_QUERY, {
      name: 'quizAttemptQuery',
      options: (props) => {
        return { variables: { id: props.quizAttemptId } }
      }
    }),
  )(QuizReview), { student: true, instructor: true });
