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

        let course = this.props.courseQuery.course;

        return (
            <section className="section">
                <div className="container">

                    <nav className="breadcrumb" aria-label="breadcrumbs">
                        <ul>
                            <li><Link to="/instructor">Course List</Link></li>
                            <li><Link to={"/instructor/course/" + course.id}>{course.title}</Link></li>
                            <li className="is-active"><Link to={"/instructor/survey/edit/" + course.id} aria-current="page">Survey Results</Link></li>
                        </ul>
                    </nav>

                    <h3 className="title is-3">Survey Results</h3>

                    <p class="notification is-light">🚧 Not yet implemented. 🚧</p>

                    <hr />
                    <div className="field is-grouped">
                        <p className="control">
                            <Link className="button" to={"/instructor/course/" + course.id}>Return to Course</Link>
                        </p>
                    </div>

                </div>
            </section>
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
