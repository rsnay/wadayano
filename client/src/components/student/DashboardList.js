import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Redirect } from 'react-router';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

class DashboardList extends Component {
    render() {

        if (this.props.studentQuery && this.props.studentQuery.loading) {
            return <LoadingBox />;
        }

        if (this.props.studentQuery && this.props.studentQuery.error) {
            return <ErrorBox><p>Couldn’t load dashboard. Please try again later.</p></ErrorBox>;
        }

        let courses = this.props.studentQuery.currentStudent.courses;

        // If there's only one course, redirect to that dashboard
        if (courses.length === 1) {
            return (<Redirect to={{
                pathname: `/student/dashboard/${courses[0].id}`
            }} />);
        }

        return (
            <section className="section">
                <div className="container">

                    <h3 className="title is-3">My Courses</h3>

                    <div className="tile is-ancestor" style={{flexWrap: "wrap"}}>

                        {courses.map((course, index) => 
                            <div className="tile is-4 is-parent" key={course.id}>
                                <Link to={"/student/dashboard/" + course.id} className="tile is-child box">
                                    <p className="title">
                                        <span className="icon"><i className="fas fa-flask" aria-hidden="true"></i></span>
                                        &nbsp; &nbsp;
                                        {course.title}
                                    </p>
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

// Get the student's courses information
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
`
export default withAuthCheck(compose(
    graphql(STUDENT_QUERY, {name: 'studentQuery'})
)(DashboardList), { student: true });
