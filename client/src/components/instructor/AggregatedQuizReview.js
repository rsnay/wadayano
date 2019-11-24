import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

import { formatScore, confidenceAnalysis, predictedScore, wadayanoScore } from '../../utils';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import ButterToast, { ToastTemplate } from '../shared/Toast';

import Logo from '../../logo_boxed.svg';

import AggregatedQuestionReview from './AggregatedQuestionReview';
import Modal from '../shared/Modal';

import { CONFIDENCES } from '../../constants';
import ConfidenceBarGraph from './ConfidenceBarGraph';
import ScoresBarGraph from './ScoresBarGraph';
import fragments from '../../fragments';

import PageTitle from '../shared/PageTitle';
import { sortFunctions } from '../../sort-utils';

// Get the quiz and attempts
export const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id: $id) {
      id
      title
      type
      course {
        id
        title
        students {
          id
          name
        }
      }
      questions {
        ...InstructorFullQuestion
      }
      quizAttempts(where: { completed_not: null }) {
        id
        student {
          id
          name
        }
        createdAt
        completed
        score
        questionAttempts {
          id
          isCorrect
          isConfident
          question {
            id
            concept
          }
        }
        conceptConfidences {
          id
          concept
          confidence
        }
      }
    }
  }
  ${fragments.instructorFullQuestion}
`;

const columns = [
  { title: 'Concept', columnId: 'concept', sortable: true },
  { title: 'Average Score', columnId: 'averageScore', sortable: true },
  { title: 'Average Predicted Score', columnId: 'averagePredictedScore', sortable: true },
  { title: 'Average Wadayano Score', columnId: 'averageWadayanoScore', sortable: true },
  { title: 'View Questions', columnId: 'viewQuestions', sortable: false },
];

const AggregatedQuizReview = ({ quizId }) => {
  const [error, setError] = useState(null);
  const [currentConceptModal, setCurrentConceptModel] = useState(null);
  const [sortColumn, setSortColumn] = useState('concept');
  const [sortAscending, setSortAscending] = useState(true);

  // Will hold data for aggregated graphs
  const [aggregatedScores, setAggregatedScores] = useState(null);
  // Will hold aggregated data for each concept
  const [conceptRows, setConceptRows] = useState([]);

  const { error: queryError, data } = useQuery(QUIZ_QUERY, {
    fetchPolicy: 'cache-and-network',
    variables: { id: quizId },
  });

  // Processes all the quiz attempt data. Wrapped in this function for easier error catching
  const processData = quiz => {
    // Prepare data for the review

    // Get all unique concepts in the quiz
    const concepts = Array.from(new Set(quiz.questions.map(q => q.concept)));

    // Get first completed quiz attempt for each student (query only returns completed attempts)
    const studentFirstAttempts = new Map();
    quiz.quizAttempts.forEach(attempt => {
      if (attempt.completed) {
        const studentId = attempt.student.id;
        // Add to map if no completed attempt for student already
        if (studentFirstAttempts.get(studentId) === undefined) {
          studentFirstAttempts.set(studentId, attempt);
        }
      }
    });

    const studentCount = studentFirstAttempts.size;
    // Make sure we have student data to display
    if (studentCount === 0) {
      setError('No students have taken this quiz.');
      return;
    }

    // Set up objects to hold data
    const scores = [];
    let averageScore = 0;

    const predictedScores = [];
    let averagePredictedScore = 0;

    const wadayanoScores = [];
    let averageWadayanoScore = 0;

    const confidenceAnalysisCounts = {
      [CONFIDENCES.OVERCONFIDENT.key]: 0,
      [CONFIDENCES.ACCURATE.key]: 0,
      [CONFIDENCES.UNDERCONFIDENT.key]: 0,
      [CONFIDENCES.MIXED.key]: 0,
    };

    // ConceptName -> Array of (wadayano) scores
    // (Weird `concepts.map(c => [c, [] ])` syntax just initializes it to map each concept name to an empty array)
    const conceptScores = new Map(concepts.map(c => [c, []]));
    const conceptPredictedScores = new Map(concepts.map(c => [c, []]));
    const conceptWadayanoScores = new Map(concepts.map(c => [c, []]));

    // Go through first attempt for each student
    studentFirstAttempts.forEach(attempt => {
      // Overall score, wadayano score, and confidence analysis
      const attemptPredictedScore = predictedScore(attempt);
      const attemptWadayanoScore = wadayanoScore(attempt);
      const attemptConfidenceAnalysis = confidenceAnalysis(attempt);

      scores.push(attempt.score);
      averageScore += attempt.score;

      predictedScores.push(attemptPredictedScore);
      averagePredictedScore += attemptPredictedScore;

      wadayanoScores.push(attemptWadayanoScore);
      averageWadayanoScore += attemptWadayanoScore;

      // Increase counter for this confidence analysis type
      confidenceAnalysisCounts[attemptConfidenceAnalysis.key]++;

      try {
        // Concept-level score and wadayano score
        concepts.forEach(concept => {
          const conceptQuestionAttempts = attempt.questionAttempts.filter(
            questionAttempt => questionAttempt.question.concept === concept
          );

          const conceptScore =
            conceptQuestionAttempts.filter(questionAttempt => questionAttempt.isCorrect).length /
            conceptQuestionAttempts.length;
          conceptScores.get(concept).push(conceptScore);

          const conceptConfidence = attempt.conceptConfidences.find(cc => cc.concept === concept);
          const conceptPredictedScore =
            conceptConfidence.confidence / conceptQuestionAttempts.length;
          conceptPredictedScores.get(concept).push(conceptPredictedScore);

          const conceptWadayanoScore =
            conceptQuestionAttempts.filter(
              questionAttempt => questionAttempt.isConfident === questionAttempt.isCorrect
            ).length / conceptQuestionAttempts.length;
          conceptWadayanoScores.get(concept).push(conceptWadayanoScore);
        });
      } catch (err) {
        // An error might occur if changes to concepts occurred in the quiz after some students took it
        // Just swallow these errors for now
        console.log(err);
      }
    });

    // Find average overall score and Wadayano Score
    averageScore /= studentCount;
    averagePredictedScore /= studentCount;
    averageWadayanoScore /= studentCount;

    // Find average concept-level score, predicted score, and Wadayano Score
    const newConceptRows = concepts.map(concept => {
      let conceptAverageScore = 0;
      let conceptAveragePredictedScore = 0;
      let conceptAverageWadayanoScore = 0;

      conceptScores.get(concept).forEach(score => (conceptAverageScore += score));
      conceptPredictedScores.get(concept).forEach(score => (conceptAveragePredictedScore += score));
      conceptWadayanoScores.get(concept).forEach(score => (conceptAverageWadayanoScore += score));

      conceptAverageScore /= studentCount;
      conceptAveragePredictedScore /= studentCount;
      conceptAverageWadayanoScore /= studentCount;

      // Use the || 0 to prevent NaN from entering, in case of invalid data
      return {
        concept,
        averageScore: conceptAverageScore || 0,
        averagePredictedScore: conceptAveragePredictedScore || 0,
        averageWadayanoScore: conceptAverageWadayanoScore || 0,
      };
    });
    // Sort by name by default
    newConceptRows.sort(sortFunctions.concept);
    setConceptRows(newConceptRows);
    // console.log(scores, wadayanoScores, confidenceAnalysisCounts);

    setAggregatedScores({
      scores,
      averageScore,
      predictedScores,
      averagePredictedScore,
      wadayanoScores,
      averageWadayanoScore,
      confidenceAnalysisCounts,
    });
  };

  // When the query data gets updated, process it
  useEffect(() => {
    // Rather than check if query is ‘loading,’ check if it doesn’t have data, since
    // the cache-and-network fetch policy is used, which returns data from cache but
    // still sets loading=true while it re-fetches
    if (!queryError && data && data.quiz) {
      try {
        processData(data.quiz);
      } catch (err) {
        console.error(err);
        ButterToast.raise({
          content: (
            <ToastTemplate
              content="There was an error generating the aggregated report for this quiz. Please contact us if this problem persists."
              className="is-danger"
            />
          ),
        });
      }
    }
  }, [queryError, data]);

  const sortByColumn = e => {
    // Get data-column prop from header that was clicked
    const newSortColumn = e.target.dataset.column;
    let newSortAscending = sortAscending;

    // Check if we're toggling sort direction
    if (sortColumn === newSortColumn) {
      newSortAscending = !sortAscending;
    }

    // Sort data
    const newConceptRows = [...conceptRows];
    newConceptRows.sort(sortFunctions[newSortColumn]);
    if (!newSortAscending) {
      newConceptRows.reverse();
    }

    // Update state
    setSortAscending(newSortAscending);
    setSortColumn(newSortColumn);
    setConceptRows(newConceptRows);
  };

  if (error || queryError) {
    return (
      <ErrorBox>
        <p>Couldn’t load quiz report. {error || ''}</p>
      </ErrorBox>
    );
  }

  if (!aggregatedScores || !data || !data.quiz) {
    return <Spinner />;
  }

  // Quiz object from database
  const { quiz } = data;

  const {
    scores,
    averageScore,
    predictedScores,
    averagePredictedScore,
    averageWadayanoScore,
    confidenceAnalysisCounts,
  } = aggregatedScores;

  const averageWadayanoScoreLabel = score => (
    <div className="is-flex aggregated-score-label">
      <img src={Logo} alt="wadayano logo" style={{ height: '2rem' }} />
      <h4 className="subtitle is-flex flex-1">Average Wadayano Score</h4>
      <h4 className="subtitle is-flex">{formatScore(score, 0)}</h4>
    </div>
  );

  const barGraphLegend = (average, averagePredicted) => (
    <div className="is-flex-desktop scores-bar-graph-legend">
      <h4 className="subtitle is-flex flex-1">
        <span className="has-text-warning">■&nbsp;&nbsp;</span>
        Predicted ({formatScore(averagePredicted, 0)}&nbsp;average)
      </h4>
      <h4 className="subtitle is-flex flex-1">
        <span className="has-text-info">■&nbsp;&nbsp;</span>
        Score ({formatScore(average, 0)}&nbsp;average)
      </h4>
    </div>
  );

  return (
    <div>
      <div className="columns is-desktop">
        <PageTitle title={`wadayano | ${quiz.title} Class Scores`} />
        <div className="column">
          <div className="box" style={{ minHeight: '315px' }}>
            {barGraphLegend(averageScore, averagePredictedScore)}
            <ScoresBarGraph scoreSeries={[predictedScores, scores]} />
          </div>
        </div>
        <div className="column">
          <div className="box" style={{ minHeight: '315px' }}>
            {averageWadayanoScoreLabel(averageWadayanoScore)}
            <ConfidenceBarGraph
              overconfident={confidenceAnalysisCounts.OVERCONFIDENT}
              accurate={confidenceAnalysisCounts.ACCURATE}
              underconfident={confidenceAnalysisCounts.UNDERCONFIDENT}
              mixed={confidenceAnalysisCounts.MIXED}
            />
          </div>
        </div>
      </div>
      <h3 className="title">Concepts</h3>
      <div className="table-wrapper">
        <table className="table is-striped is-hoverable is-fullwidth is-vcentered">
          <thead>
            <tr className="sticky-header sortable-header">
              {columns.map(col => (
                <th
                  key={col.columnId}
                  className={sortColumn === col.columnId ? 'has-background-light' : ''}
                  data-column={col.columnId}
                  onClick={col.sortable ? sortByColumn : () => {}}
                >
                  {col.title}
                  {sortColumn === col.columnId && (
                    <span className="icon" style={{ width: 0, float: 'right' }}>
                      <i className="fas fa-sort" />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conceptRows.map(row => {
              return (
                <tr
                  key={row.concept}
                  className="has-cursor-pointer"
                  onClick={() => setCurrentConceptModel(row.concept)}
                >
                  <td>{row.concept}</td>
                  <td>{formatScore(row.averageScore, 0)}</td>
                  <td>{formatScore(row.averagePredictedScore, 0)}</td>
                  <td>{formatScore(row.averageWadayanoScore, 0)}</td>
                  <td>
                    <button
                      className="button is-light"
                      onClick={() => setCurrentConceptModel(row.concept)}
                      type="button"
                    >
                      View Questions
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        modalState={currentConceptModal !== null}
        closeModal={() => setCurrentConceptModel(null)}
        title={`Concept Review: ${currentConceptModal}`}
      >
        {quiz.questions
          .filter(q => q.concept === currentConceptModal)
          .map(conceptQuestion => (
            <AggregatedQuestionReview
              key={conceptQuestion.id}
              question={conceptQuestion}
              quizId={quiz.id}
              courseId={quiz.course.id}
            />
          ))}
        <br />
      </Modal>
    </div>
  );
};

AggregatedQuizReview.propTypes = {
  quizId: PropTypes.string.isRequired,
};

export default AggregatedQuizReview;
