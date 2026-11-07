import React from 'react';
import { Link } from 'react-router-dom';
import { Navigate } from 'react-router';
import useApiQuery from '../../useApiQuery';

import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';

/**
 * This page displays cards for all of a students’s courses to navigate to
 * a specific course. If only one course is available, it redirects to that course.
 */
const DashboardList = () => {
  const { error, data, loading } = useApiQuery('/api/student');

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load dashboard. Please try again later.</p>
      </ErrorBox>
    );
  }

  if (loading || !data) {
    return <Spinner />;
  }

  const { courses, name: studentName } = data;

  // If there's only one course, redirect to that dashboard
  if (courses.length === 1) {
    return <Navigate to={`/student/dashboard/${courses[0].id}`} replace />;
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

export default DashboardList;
