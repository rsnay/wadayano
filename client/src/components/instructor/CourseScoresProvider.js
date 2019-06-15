import React, { Component } from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { predictedScore, wadayanoScore } from '../../utils';

/**
 * Wraps a component (currently CourseDetails) and injects a courseScores prop with aggregated course/quiz scores.
 * Used to allow the quizzes table to appear quickly, and time-consuming aggregated scores can be loaded async.
 * @param {CourseDetails} ComposedComponent
 */
export default function withCourseScores(ComposedComponent) {
  class WithCourseScores extends Component {
    constructor() {
      super();
      this.state = { courseScores: null };
    }

    componentWillReceiveProps(nextProps) {
      // Workaround for no callback after apollo query finishes loading.
      if (nextProps.courseQuery && !nextProps.courseQuery.error && nextProps.courseQuery.course) {
        // Prepare data for the sortable table
        const { course } = nextProps.courseQuery;

        const courseScores = new Map();

        course.quizzes.forEach(quiz => {
          // Get first completed quiz attempt for each student, and calculate wadayano and predicted score
          const studentScores = new Map();
          quiz.quizAttempts.forEach(attempt => {
            if (attempt.completed) {
              const studentId = attempt.student.id;
              // Save score and wadayano score for this student if not already in the Map
              if (studentScores.get(studentId) === undefined) {
                studentScores.set(studentId, {
                  score: attempt.score,
                  predictedScore: predictedScore(attempt),
                  wadayanoScore: wadayanoScore(attempt),
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

          courseScores.set(quiz.id, {
            id: quiz.id,
            title: quiz.title,
            type: quiz.type,
            studentCount,
            averageScore,
            averagePredictedScore,
            averageWadayanoScore,
          });
        });

        // Sort by title by default
        // aggregatedQuizScores.sort(sortFunctions['title']);

        this.setState({ courseScores });
      }
    }

    render() {
      return <ComposedComponent {...this.props} courseScores={this.state.courseScores} />;
    }
  }

  // Get completed quiz attempts for all quizzes in the course
  const COURSE_QUERY = gql`
    query courseQuery($id: ID!) {
      course(id: $id) {
        id
        quizzes {
          id
          title
          type
          questions {
            id
          }
          quizAttempts(where: { completed_not: null }) {
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
      }
    }
  `;

  WithCourseScores.displayName = `WithCourseScores(${ComposedComponent.displayName ||
    ComposedComponent.name ||
    'Component'})`;
  return graphql(COURSE_QUERY, {
    name: 'courseQuery',
    options: props => {
      return { fetchPolicy: 'cache-and-network', variables: { id: props.match.params.courseId } };
    },
  })(WithCourseScores);
}
