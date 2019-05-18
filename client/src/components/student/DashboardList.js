import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Redirect } from 'react-router';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

/**
 * This page displays cards for all of a students’s courses to navigate to 
 * a specific course. If only one course is available, it redirects to that course.
 */
class DashboardList extends Component {
    render() {

        if (this.props.studentQuery && !this.props.studentQuery.currentStudent) {
            return <LoadingBox />;
        }

        if (this.props.studentQuery && this.props.studentQuery.error) {
            return <ErrorBox><p>Couldn’t load dashboard. Please try again later.</p></ErrorBox>;
        }

        let courses = this.props.studentQuery.currentStudent.courses;
        const studentName = this.props.studentQuery.currentStudent.name;

        // If there's only one course, redirect to that dashboard
        if (courses.length === 1) {
            return (<Redirect to={{
                pathname: `/student/dashboard/${courses[0].id}`
            }} />);
        }

        return (
            <section className="section">
                <div className="container">

                    <h3 className="title is-3">
                        My Courses
                        <span className="is-pulled-right is-hidden-mobile has-text-weight-normal">{studentName}</span>
                    </h3>
                    {/* On mobile, display student name on a separate line */}
                    <h3 className="title is-3 is-hidden-tablet has-text-weight-normal">{studentName}</h3>

                    <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>

                        {courses.map((course, index) => 
                            <div className="tile is-4 is-parent" key={course.id}>
                                <Link to={"/student/dashboard/" + course.id} className="tile is-child box">
                                    <p className="title">{course.title}</p>
                                    <hr />
                                    <div className="content">
                                        <span className="button is-primary">
                                            <span className="icon">
                                                <i className="fas fa-rocket"></i>
                                            </span>
                                            <span>Go to Dashboard</span>
                                        </span>
                                    </div>
                                </Link>
                            </div>
                        )}

                    </div>

                </div>
            </section>
        );
    }
}

// Get the student’s current courses
const STUDENT_QUERY = gql`
  query studentQuery {
    currentStudent {
        id
        name
        courses {
            id
            title
        }
    }
  }
`;

export default withAuthCheck(compose(
    graphql(STUDENT_QUERY, {
        name: 'studentQuery',
        options: { fetchPolicy: 'cache-and-network' }
    })
)(DashboardList), { student: true });
