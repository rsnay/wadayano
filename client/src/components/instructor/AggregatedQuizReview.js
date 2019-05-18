import React, { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { formatScore, confidenceAnalysis, predictedScore, wadayanoScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import Logo from '../../logo_boxed.svg';

import AggregatedQuestionReview from './AggregatedQuestionReview';
import Modal from '../shared/Modal';

import { CONFIDENCES } from '../../constants';
import ConfidenceBarGraph from './ConfidenceBarGraph';
import ScoresBarGraph from './ScoresBarGraph';
import fragments from '../../fragments';

class AggregatedQuizReview extends Component {

    constructor(props) {
        super(props);
    
        this.state = {
            isLoading: true,
            error: null,
            scores: null,
            averageScore: null,
            predictedScores: null,
            averagePredictedScore: null,
            wadayanoScores: null,
            averageWadayanoScore: null,
            confidenceAnalysisCounts: null,
            conceptAverageScores: null,
            conceptAveragePredictedScores: null,
            conceptAverageWadayanoScores: null,
            showConceptModal: null
        };
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        // Rather than check if query is ‘loading,’ check if it doesn’t have data, since
        // the cache-and-network fetch policy is used, which returns data from cache but
        // still sets loading=true while it re-fetches
        if (nextProps.quizQuery && !nextProps.quizQuery.error && nextProps.quizQuery.quiz) {
            try {
                this.processData(nextProps);
            } catch (error) {
                console.error(error);
                ButterToast.raise({
                    content: <ToastTemplate content="There was an error generating the aggregated report for this quiz. Please contact us if this problem persists." className="is-danger" />
                });
            }
        }
    }

    // Processes all the quiz attempt data. Wrapped in this function for easier error catching
    processData(nextProps) {
        // Prepare data for the review
        const quiz = nextProps.quizQuery.quiz;
        const concepts = Array.from(new Set(quiz.questions.map(q => q.concept)));

        // Get first completed quiz attempt for each student (query only returns completed attempts)
        let studentFirstAttempts = new Map();
        quiz.quizAttempts.forEach(attempt => {
            if (attempt.completed) {
                const studentId = attempt.student.id;
                // Add to map if no completed attempt for student already
                if (studentFirstAttempts.get(studentId) === undefined) {
                    studentFirstAttempts.set(studentId, attempt);
                }
            }
        });

        const studentCount = studentFirstAttempts.size;
        // Make sure we have student data to display
        if (studentCount === 0) {
            this.setState({ error: 'No students have taken this quiz.' });
            return;
        }

        // Set up objects to hold data
        let scores = [];
        let averageScore = 0;

        let predictedScores = [];
        let averagePredictedScore = 0;

        let wadayanoScores = [];
        let averageWadayanoScore = 0;

        let confidenceAnalysisCounts = {
            [CONFIDENCES.OVERCONFIDENT.key]: 0,
            [CONFIDENCES.ACCURATE.key]: 0,
            [CONFIDENCES.UNDERCONFIDENT.key]: 0,
            [CONFIDENCES.MIXED.key]: 0
        }

        // ConceptName -> Array of (wadayano) scores
        // (Weird `concepts.map(c => [c, [] ])` syntax just initializes it to map each concept name to an empty array)
        let conceptScores = new Map(concepts.map(c => [c, [] ]));
        let conceptPredictedScores = new Map(concepts.map(c => [c, [] ]));
        let conceptWadayanoScores = new Map(concepts.map(c => [c, [] ]));
        // ConceptName -> average (wadayano) score
        let conceptAverageScores = new Map(concepts.map(c => [c, 0]));
        let conceptAveragePredictedScores = new Map(concepts.map(c => [c, 0]));
        let conceptAverageWadayanoScores = new Map(concepts.map(c => [c, 0]));

        // Go through first attempt for each student
        studentFirstAttempts.forEach((attempt) => {
            // Overall score, wadayano score, and confidence analysis
            const attemptPredictedScore = predictedScore(attempt);
            const attemptWadayanoScore = wadayanoScore(attempt);
            const attemptConfidenceAnalysis = confidenceAnalysis(attempt);

            scores.push(attempt.score);
            averageScore += attempt.score;

            predictedScores.push(attemptPredictedScore);
            averagePredictedScore += attemptPredictedScore;

            wadayanoScores.push(attemptWadayanoScore);
            averageWadayanoScore += attemptWadayanoScore;

            // Increase counter for this confidence analysis type
            confidenceAnalysisCounts[attemptConfidenceAnalysis.key]++;
            
            try {
                // Concept-level score and wadayano score
                concepts.forEach(concept => {
                    const conceptQuestionAttempts = attempt.questionAttempts.filter(questionAttempt => questionAttempt.question.concept === concept);

                    const conceptScore = conceptQuestionAttempts.filter(questionAttempt => questionAttempt.isCorrect).length / conceptQuestionAttempts.length;
                    (conceptScores.get(concept)).push(conceptScore);

                    const conceptConfidence = attempt.conceptConfidences.find(cc => cc.concept === concept);
                    const conceptPredictedScore = conceptConfidence.confidence / conceptQuestionAttempts.length;
                    (conceptPredictedScores.get(concept)).push(conceptPredictedScore);

                    const conceptWadayanoScore = conceptQuestionAttempts.filter(questionAttempt => questionAttempt.isConfident === questionAttempt.isCorrect).length / conceptQuestionAttempts.length;
                    (conceptWadayanoScores.get(concept)).push(conceptWadayanoScore);
                });
            } catch (error) {
                // An error might occur if changes to concepts occurred in the quiz after some students took it
                // Just swallow these errors for now
                console.log(error);
            }
        });

        // Find average overall score and Wadayano Score
        averageScore /= studentCount;
        averagePredictedScore /= studentCount;
        averageWadayanoScore /= studentCount;

        // Find average concept-level score, predicted score, and Wadayano Score
        concepts.forEach(concept => {
            let conceptAverageScore = 0;
            let conceptAveragePredictedScore = 0;
            let conceptAverageWadayanoScore = 0;

            (conceptScores.get(concept)).forEach(score => conceptAverageScore += score );
            (conceptPredictedScores.get(concept)).forEach(score => conceptAveragePredictedScore += score );
            (conceptWadayanoScores.get(concept)).forEach(score => conceptAverageWadayanoScore += score );

            conceptAverageScore /= studentCount;
            conceptAveragePredictedScore /= studentCount;
            conceptAverageWadayanoScore /= studentCount;

            conceptAverageScores.set(concept, conceptAverageScore);
            conceptAveragePredictedScores.set(concept, conceptAveragePredictedScore);
            conceptAverageWadayanoScores.set(concept, conceptAverageWadayanoScore);
        });

        // console.log(scores, wadayanoScores, confidenceAnalysisCounts);

        this.setState({
            isLoading: false,
            scores,
            averageScore,
            predictedScores,
            averagePredictedScore,
            wadayanoScores,
            averageWadayanoScore,
            confidenceAnalysisCounts,
            conceptAverageScores,
            conceptAveragePredictedScores,
            conceptAverageWadayanoScores
        });
    }

    render() {

        if (this.state.error || (this.props.quizQuery && this.props.quizQuery.error)) {
            return <ErrorBox><p>Couldn’t load quiz report. {this.state.error}</p></ErrorBox>;
        }

        if (this.state.isLoading || (this.props.quizQuery && !this.props.quizQuery.quiz)) {
            return <LoadingBox />;
        }

        // Quiz object from database
        const quiz = this.props.quizQuery.quiz;

        // Get all unique concepts in the quiz
        const concepts = Array.from(new Set(quiz.questions.map(q => q.concept)));

        const { scores, averageScore, predictedScores, averagePredictedScore, averageWadayanoScore, confidenceAnalysisCounts, conceptAverageScores, conceptAveragePredictedScores, conceptAverageWadayanoScores } = this.state;

        const averageWadayanoScoreLabel = (score) => (
            <div className="is-flex aggregated-score-label">
                <img src={Logo} alt="wadayano logo" style={{height: "2rem"}} />
                <h4 className="subtitle is-flex flex-1">
                    Average Wadayano Score
                </h4>
                <h4 className="subtitle is-flex">
                    {formatScore(score, 0)}
                </h4>
            </div>
        );

        const barGraphLegend = (averageScore, averagePredictedScore) => (
            <div className="is-flex-desktop scores-bar-graph-legend">
                <h4 className="subtitle is-flex flex-1">
                    <span className="has-text-warning">■&nbsp;&nbsp;</span>
                    Predicted ({formatScore(averagePredictedScore, 0)}&nbsp;average)
                </h4>
                <h4 className="subtitle is-flex flex-1">
                    <span className="has-text-info">■&nbsp;&nbsp;</span>
                    Score ({formatScore(averageScore, 0)}&nbsp;average)
                </h4>
            </div>
        );

        return (
            <div>
                <div className="columns is-desktop">
                    <div className="column">
                        <div className="box" style={{minHeight: "315px"}}>
                            {barGraphLegend(averageScore, averagePredictedScore)}
                            <ScoresBarGraph scoreSeries={[predictedScores, scores]} />
                        </div>
                    </div>
                    <div className="column">
                        <div className="box" style={{minHeight: "315px"}}>
                            {averageWadayanoScoreLabel(averageWadayanoScore)}
                            <ConfidenceBarGraph
                                overconfident={confidenceAnalysisCounts.OVERCONFIDENT}
                                accurate={confidenceAnalysisCounts.ACCURATE}
                                underconfident={confidenceAnalysisCounts.UNDERCONFIDENT}
                                mixed={confidenceAnalysisCounts.MIXED}
                                />
                        </div>
                    </div>
                </div>
                <div className="box">
                    <h3 className="title">Concepts</h3>
                    <div className="table-wrapper">
                        <table className="table is-striped is-hoverable is-fullwidth is-vcentered">
                            <thead>
                                <tr>
                                    <th>Concept</th>
                                    <th>Average Score</th>
                                    <th>Average Predicted Score</th>
                                    <th>Average Wadayano Score</th>
                                    <th>View Questions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {concepts.map(concept => { return (
                                    <tr key={concept} className="has-cursor-pointer" onClick={() => this.setState({ showConceptModal: concept })}>
                                        <td>{concept}</td>
                                        <td>{formatScore(conceptAverageScores.get(concept), 0)}</td>
                                        <td>{formatScore(conceptAveragePredictedScores.get(concept),0)}</td>
                                        <td>{formatScore(conceptAverageWadayanoScores.get(concept),0)}</td>
                                        <td><button className="button is-light" onClick={() => this.setState({ showConceptModal: concept })}>View Questions</button></td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>

                <Modal
                    modalState={this.state.showConceptModal !== null}
                    closeModal={() => this.setState({ showConceptModal: null })}
                    title={"Concept Review: " + this.state.showConceptModal}>
                        {quiz.questions.filter(q => q.concept === this.state.showConceptModal).map(conceptQuestion => (
                            <AggregatedQuestionReview key={conceptQuestion.id} question={conceptQuestion} quizId={quiz.id} courseId={quiz.course.id} />
                        ))}
                        <br/>
                </Modal>
            </div>
        );
    }
}

AggregatedQuizReview.propTypes = {
    quizId: PropTypes.string.isRequired
};

// Get the quiz and attempts
export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id){
        id
        title
        type
        course{
            id
            title
            students {
                id
                name
            }
        }
        questions {
            ...InstructorFullQuestion
        }
        quizAttempts(where:{completed_not:null}) {
            id
            student {
                id
                name
            }
            createdAt
            completed
            score
            questionAttempts {
                id
                isCorrect
                isConfident
                question {
                    id
                    concept
                }
            }
            conceptConfidences {
                id
                concept
                confidence
            }
        }
    }
  }
  ${fragments.instructorFullQuestion}
`

export default graphql(QUIZ_QUERY, {
    name: 'quizQuery',
    options: (props) => {
    return { fetchPolicy: 'cache-and-network', variables: { id: props.quizId } }
    }
})(AggregatedQuizReview);
