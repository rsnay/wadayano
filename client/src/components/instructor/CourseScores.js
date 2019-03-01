import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';
import { QUIZ_TYPE_NAMES } from '../../constants';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import { formatScore, predictedScore, wadayanoScore, stringCompare } from '../../utils';
import AggregatedQuizReview from './AggregatedQuizReview';
import Modal from '../shared/Modal';
import Breadcrumbs from '../shared/Breadcrumbs';

/**
 * Displays aggregated statistics for all quizzes in the course
 * Not currently used; being merged into the quizzes table in CourseDetails
 */
class CourseScores extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            sortColumn: 'title',
            sortAscending: true,
            aggregatedQuizScores: [],
            currentQuizReview: null
        };
        this.sortByColumn = this.sortByColumn.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        if (nextProps.courseQuery && !nextProps.courseQuery.loading && !nextProps.courseQuery.error) {

            // Prepare data for the sortable table
            const course = nextProps.courseQuery.course;
            // Use Array.from to shallow-copy, since source prop is read-only
            // const students = Array.from(course.students);

            let aggregatedQuizScores = course.quizzes.map(quiz => {
                // Get first completed quiz attempt for each student, and calculate wadayano score
                let studentScores = new Map();
                quiz.quizAttempts.forEach(attempt => {
                    if (attempt.completed) {
                        const studentId = attempt.student.id;
                        // Save score and wadayano score for this student if not already in the Map
                        if (studentScores.get(studentId) === undefined) {
                            studentScores.set(studentId, {
                                score: attempt.score,
                                predictedScore: predictedScore(attempt),
                                wadayanoScore: wadayanoScore(attempt)
                            });
                        }
                    }
                });

                // Calculate average scores
                let averageScore = 0;
                let averagePredictedScore = 0;
                let averageWadayanoScore = 0;

                const studentCount = studentScores.size;
                if (studentCount > 0) {
                    studentScores.forEach(({ score, predictedScore, wadayanoScore }) => {
                        averageScore += score;
                        averagePredictedScore += predictedScore;
                        averageWadayanoScore += wadayanoScore;
                    });
                    averageScore /= studentCount;
                    averagePredictedScore /= studentCount;
                    averageWadayanoScore /= studentCount;
                }

                return {
                    id: quiz.id,
                    title: quiz.title,
                    type: quiz.type,
                    studentCount,
                    averageScore,
                    averagePredictedScore,
                    averageWadayanoScore
                };
            });

            // Sort by title by default
            aggregatedQuizScores.sort(sortFunctions['title']);

            this.setState({ isLoading: false, aggregatedQuizScores });
        }
    }

    sortByColumn(e) {
        // Get data-column prop from header that was clicked
        const newSortColumn = e.target.dataset.column;
        let { sortAscending, aggregatedQuizScores } = this.state;
        
        // Check if we're toggling sort direction
        if (this.state.sortColumn === newSortColumn) {
            sortAscending = !sortAscending;
        }

        // Sort data
        aggregatedQuizScores = aggregatedQuizScores.sort(sortFunctions[newSortColumn]);
        if (!sortAscending) {
            aggregatedQuizScores.reverse();
        }

        // Update state
        this.setState({ sortColumn: newSortColumn, sortAscending, aggregatedQuizScores });
    }

    render() {
    
        if (this.props.courseQuery && this.props.courseQuery.error) {
            return <ErrorBox><p>Couldn’t load quizzes for this course.</p></ErrorBox>;
        }

        if (this.state.isLoading || (this.props.courseQuery && this.props.courseQuery.loading)) {
            return <LoadingBox />;
        }

        const course = this.props.courseQuery.course;

        let scoresTable;
        if (this.state.aggregatedQuizScores.length === 0) {
            scoresTable = (<p className="notification is-light">There are no quizzes in this course.</p>);
        } else {
            const columns = [
                { title: 'Quiz Title', columnId: 'title', sortable: true },
                { title: 'Type', columnId: 'type', sortable: true },
                { title: 'Number of Students', columnId: 'studentCount', sortable: true },
                { title: 'Average Score', columnId: 'averageScore', sortable: true },
                { title: 'Average Predicted Score', columnId: 'averagePredictedScore', sortable: true },
                { title: 'Average Wadayano Score', columnId: 'averageWadayanoScore', sortable: true },
                { title: 'Aggregated Report', columnId: 'id', sortable: false }
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
                            {this.state.aggregatedQuizScores.map(quiz => {
                                // Output row for each quiz
                                return (<tr key={quiz.id}>
                                    <td style={{whiteSpace: "nowrap"}}>{quiz.title}</td>
                                    <td>{QUIZ_TYPE_NAMES[quiz.type]}</td>
                                    {(quiz.studentCount > 0) ? 
                                        <React.Fragment>
                                            <td><Link to={"/instructor/quiz/" + quiz.id + "/scores"}>{quiz.studentCount} / {course.students.length}</Link></td>
                                            <td>{formatScore(quiz.averageScore, 0)}</td>
                                            <td>{formatScore(quiz.averagePredictedScore, 0)}</td>
                                            <td>{formatScore(quiz.averageWadayanoScore, 0)}</td>
                                            <td>
                                                <button className="button is-light"
                                                    onClick={() => this.setState({ currentQuizReview: quiz })}>
                                                    <span className="icon">
                                                        <i className="fas fa-chart-bar"></i>
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

                        <Breadcrumbs links={[
                            { to: "/instructor/courses", title: "Course List" },
                            { to: "/instructor/course/"+course.id, title: course.title },
                            { to: "/instructor/course/" + course.id + "/scores", title: "Course Scores", active: true },
                        ]} />

                        <h3 className="title is-3 is-inline">Quizzes in {course.title}</h3>
                    </div>
                </section>

                {scoresTable}

                {this.state.currentQuizReview && <Modal
                    modalState={true}
                    closeModal={() => this.setState({ currentQuizReview: null })}
                    title={`Aggregated results from ${this.state.currentQuizReview.title}`}
                    cardClassName="quiz-scores-report-modal">
                        <AggregatedQuizReview quizId={this.state.currentQuizReview.id} />
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

// Functions to define sorting on the various columns
const sortFunctions = {
    title: (a, b) => stringCompare(a.title, b.title),
    type: (a, b) => stringCompare(a.type, b.type),
    studentCount: (a, b) => a.studentCount - b.studentCount,
    averageScore: (a, b) => a.averageScore - b.averageScore,
    averagePredictedScore: (a, b) => a.averagePredictedScore - b.averagePredictedScore,
    averageWadayanoScore: (a, b) => a.averageWadayanoScore - b.averageWadayanoScore
};

// Get course details and quiz attempts
export const COURSE_QUERY = gql`
  query courseQuery($id:ID!) {
    course(
        id:$id
    ){
        id
        title
        quizzes{
            id
            title
            type
            questions{
                id
            }
            quizAttempts {
                id
                student {
                    id
                }
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
        students {
            id
        }
    }
  }
`

export default withAuthCheck(compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id:props.match.params.courseId } }
        }
    }),
) (CourseScores), { instructor: true });
