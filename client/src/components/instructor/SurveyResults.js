import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

class SurveyResults extends Component {
    constructor(props) {
        super(props);

        this.state = {
        };
    }

    render() {

        if (this.props.courseQuery && this.props.courseQuery.loading) {
            return <LoadingBox />;
        }

        if (this.props.courseQuery && this.props.courseQuery.error) {
            return <ErrorBox><p>Couldn’t load survey results</p></ErrorBox>;
        }

        const course = this.props.courseQuery.course;
        const students = course.students;

        let resultsTable;
        if (students.length === 0) {
            resultsTable = (<p className="notification is-light">There are no students enrolled in this course. When a student launches the survey from their LMS, he/she will be automatically enrolled.</p>);
        } else {
            resultsTable = (
                <div style={{overflowX: "auto"}}>
                    <table className="table is-striped is-fullwidth survey-results-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                {course.survey.questions.map(q => <th key={q.index}>{q.prompt}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => {
                                // Determine if student took this course’s survey
                                let result = null;
                                try {
                                    result = student.surveyResults.filter(r => r.course.id === course.id)[0];
                                } catch (error) { }
                                // Output answer for each question, if survey was taken
                                return (<tr key={student.id}>
                                    <td style={{whiteSpace: "nowrap"}}>{student.name}</td>
                                    {result ? 
                                        course.survey.questions.map(q => <td key={q.index}>{result.answers[q.index] ? q.options.filter(o => o.index === result.answers[q.index])[0].text : <i>n/a</i>}</td>)
                                    : <td colSpan={course.survey.questions.length}><i>Survey not taken</i></td>
                                    }
                                </tr>);
                            })}
                            {/*quizzes.map((quiz, index) => 
                                <tr key={quiz.id}>
                                    <td>
                                        <Link className="has-text-black is-block" to={"/student/quiz/" + quiz.id}>
                                        {quiz.title}</Link>
                                    </td>
                                    <td>{quiz.questions.length}</td>
                                    <td>
                                        <Link to={"/student/quiz/" + quiz.id}
                                        className="button is-primary is-outlined">
                                            <span className="icon"><i className="fas fa-rocket"></i></span>
                                            <span>Practice Quiz</span>
                                        </Link>
                                    </td>
                                </tr>
                            )*/}
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
                                <li className="is-active"><Link to={"/instructor/survey/edit/" + course.id} aria-current="page">Survey Results</Link></li>
                            </ul>
                        </nav>

                        <h3 className="title is-3">Survey Results</h3>
                    </div>
                </section>

                {resultsTable}

                <hr />
                <div className="field is-grouped">
                    <p className="control">
                        <Link className="button" to={"/instructor/course/" + course.id}>Return to Course</Link>
                    </p>
                </div>
            </div>
        );
    }
}

// Get the course information
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id:$id){
        id
        title
        survey
        students {
            id
            name
            surveyResults {
                createdAt
                answers
                course {
                    id
                }
            }
        }
    }
  }
`

export default withAuthCheck(compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id: props.match.params.courseId } }
        }
    }),
) (SurveyResults), { instructor: true });
