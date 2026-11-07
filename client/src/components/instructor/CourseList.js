import React from 'react';
import { Link } from 'react-router-dom';

import CreateCourseForm from './CreateCourseForm';

import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import useApiQuery from '../../useApiQuery';

const CourseList = () => {
  const { error, data, loading } = useApiQuery('/api/instructor');

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load courses.</p>
      </ErrorBox>
    );
  }

  if (loading || !data) {
    return <Spinner />;
  }

  const { courses } = data;

  return (
    <section className="section">
      <div className="container">
        <PageTitle title="wadayano | Courses" />
        <h1 className="title">Courses</h1>
        <hr />
        <div className="tile is-ancestor" style={{ flexWrap: 'wrap' }}>
          {courses.map(course => (
            <div className="tile is-4 is-parent" key={course.id}>
              <Link to={`/instructor/course/${course.id}`} className="tile is-child box">
                <p className="title">{course.title}</p>
                <hr />
                <div className="content">
                  <span>
                    <span className="icon">
                      <i className="fas fa-user-graduate" aria-hidden="true" />
                    </span>
                    &nbsp;
                    <span style={{ marginBottom: '5px' }}>
                      {course.studentCount === 1
                        ? '1 Student'
                        : `${course.studentCount} Students`}
                    </span>
                  </span>
                  <br />
                  <span>
                    <span className="icon">
                      <i className="fas fa-list-ul" aria-hidden="true" />
                    </span>
                    &nbsp;
                    <span style={{ marginBottom: '5px' }}>
                      {course.quizCount === 1 ? '1 Quiz' : `${course.quizCount} Quizzes`}
                    </span>
                  </span>
                </div>
              </Link>
            </div>
          ))}

          <div className="tile is-4 is-parent">
            <span className="tile is-child box">
              <p className="title">
                <span style={{ verticalAlign: '-10%' }} className="icon">
                  <i className="fas fa-plus-square" aria-hidden="true" />
                </span>
                &nbsp; Create Course
              </p>
              <div className="content">
                <CreateCourseForm />
              </div>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CourseList;
