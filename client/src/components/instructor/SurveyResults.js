import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import ShowMore from 'react-show-more';

import compose from '../../compose';
import withAuthCheck from '../shared/AuthCheck';
import CsvGenerator from './CsvGenerator';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import Breadcrumbs from '../shared/Breadcrumbs';

class SurveyResults extends Component {
  _downloadCsv() {
    // Check that data has loaded
    if (!this.props.courseQuery || this.props.courseQuery.loading || this.props.courseQuery.error) {
      alert('The survey data has not loaded. Please refresh the page and try again.');
      return;
    }

    const { course } = this.props.courseQuery;
    const { students } = course;
    const rows = [];

    // Header row with survey questions
    let headerRow = ['Student Name'];
    headerRow = headerRow.concat(course.survey.questions.map(q => q.prompt));
    rows.push(headerRow);

    // Add row for each student (this is largely duplicated from the table display)
    students.forEach(student => {
      let studentRow = [];
      studentRow.push(student.name);
      // Determine if student took this course’s survey
      let result = null;
      try {
        result = student.surveyResults.filter(r => r.course.id === course.id)[0];
      } catch (error) {
        console.error(error);
      }
      // Output answer for each question, if survey was taken
      if (result) {
        studentRow = studentRow.concat(
          course.survey.questions.map(q => {
            if (result.answers[q.index]) {
              return q.options.filter(o => o.index === result.answers[q.index])[0].text;
            }
            return '';
          })
        );
      }
      rows.push(studentRow);
    });

    // Download the generated CSV
    const csvGenerator = new CsvGenerator(rows, 'course_survey_results.csv', ',', true);
    csvGenerator.download(true);
  }

  render() {
    if (this.props.courseQuery && this.props.courseQuery.loading) {
      return <Spinner />;
    }

    if (this.props.courseQuery && this.props.courseQuery.error) {
      return (
        <ErrorBox>
          <p>Couldn’t load survey results</p>
        </ErrorBox>
      );
    }

    const { course } = this.props.courseQuery;
    const { students } = course;

    let resultsTable;
    if (students.length === 0) {
      resultsTable = (
        <p className="notification is-light">
          There are no students enrolled in this course. When a student launches the survey from
          their LMS, he/she will be automatically enrolled.
        </p>
      );
    } else {
      resultsTable = (
        <div className="table-wrapper">
          <table className="table is-striped is-fullwidth survey-results-table">
            <thead>
              <tr className="sticky-header">
                <th>Student Name</th>
                {course.survey.questions.map(q => (
                  <th key={q.index}>
                    <ShowMore>{q.prompt}</ShowMore>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                // Determine if student took this course’s survey
                let result = null;
                try {
                  result = student.surveyResults.filter(r => r.course.id === course.id)[0];
                } catch (error) {
                  console.error(error);
                }
                // Output answer for each question, if survey was taken
                return (
                  <tr key={student.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{student.name}</td>
                    {result ? (
                      course.survey.questions.map(q => (
                        <td key={q.index}>
                          {result.answers[q.index] ? (
                            q.options.filter(o => o.index === result.answers[q.index])[0].text
                          ) : (
                            <i>n/a</i>
                          )}
                        </td>
                      ))
                    ) : (
                      <td colSpan={course.survey.questions.length}>
                        <i>Survey not taken</i>
                      </td>
                    )}
                  </tr>
                );
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
            <Breadcrumbs
              links={[
                { to: '/instructor/courses', title: 'Courses' },
                { to: `/instructor/course/${course.id}`, title: course.title },
                {
                  to: `/instructor/survey/results/${course.id}`,
                  title: 'Survey Results',
                  active: true,
                },
              ]}
            />

            <h3 className="title is-3 is-inline">Survey Results</h3>

            {students.length > 0 && (
              <button
                className="button is-light is-pulled-right"
                onClick={() => this._downloadCsv()}
                type="button"
              >
                <span className="icon">
                  <i className="fas fa-download" />
                </span>
                <span>Download Results as CSV</span>
              </button>
            )}
          </div>
        </section>

        {resultsTable}

        <hr />
        <div className="field is-grouped">
          <p className="control">
            <Link className="button" to={`/instructor/course/${course.id}`}>
              Return to Course
            </Link>
          </p>
        </div>
        <br />
      </div>
    );
  }
}

// Get the course information
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id: $id) {
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
`;

export default withAuthCheck(
  compose(
    graphql(COURSE_QUERY, {
      name: 'courseQuery',
      options: props => {
        return { variables: { id: props.match.params.courseId } };
      },
    })
  )(SurveyResults),
  { instructor: true }
);
