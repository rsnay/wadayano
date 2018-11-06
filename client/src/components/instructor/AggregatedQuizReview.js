import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';

import { formatScore, confidenceAnalysis, wadayanoScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import Logo from '../../logo_boxed.svg';

import QuestionReview from '../student/QuestionReview';
import Modal from '../shared/Modal';

import { CONFIDENCES } from '../../constants';
import ConfidenceBarGraph from './ConfidenceBarGraph';
import ScoresBarGraph from './ScoresBarGraph';

class AggregatedQuizReview extends Component {

    constructor(props) {
        super(props);
    
        this.state = {
            isLoading: true,
            error: null,
            scores: null,
            averageScore: null,
            wadayanoScores: null,
            averageWadayanoScore: null,
            confidenceAnalysisCounts: null,
            conceptAverageScores: null,
            conceptAverageWadayanoScores: null
        };
    
        // Pre-bind this function, to make adding it to input fields easier
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        if (nextProps.quizQuery && !nextProps.quizQuery.loading && !nextProps.quizQuery.error) {
            // Prepare data for the review
            const quiz = nextProps.quizQuery.quiz;
            const concepts = Array.from(new Set(quiz.questions.map(q => q.concept)));

            // Get highest completed quiz attempt for each student
            let studentHighestAttempts = new Map();
            quiz.quizAttempts.forEach(attempt => {
                if (attempt.completed) {
                    const studentId = attempt.student.id;
                    // Add to map if new student, of replace student’s lower attempt
                    if (studentHighestAttempts.get(studentId) === undefined || studentHighestAttempts.get(studentId).score < attempt.score) {
                        studentHighestAttempts.set(studentId, attempt);
                    }
                }
            });

            const studentCount = studentHighestAttempts.size;
            // Make sure we have student data to display
            if (studentCount === 0) {
                this.setState({ error: 'No students have taken this quiz.' });
                return;
            }

            // Set up objects to hold data
            let scores = [];
            let averageScore = 0;

            let wadayanoScores = [];
            let averageWadayanoScore = 0;

            let confidenceAnalysisCounts = {
                [CONFIDENCES.OVERCONFIDENT.key]: 0,
                [CONFIDENCES.ACCURATE.key]: 0,
                [CONFIDENCES.UNDERCONFIDENT.key]: 0,
                [CONFIDENCES.MIXED.key]: 0
            }

            // ConceptName -> Array of (wadayano) scores
            let conceptScores = new Map(concepts.map(c => [c, [] ]));
            let conceptWadayanoScores = new Map(concepts.map(c => [c, [] ]));
            // ConceptName -> average (wadayano) score
            let conceptAverageScores = new Map(concepts.map(c => [c, 0]));
            let conceptAverageWadayanoScores = new Map(concepts.map(c => [c, 0]));

            // Go through highest attempt for each student
            studentHighestAttempts.forEach((attempt) => {
                // Overall score, wadayano score, and confidence analysis
                const attemptWadayanoScore = wadayanoScore(attempt);
                const attemptConfidenceAnalysis = confidenceAnalysis(attempt);

                scores.push(attempt.score);
                averageScore += attempt.score;

                wadayanoScores.push(attemptWadayanoScore);
                averageWadayanoScore += attemptWadayanoScore;

                // Increase counter for this confidence analysis type
                confidenceAnalysisCounts[attemptConfidenceAnalysis.key]++;
                
                // Concept-level score and wadayano score
                concepts.forEach(concept => {
                    const conceptQuestionAttempts = attempt.questionAttempts.filter(questionAttempt => questionAttempt.question.concept === concept);

                    const conceptScore = conceptQuestionAttempts.filter(questionAttempt => questionAttempt.isCorrect).length / conceptQuestionAttempts.length;
                    (conceptScores.get(concept)).push(conceptScore);

                    const conceptWadayanoScore = conceptQuestionAttempts.filter(questionAttempt => questionAttempt.isConfident === questionAttempt.isCorrect).length / conceptQuestionAttempts.length;
                    (conceptWadayanoScores.get(concept)).push(conceptWadayanoScore);
                })
            });

            // Find average overall score and Wadayano Score
            averageScore /= studentCount;
            averageWadayanoScore /= studentCount;

            // Find average concept-level score and Wadayano Score
            concepts.forEach(concept => {
                let conceptAverageScore = 0;
                let conceptAverageWadayanoScore = 0;

                (conceptScores.get(concept)).forEach(score => conceptAverageScore += score );
                (conceptWadayanoScores.get(concept)).forEach(score => conceptAverageWadayanoScore += score );

                conceptAverageScore /= studentCount;
                conceptAverageWadayanoScore /= studentCount;

                conceptAverageScores.set(concept, conceptAverageScore);
                conceptAverageWadayanoScores.set(concept, conceptAverageWadayanoScore);
            });

            console.log(scores, wadayanoScores, confidenceAnalysisCounts);

            this.setState({
                isLoading: false,
                scores,
                averageScore,
                wadayanoScores,
                averageWadayanoScore,
                confidenceAnalysisCounts,
                conceptAverageScores,
                conceptAverageWadayanoScores
            });
        }
    }

    render() {

        if (this.state.error || (this.props.quizQuery && this.props.quizQuery.error)) {
            return <ErrorBox>Couldn’t load quiz</ErrorBox>;
        }

        if (this.state.isLoading || (this.props.quizQuery && this.props.quizQuery.loading)) {
            return <LoadingBox />;
        }

        // Quiz object from database
        const quiz = this.props.quizQuery.quiz;

        console.log(quiz);

        // Get all unique concepts in the quiz
        const concepts = Array.from(new Set(quiz.questions.map(q => q.concept)));
        console.log(concepts);

        const { scores, averageScore, averageWadayanoScore, confidenceAnalysisCounts, conceptAverageScores, conceptAverageWadayanoScores } = this.state;

        const averageScoreLabel = (score) => (
            <React.Fragment>
                <span className="icon is-medium is-pulled-left has-text-primary">
                    <i className="fas fa-2x fa-chart-bar"></i>
                </span>
                <h4 className="subtitle is-inline-block" style={{padding: "0.3rem 0 0 1rem"}}>
                    Average Score: {formatScore(score)}
                </h4>
            </React.Fragment>
        );

        const averageWadayanoScoreLabel = (score) => (
            <React.Fragment>
                <img className="wadayano-list" src={Logo} alt="wadayano logo" style={{height: "2rem"}} />
                <h4 className="subtitle is-inline-block" style={{padding: "0.3rem 0 0 1rem"}}>
                    Average Wadayano Score: {formatScore(score)}
                </h4>
            </React.Fragment>
        );

        return (
            <div>
                <div className="columns is-desktop">
                    <div className="column">
                        <div className="box" style={{height: "280px"}}>
                            {averageScoreLabel(averageScore)}
                            <br />
                            <ScoresBarGraph scores={scores} />
                        </div>
                    </div>
                    <div className="column">
                        <div className="box" style={{height: "280px"}}>
                            {averageWadayanoScoreLabel(averageWadayanoScore)}
                            <br />
                            <ConfidenceBarGraph
                                overconfident={confidenceAnalysisCounts.OVERCONFIDENT}
                                accurate={confidenceAnalysisCounts.ACCURATE}
                                underconfident={confidenceAnalysisCounts.UNDERCONFIDENT}
                                mixed={confidenceAnalysisCounts.MIXED}
                                />
                        </div>
                    </div>
                </div>

                <h3 className="title">Concepts</h3>

                <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>
                    {concepts.map(concept => {
                        const questionCount = quiz.questions.filter(q => q.concept === concept).length;
                        return (
                            <div className="tile is-6 is-parent" key={concept}>
                                <div className="tile is-child box">
                                    <p className="title">
                                        <span>{concept}</span>
                                        <span className="question-count">{questionCount === 1 ? '1 Question' : questionCount + ' Questions'}</span>
                                    </p>
                                    {averageScoreLabel(conceptAverageScores.get(concept))}
                                    <br style={{clear: "both"}} />
                                    {averageWadayanoScoreLabel(conceptAverageWadayanoScores.get(concept))}
                                    {/*<footer className="">
                                        <button className="button is-primary is-block" style={{width: "100%"}} onClick={() => alert('Not yet implemented')}>View Details</button>
                                    </footer>*/}
                                </div>
                            </div>
                        )
                    })}
                </div>

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
            id
            concept
            prompt
        }
        quizAttempts {
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
        }
    }
  }
`

export default withAuthCheck(compose(
    graphql(QUIZ_QUERY, {
      name: 'quizQuery',
      options: (props) => {
        console.log(props);
        return { variables: { id: props.quizId } }
      }
    }),
  )(AggregatedQuizReview), { instructor: true });