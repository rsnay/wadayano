import React from 'react';
import { Link } from 'react-router-dom';
import { Redirect } from 'react-router';
import { useQuery } from 'react-apollo';
import gql from 'graphql-tag';

import withAuthCheck from '../shared/AuthCheck';

import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

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

/**
 * This page displays cards for all of a students’s courses to navigate to
 * a specific course. If only one course is available, it redirects to that course.
 */
const DashboardList = () => {
  const { error, data } = useQuery(STUDENT_QUERY, {
    options: { fetchPolicy: 'cache-and-network' },
  });

  if (!data || !data.currentStudent) {
    return <LoadingBox />;
  }

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load dashboard. Please try again later.</p>
      </ErrorBox>
    );
  }

  const { courses, name: studentName } = data.currentStudent;

  // If there's only one course, redirect to that dashboard
  if (courses.length === 1) {
    return <Redirect to={{ pathname: `/student/dashboard/${courses[0].id}` }} />;
  }

  return (
    <section className="section">
      <PageTitle title="wadayano | My Courses" />
      <div className="container">
        <h3 className="title is-3">
          My Courses
          <span className="is-pulled-right is-hidden-mobile has-text-weight-normal">
            {studentName}
          </span>
        </h3>
        {/* On mobile, display student name on a separate line */}
        <h3 className="title is-3 is-hidden-tablet has-text-weight-normal">{studentName}</h3>

        <div className="tile is-ancestor" style={{ flexWrap: 'wrap' }}>
          {courses.map(course => (
            <div className="tile is-4 is-parent" key={course.id}>
              <Link to={`/student/dashboard/${course.id}`} className="tile is-child box">
                <p className="title">{course.title}</p>
                <hr />
                <span className="button is-primary">
                  <span className="icon">
                    <i className="fas fa-rocket" />
                  </span>
                  <span>Go to Dashboard</span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default withAuthCheck(DashboardList, { student: true });
