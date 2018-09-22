import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import ShowMore from 'react-show-more';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import { formatScore } from '../../utils';

class QuizScores extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            scores: []
        };
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        if (nextProps.quizQuery && !nextProps.quizQuery.loading && !nextProps.quizQuery.error) {

            // Prepare data for the sortable table
            const quiz = nextProps.quizQuery.quiz;
            const course = quiz.course;
            // Sort students A–Z (use Array.from to shallow-copy, since source prop is read-only)
            const students = Array.from(course.students).sort((a, b) => a.name > b.name);

            let scores = students.map(student => {
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
                if (highestAttempt !== null) {
                    return {
                        name: student.name,
                        attempts: attempts.length,
                        highestScore: highestAttempt.score,
                        wadayanoScore: "TODO",
                        confidenceAnalysis: "TODO"
                    }
                } else {
                    return {
                        name: student.name,
                        attempts: 0,
                        highestScore: "",
                        wadayanoScore: "",
                        confidenceAnalysis: ""
                    }
                }
            })
            this.setState({ isLoading: false, scores });
        }
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
        // Sort students A–Z (use Array.from to shallow-copy, since source prop is read-only)
        const students = Array.from(course.students).sort((a, b) => a.name > b.name);


        const tableColumns = [
            {
                header: 'Student Name',
                key: 'name',
                defaultSorting: 'ASC',
                headerProps: { className: 'align-left' },
            },
            {
                header: 'Attempts',
                key: 'attempts',
                headerProps: { className: 'align-left' },
            },
            {
                header: 'Highest Score',
                key: 'highestScore',
                headerStyle: { fontSize: '15px' },
                sortable: false
            }
        ];

        let scoresTable;
        if (students.length === 0) {
            scoresTable = (<p className="notification is-light">There are no students enrolled in this course. When a student launches a quiz from the course’s LMS, he/she will be automatically enrolled.</p>);
        } else {
            scoresTable = (
                <div className="table-wrapper">
                    <table className="table is-striped is-fullwidth survey-results-table">
                        <thead>
                            <tr className="sticky-header">
                                <th>Student Name</th>
                                <th>Attempts</th>
                                <th>Highest Score</th>
                                <th>wadayano Score</th>
                                <th>Confidence Analysis</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => {
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
                                return (<tr key={student.id}>
                                    <td style={{whiteSpace: "nowrap"}}>{student.name}</td>
                                    <td>{attempts.length}</td>
                                    {highestAttempt ? 
                                        <React.Fragment>
                                            <td>{highestAttempt.score}</td>
                                            <td>TODO</td>
                                            <td>TODO</td>
                                        </React.Fragment>
                                    : <td colSpan="3"><i>Quiz not taken</i></td>
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

                {/*<SortableTable
                    data={this.state.scores}
                    columns={tableColumns}
                    iconStyle={{ color: '#aaa', paddingLeft: '5px', paddingRight: '5px' }} />*/}

                <hr />
                <div className="field is-grouped">
                    <p className="control">
                        <Link className="button" to={"/instructor/course/" + course.id}>Return to Course</Link>
                    </p>
                </div>
                <br />
            </div>
        );
    }
}

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
