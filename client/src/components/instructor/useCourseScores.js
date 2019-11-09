import { useState, useEffect } from 'react';
import { useQuery } from 'react-apollo';
import gql from 'graphql-tag';

import { predictedScore, wadayanoScore } from '../../utils';

// Get completed quiz attempts for all quizzes in the course
const COURSE_SCORES_QUERY = gql`
  query aggregatedCourseScoresQuery($id: ID!) {
    course(id: $id) {
      id
      quizzes {
        id
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

/**
 * Hook used by CourseDetails to load aggregated course/quiz scores.
 * Used so that CourseDetails’ quizzes table can appear quickly, and time-consuming aggregated
 * scores can be loaded asynchronously.
 * @param {string} courseId ID of course to load scores for
 * @returns {Map} maps quiz IDs to an object containing studentCount, averageScore,
 *                averagePredictedScore, and averageWadayanoScore
 */
function useCourseScores(courseId) {
  const [courseScores, setCourseScores] = useState(null);

  const { loading, error, data } = useQuery(COURSE_SCORES_QUERY, {
    fetchPolicy: 'cache-and-network',
    variables: { id: courseId },
  });

  useEffect(() => {
    // If loaded, prepare data for the sortable table
    if (!loading && !error && data && data.course) {
      // Create a new Map, since state should be immutable
      const courseScoresMap = new Map();

      data.course.quizzes.forEach(quiz => {
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

        courseScoresMap.set(quiz.id, {
          studentCount,
          averageScore,
          averagePredictedScore,
          averageWadayanoScore,
        });
      });

      setCourseScores(courseScoresMap);
    }
  }, [data, error, loading]);

  return courseScores;
}

export default useCourseScores;
