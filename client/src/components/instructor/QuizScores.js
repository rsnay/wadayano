import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import { formatScore, wadayanoScore, confidenceAnalysis } from '../../utils';
import QuizReviewPage from '../student/QuizReviewPage';
import Modal from '../shared/Modal';

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
            // Use Array.from to shallow-copy, since source prop is read-only
            // const students = Array.from(course.students);

            let studentScores = course.students.map(student => {
                // Determine if student took this quiz
                let attempts = {};
                let highestAttempt = null;
                try {
                    attempts = quiz.quizAttempts.filter(a => a.student.id === student.id && a.completed)
                    attempts = attempts.concat().sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
                    // Get highest-scoring attempt for this student
                    highestAttempt = attempts[0];
                    console.log(student, attempts, highestAttempt);
                } catch (error) { }
                // Output score for each student, if quiz was taken
                if (highestAttempt) {
                    const attemptWadayanoScore = wadayanoScore(highestAttempt);
                    const attemptConfidenceAnalysis = confidenceAnalysis(highestAttempt);
                    return {
                        id: student.id,
                        name: student.name,
                        attempts: attempts.length,
                        highestScore: highestAttempt.score,
                        highestAttempt,
                        wadayanoScore: attemptWadayanoScore,
                        confidenceAnalysis: attemptConfidenceAnalysis
                    }
                } else {
                    return {
                        id: student.id,
                        name: student.name,
                        attempts: 0,
                        highestScore: "",
                        highestAttempt: null,
                        wadayanoScore: "",
                        confidenceAnalysis: null
                    }
                }
            })

            // Sort scores according to selected column
            studentScores = studentScores.sort((a, b) => a.name > b.name);

            this.setState({ isLoading: false, studentScores });
        }
    }

    sortByColumn(e) {
        // Get data-column prop from header that was clicked
        const newSortColumn = e.target.dataset.column;
        let { sortAscending, studentScores } = this.state;
        
        console.log(newSortColumn, this.state.sortColumn);
        // Check if we're toggling sort direction
        if (this.state.sortColumn === newSortColumn) {
            sortAscending = !sortAscending;
        }
        console.log(studentScores);
        // Sort data
        studentScores = studentScores.sort(sortFunctions[newSortColumn]);
        if (!sortAscending) {
            studentScores.reverse();
        }

        console.log(studentScores);
        // Update state
        this.setState({ sortColumn: newSortColumn, sortAscending, studentScores });
    }

    showAttemptReview(student) {
        this.setState({ currentStudentReview: student });
    }

    render() {

        if (this.state.isLoading || (this.props.quizQuery && this.props.quizQuery.loading)) {
            return <LoadingBox />;
        }
    
        if (this.props.quizQuery && this.props.quizQuery.error) {
            return <ErrorBox><p>Couldn’t load quiz scores.</p></ErrorBox>;
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
                { title: 'Highest Score', columnId: 'highestScore', sortable: true },
                { title: 'wadayano Score', columnId: 'wadayanoScore', sortable: true },
                { title: 'Confidence Analysis', columnId: 'confidenceAnalysis', sortable: true },
                { title: 'View Report', columnId: 'viewReport', sortable: false }
            ];
            scoresTable = (
                <div className="table-wrapper">
                    <table className="table is-striped is-fullwidth survey-results-table">
                        <thead>
                            <tr className="sticky-header sortable-header">
                                {columns.map(col => (
                                    <th key={col.columnId} data-column={col.columnId} onClick={col.sortable ? this.sortByColumn : () => {}}>
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
                                            <td>{formatScore(student.wadayanoScore)}</td>
                                            <td>{student.confidenceAnalysis.emoji}&nbsp;{student.confidenceAnalysis.text}</td>
                                            <td>
                                                <button className="button is-light"
                                                    onClick={() => this.showAttemptReview(student)}>
                                                    <span className="icon">
                                                    <i className="fas fa-history"></i>
                                                    </span>
                                                    <span>View Report</span>
                                                </button>
                                            </td>
                                        </React.Fragment>
                                    : <td colSpan="5"><i>Quiz not taken</i></td>
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

                        <nav className="breadcrumb" aria-label="breadcrumbs">
                            <ul>
                                <li><Link to="/instructor/courses">Course List</Link></li>
                                <li><Link to={"/instructor/course/" + course.id}>{course.title}</Link></li>
                                <li><Link to={"/instructor/quiz/" + quiz.id} aria-current="page">{quiz.title}</Link></li>
                                <li className="is-active"><Link to={"/instructor/quiz/" + quiz.id + "/scores"} aria-current="page">View Scores</Link></li>
                            </ul>
                        </nav>

                        <h3 className="title is-3 is-inline">Quiz Scores</h3>
                    </div>
                </section>

                {scoresTable}

                {this.state.currentStudentReview && <Modal
                    modalState={true}
                    closeModal={() => this.setState({ currentStudentReview: null })}
                    title={`Attempt from ${this.state.currentStudentReview.name}`}
                    cardClassName="quiz-scores-report-modal">
                        <QuizReviewPage hideFooter={true} match={{ params: { quizAttemptId: this.state.currentStudentReview.highestAttempt.id } }} />
                </Modal>}

                <hr />
                <div className="container" style={{paddingLeft: "1rem"}}>
                    <Link className="button" to={"/instructor/course/" + course.id}>Return to Course</Link>
                </div>
                <br />
            </div>
        );
    }
}

// Confidence analysis labels
const MIXED = 'Mixed';
const UNDER = 'Underconfident';
const ACCURATE = 'Accurate';
const OVER = 'Overconfident';

// How to weight the confidence analysis labels for sorting
const confidenceAnalysisWeights = {
    'Mixed': 1,
    'Underconfident': 2,
    'Accurate': 3,
    'Overconfident': 4
};

// Functions to define sorting on the various columns
const sortFunctions = {
    name: (a, b) => a.name > b.name,
    attempts: (a, b) => a.attempts > b.attempts,
    highestScore: (a, b) => a.highestScore > b.highestScore,
    wadayanoScore: (a, b) => a.wadayanoScore > b.wadayanoScore,
    confidenceAnalysis: (a, b) => { console.log(a.confidenceAnalysis.text , confidenceAnalysisWeights[b.confidenceAnalysis.text]); return confidenceAnalysisWeights[a.confidenceAnalysis.text] > confidenceAnalysisWeights[b.confidenceAnalysis.text]},
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
        questions{
            id
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
    graphql(QUIZ_QUERY, {name: 'quizQuery',
        options: (props) => {
            console.log(props.match.params.quizId);
            return { variables: { id:props.match.params.quizId } }
        }
    }),
) (QuizScores), { instructor: true });
