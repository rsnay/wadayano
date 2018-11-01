import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { withAuthCheck } from '../shared/AuthCheck';

import { formatScore, confidenceAnalysis, wadayanoScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

import Logo from '../../logo_boxed.svg';

import ConfidenceBarGraph from './ConfidenceBarGraph';
import QuestionReview from '../student/QuestionReview';
import Modal from '../shared/Modal';

import WadayanoScore from '../shared/WadayanoScore';
import { CONFIDENCES } from '../../constants';
import ScoresBarGraph from './ScoresBarGraph';

class AggregatedQuizReview extends Component {

    constructor(props) {
        super(props);
    
        this.state = {
            isLoading: true,
            scores: null,
            lowScore: null,
            averageScore: null,
            highScore: null,
            wadayanoScores: null,
            averageWadayanoScore: null,
            confidenceAnalysisCounts: null
        };
    
        // Pre-bind this function, to make adding it to input fields easier
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        if (nextProps.quizQuery && !nextProps.quizQuery.loading && !nextProps.quizQuery.error) {

            // Prepare data for the review
            const quiz = nextProps.quizQuery.quiz;
            const course = quiz.course;

            // Get highest completed quiz attempt for each student, and calculate wadayano score
            let studentScores = new Map();
            quiz.quizAttempts.forEach(attempt => {
                if (attempt.completed) {
                    const studentId = attempt.student.id;
                    // Save score, wadayano score, and confidence analysis for this student if not already in the Map, or if previously-saved score is lower (if this is slow in the future, only calculate wadayano and confidence after we’ve found the highest)
                    if (studentScores.get(studentId) === undefined || studentScores.get(studentId).score < attempt.score) {
                        studentScores.set(studentId, {
                            score: attempt.score,
                            wadayanoScore: wadayanoScore(attempt),
                            confidenceAnalysis: confidenceAnalysis(attempt)
                        });
                    }
                }
            });

            // Calculate average score and wadayano score
            let scores = [];
            let lowScore = 2; // Start higher than possible low
            let averageScore = 0;
            let highScore = -1; // Start lower than possible high

            let wadayanoScores = [];
            let averageWadayanoScore = 0;

            let confidenceAnalysisCounts = {
                [CONFIDENCES.OVERCONFIDENT.key]: 0,
                [CONFIDENCES.ACCURATE.key]: 0,
                [CONFIDENCES.UNDERCONFIDENT.key]: 0,
                [CONFIDENCES.MIXED.key]: 0
            }

            const studentCount = studentScores.size;
            if (studentCount > 0) {
                studentScores.forEach(({ score, wadayanoScore, confidenceAnalysis }) => {
                    scores.push(score);
                    averageScore += score;

                    wadayanoScores.push(wadayanoScore);
                    averageWadayanoScore += wadayanoScore;

                    // Increase counter for this confidence analysis type
                    confidenceAnalysisCounts[confidenceAnalysis.key]++;

                    if (score > highScore) {
                        highScore = score;
                    }
                    if (score < lowScore) {
                        lowScore = score;
                    }
                });
                averageScore /= studentCount;
                averageWadayanoScore /= studentCount;
            }

            console.log(scores, wadayanoScores, confidenceAnalysisCounts);

            this.setState({ isLoading: false, scores, lowScore, averageScore, highScore, wadayanoScores, averageWadayanoScore, confidenceAnalysisCounts });
        }
    }

    render() {

        if (this.props.quizQuery && this.props.quizQuery.error) {
            return <ErrorBox>Couldn’t load quiz</ErrorBox>;
        }

        if (this.state.isLoading || (this.props.quizQuery && this.props.quizQuery.loading)) {
            return <LoadingBox />;
        }

        // Contains some quiz metadata, as well as precomputed average score and average wadayano score
        const quizInfo = this.props.quizInfo;
        // Quiz object from database
        const quiz = this.props.quizQuery.quiz;

        console.log(quiz);

        // Get all unique concepts in the quiz
        const concepts = Array.from(new Set(quiz.questions.map(q => q.concept)));
        console.log(concepts);

        const { scores, confidenceAnalysisCounts } = this.state;

        return (
            <div>
                <div className="columns">
                    <div className="column">
                        <div className="box is-inline-block" style={{height: "280px"}}>
                            <span className="icon is-medium is-pulled-left has-text-primary">
                                <i className="fas fa-2x fa-chart-bar"></i>
                            </span>
                            <h4 className="subtitle is-pulled-left" style={{padding: "0.3rem 0 0 1rem"}}>
                                Average Score: {formatScore(quizInfo.averageScore)}
                            </h4>
                            <br />
                            <ScoresBarGraph scores={scores} />
                        </div>
                        <div className="box is-inline-block" style={{marginLeft: "24px", height: "280px"}}>
                            <img className="wadayano-list" src={Logo} alt="wadayano logo" style={{height: "2rem"}} />
                            <h4 className="subtitle is-pulled-left" style={{padding: "0.3rem 0 0 1rem"}}>
                                Average Wadayano Score: {formatScore(quizInfo.averageWadayanoScore)}
                            </h4>
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
                                    <p className="title">
                                        Score: {formatScore(Math.random())}
                                    </p>
                                    <WadayanoScore wadayano={Math.round(Math.random() * 100)} confidenceText={"Mixed"}/>
                                    <footer className="">
                                        <button className="button is-primary is-block" style={{width: "100%"}} onClick={() => alert('Not yet implemented')}>View Details</button>
                                    </footer>
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
    quizInfo: PropTypes.object.isRequired
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
        return { variables: { id: props.quizInfo.id } }
      }
    }),
  )(AggregatedQuizReview), { instructor: true });