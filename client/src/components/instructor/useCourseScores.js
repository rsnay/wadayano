import { useState, useEffect } from 'react';
import useApiQuery from '../../useApiQuery';
import { predictedScore, wadayanoScore } from '../../utils';

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
  const { loading, error, data } = useApiQuery(
    `/api/courses/${encodeURIComponent(courseId)}/scores`,
  );

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

  return { courseScores, error };
}

export default useCourseScores;
