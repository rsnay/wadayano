import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import Modal from '../shared/Modal';
import Breadcrumbs from '../shared/Breadcrumbs';

import { formatScore, predictedScore, wadayanoScore, confidenceAnalysis, stringCompare } from '../../utils';
import { QUIZ_TYPE_NAMES } from '../../constants';
import QuizReview from '../student/QuizReview';
import AggregatedQuizReview from './AggregatedQuizReview';

/**
 * Displays an <AggregatedQuizReview /> component and a table of all students in the course,
 * with the scores of their *first* attempt of this quiz.
 */
class QuizScores extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            sortColumn: 'name',
            sortAscending: true,
            studentScores: [],
            currentStudentReview: null
        };
        this.sortByColumn = this.sortByColumn.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        if (nextProps.quizQuery && !nextProps.quizQuery.loading && !nextProps.quizQuery.error) {

            // Prepare data for the sortable table
            const quiz = nextProps.quizQuery.quiz;
            const course = quiz.course;

            let studentScores = course.students.map(student => {
                // Determine if student took this quiz
                let chosenAttempt = null;
                const studentAttempts = quiz.quizAttempts.filter(a => a.student.id === student.id && a.completed);
                // Base calculations on first attempt
                if (studentAttempts.length > 0) {
                    chosenAttempt = studentAttempts[0];
                }
                // Output score for each student, if quiz was taken
                if (chosenAttempt !== null) {
                    const attemptPredictedScore = predictedScore(chosenAttempt);
                    const attemptWadayanoScore = wadayanoScore(chosenAttempt);
                    const attemptConfidenceAnalysis = confidenceAnalysis(chosenAttempt);
                    return {
                        id: student.id,
                        name: student.name,
                        attempts: studentAttempts.length,
                        highestScore: chosenAttempt.score,
                        chosenAttempt,
                        predictedScore: attemptPredictedScore,
                        wadayanoScore: attemptWadayanoScore,
                        confidenceAnalysis: attemptConfidenceAnalysis
                    }
                } else {
                    return {
                        id: student.id,
                        name: student.name,
                        attempts: 0,
                        highestScore: "",
                        chosenAttempt: null,
                        wadayanoScore: "",
                        confidenceAnalysis: { text: '0' }
                    }
                }
            })

            // Sort scores according to selected column
            studentScores.sort(sortFunctions['name']);

            this.setState({ isLoading: false, studentScores });
        }
    }

    sortByColumn(e) {
        // Get data-column prop from header that was clicked
        const newSortColumn = e.target.dataset.column;
        let { sortAscending, studentScores } = this.state;
        
        // Check if we're toggling sort direction
        if (this.state.sortColumn === newSortColumn) {
            sortAscending = !sortAscending;
        }

        // Sort data
        studentScores = studentScores.sort(sortFunctions[newSortColumn]);
        if (!sortAscending) {
            studentScores.reverse();
        }

        // Update state
        this.setState({ sortColumn: newSortColumn, sortAscending, studentScores });
    }

    showStudentAttempts(student) {
        const quiz = this.props.quizQuery.quiz;
        const attempts = quiz.quizAttempts.filter(a => a.student.id === student.id && a.completed);
        this.setState({ currentStudentReview: student , currentQuizAttempts: attempts , chosenAttempt: student.chosenAttempt});
    }

    render() {

        if (this.props.quizQuery && this.props.quizQuery.error) {
            return <ErrorBox><p>Couldn’t load quiz scores.</p></ErrorBox>;
        }

        if (this.state.isLoading || (this.props.quizQuery && this.props.quizQuery.loading)) {
            return <LoadingBox />;
        }
    
        const quiz = this.props.quizQuery.quiz;
        const course = quiz.course;

        let scoresTable;
        if (this.state.studentScores.length === 0) {
            scoresTable = (<p className="notification is-light">There are no students enrolled in this course. When a student launches a quiz from the course’s LMS, he/she will be automatically enrolled.</p>);
        } else {
            const columns = [
                { title: 'Student Name', columnId: 'name', sortable: true },
                { title: 'Attempts', columnId: 'attempts', sortable: true },
                { title: 'First Attempt', columnId: 'highestScore', sortable: true },
                { title: 'Predicted Score', columnId: 'predictedScore', sortable: true },
                { title: 'Wadayano Score', columnId: 'wadayanoScore', sortable: true },
                { title: 'Confidence Analysis', columnId: 'confidenceAnalysis', sortable: true },
                { title: 'View Report', columnId: 'viewReport', sortable: false }
            ];
            scoresTable = (
                <div className="table-wrapper">
                    <table className="table is-striped is-fullwidth survey-results-table">
                        <thead>
                            <tr className="sticky-header sortable-header">
                                {columns.map(col => (
                                    <th key={col.columnId} className={(this.state.sortColumn === col.columnId) ? "has-background-light" : ""} data-column={col.columnId} onClick={col.sortable ? this.sortByColumn : () => {}}>
                                        {col.title}
                                        {(this.state.sortColumn === col.columnId) && (
                                            <span className="icon" style={{width:0, float: 'right'}}><i className="fas fa-sort"></i></span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {this.state.studentScores.map(student => {
                                // Output score for each student, if quiz was taken
                                return (<tr key={student.id}>
                                    <td style={{whiteSpace: "nowrap"}}>{student.name}</td>
                                    {(student.attempts > 0) ? 
                                        <React.Fragment>
                                            <td>{student.attempts}</td>
                                            <td>{formatScore(student.highestScore)}</td>
                                            <td>{formatScore(student.predictedScore)}</td>
                                            <td>{formatScore(student.wadayanoScore)}</td>
                                            <td>{student.confidenceAnalysis.emoji}&nbsp;{student.confidenceAnalysis.text}</td>
                                            <td>
                                                <button className="button is-light"
                                                    onClick={() => this.showStudentAttempts(student)}>
                                                    <span className="icon">
                                                    <i className="fas fa-history"></i>
                                                    </span>
                                                    <span>View Report</span>
                                                </button>
                                            </td>
                                        </React.Fragment>
                                    : <td colSpan="6"><i>Quiz not taken</i></td>
                                    }
                                </tr>);
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }

        return (
            <div>
                <section className="section">
                    <div className="container">

                        <Breadcrumbs links={[
                            { to: "/instructor/courses", title: "Course List" },
                            { to: "/instructor/course/" + course.id, title: course.title },
                            { to: "/instructor/quiz/" + quiz.id, title: quiz.title },
                            { to: "/instructor/quiz/" + quiz.id + "/score", title: "View Scores", active: true }
                        ]} />

                        <h3 className="title is-3">{quiz.title}</h3>
                        <h4 className="subtitle is-4">{QUIZ_TYPE_NAMES[quiz.type]} Quiz</h4>
                    </div>
                </section>

                <div className="content" style={{margin: "0 5% 2rem 5%"}}>

                    <AggregatedQuizReview quizId={quiz.id} />

                    <h3 className="title">Students</h3>
                    {scoresTable}

                    {this.state.currentStudentReview && (
                        <Modal
                            modalState={true}
                            closeModal={() => this.setState({ currentStudentReview: null , currentQuizAttempts: null})}
                            title={`Attempts from ${this.state.currentStudentReview.name}`}
                            cardClassName="quiz-scores-report-modal"
                        >
                            <div className="tabs quiz-attempt-selector">
                                <ul>
                                    {this.state.currentQuizAttempts.map((attempt,index) => 
                                        <li className={(this.state.chosenAttempt.id === attempt.id ? "is-active" : "")} key={index}>
                                            <a href={"#" + attempt.id} onClick={(e) => { this.setState({ chosenAttempt: attempt}); e.preventDefault(); }}>Attempt {index + 1} ({formatScore(attempt.score, 0)})</a>
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <QuizReview
                                hideTitle={true}
                                quizAttemptId={this.state.chosenAttempt.id}
                            />
                        </Modal>
                    )}

                    <hr />
                    <Link className="button" to={"/instructor/course/" + course.id}>Return to Course</Link>
                </div>
                <br />
            </div>
        );
    }
}

// How to weight the confidence analysis labels for sorting
const confidenceAnalysisWeights = {
    // '0' denotes quiz not taken
    '0': 0,
    'Mixed': 1,
    'Underconfident': 2,
    'Accurate': 3,
    'Overconfident': 4
};

// Functions to define sorting on the various columns
const sortFunctions = {
    name: (a, b) => stringCompare(a.name, b.name),
    attempts: (a, b) => a.attempts - b.attempts,
    highestScore: (a, b) => a.highestScore - b.highestScore,
    predictedScore: (a, b) => a.predictedScore - b.predictedScore,
    wadayanoScore: (a, b) => a.wadayanoScore - b.wadayanoScore,
    confidenceAnalysis: (a, b) => confidenceAnalysisWeights[a.confidenceAnalysis.text] - confidenceAnalysisWeights[b.confidenceAnalysis.text],
};

// Get the quiz and attempts
const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id:$id){
        id
        title
        type
        course {
            id
            title
            students {
                id
                name
            }
        }
        quizAttempts(where:{completed_not:null}) {
            id
            student {
                id
            }
            createdAt
            completed
            score
            questionAttempts {
                id
                isCorrect
                isConfident
            }
            conceptConfidences {
                id
                confidence
            }
        }
    }
  }
`;

export default withAuthCheck(compose(
    graphql(QUIZ_QUERY, {name: 'quizQuery',
        options: (props) => {
            return { variables: { id:props.match.params.quizId } }
        }
    }),
) (QuizScores), { instructor: true });
