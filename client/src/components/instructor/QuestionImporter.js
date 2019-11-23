import React, { useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'react-apollo';
import gql from 'graphql-tag';

import { QUIZ_TYPE_NAMES } from '../../constants';
import withAuthCheck from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import { stripTags } from '../../utils';
import Breadcrumbs from '../shared/Breadcrumbs';

// Get all questions in all quizzes in the course that this quiz belongs to
const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id: $id) {
      id
      title
      course {
        id
        title
        quizzes {
          id
          title
          type
          questions {
            id
            prompt
          }
        }
      }
    }
  }
`;

/**
 * Page that allows instructors to select individual questions (or all questions in a quiz) to import into a quiz.
 */
const QuestionImporter = () => {
  const { quizId } = useParams();
  const history = useHistory();

  const [questionIds, setQuestionIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const { loading, error, data } = useQuery(QUIZ_QUERY, { variables: { id: quizId } });
  const [importQuestionsMutation] = useMutation(IMPORT_QUESTIONS);

  const importQuestions = async () => {
    setIsSaving(true);
    try {
      // Send the mutation
      const result = await importQuestionsMutation({
        variables: { quizId, questionIds },
      });
      // Handle errors
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Redirect to quiz after successful save
      history.push(`/instructor/quiz/${quizId}`);
    } catch (error) {
      alert(
        'There was an error copying questions into this quiz. Please try again later, and contact us if the problem persists.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectQuiz = (quizId, deselect = false) => {
    let newQuestionIds = [...questionIds];
    // Add or remove each question from this quiz
    const quiz = data.quiz.course.quizzes.find(q => q.id === quizId);
    quiz.questions.forEach(question => {
      if (!deselect) {
        newQuestionIds.push(question.id);
      } else {
        newQuestionIds = newQuestionIds.filter(q => q !== question.id);
      }
    });
    // Remove duplicates
    newQuestionIds = Array.from(new Set(newQuestionIds));
    setQuestionIds(newQuestionIds);
  };

  const selectQuestion = (questionId, deselect = false) => {
    let newQuestionIds = [...questionIds];
    // Add or remove this question
    if (!deselect) {
      newQuestionIds.push(questionId);
    } else {
      newQuestionIds = newQuestionIds.filter(q => q !== questionId);
    }
    // Remove duplicates
    newQuestionIds = Array.from(new Set(newQuestionIds));
    setQuestionIds(newQuestionIds);
  };

  if (isSaving || loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load questions. Please try again later.</p>
      </ErrorBox>
    );
  }

  const { quiz } = data;
  const { course } = quiz;
  // Exclude the destination quiz and empty quizzes from the source list
  const quizzes = course.quizzes.filter(q => q.id !== quiz.id && q.questions.length > 0);

  let quizzesList;
  // If there are no other non-empty quizzes, alert the instructor
  if (quizzes.length === 0) {
    quizzesList = (
      <p className="notification is-light">
        Nothing to see here! There are no other non-empty quizzes in this course to import questions
        from.
      </p>
    );
  } else {
    // Otherwise show a list of quizzes and their questions
    quizzesList = quizzes.map(otherQuiz => (
      <table key={otherQuiz.id} className="table is-striped is-fullwidth">
        <thead>
          <tr className="sticky-header">
            <th style={{ textAlign: 'center' }}>
              <button
                className="button is-small"
                style={{ marginBottom: '0.2rem', width: '100%' }}
                onClick={() => selectQuiz(otherQuiz.id)}
                type="button"
              >
                All
              </button>
              <button
                className="button is-small"
                style={{ width: '100%' }}
                onClick={() => selectQuiz(otherQuiz.id, true)}
                type="button"
              >
                None
              </button>
            </th>
            <th style={{ width: '99%', verticalAlign: 'middle' }}>
              {otherQuiz.title} ({QUIZ_TYPE_NAMES[otherQuiz.type]})
            </th>
          </tr>
        </thead>
        <tbody>
          {otherQuiz.questions.map(question => {
            const selected = questionIds.indexOf(question.id) > -1;

            return (
              <tr key={question.id}>
                <td>
                  <button
                    className={`button${selected ? ' is-link' : ''}`}
                    onClick={() => selectQuestion(question.id, selected)}
                    type="button"
                  >
                    {selected ? '✓' : <i>&nbsp;&nbsp;</i>}
                  </button>
                </td>
                <td>{stripTags(question.prompt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    ));
  }

  return (
    <section className="section">
      <div className="container">
        <Breadcrumbs
          links={[
            { to: '/instructor/courses', title: 'Courses' },
            { to: `/instructor/course/${quiz.course.id}`, title: quiz.course.title },
            { to: `/instructor/quiz/${quiz.id}`, title: quiz.title },
            {
              to: `/instructor/quiz/${quiz.id}/import-questions`,
              title: 'Import Questions',
              active: true,
            },
          ]}
        />
        <h4 className="title is-4">
          Select questions from other quizzes in this course to copy to “{quiz.title}”
        </h4>
        {quizzesList}
        <br /> <br />
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'white',
            padding: '1rem',
            zIndex: 20,
            width: '100%',
            borderTop: 'solid #f3f3f3 1px',
          }}
        >
          <div className="field is-grouped">
            <p className="control">
              <Link className="button" to={`/instructor/quiz/${quiz.id}`}>
                Cancel
              </Link>
            </p>
            <p className="control">
              <button
                className="button is-primary"
                disabled={questionIds.length === 0}
                onClick={importQuestions}
                type="submit"
              >
                Import {questionIds.length || ''} Question{questionIds.length !== 1 && 's'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const IMPORT_QUESTIONS = gql`
  mutation importQuestionsMutation($quizId: ID!, $questionIds: [ID!]!) {
    importQuestions(quizId: $quizId, questionIds: $questionIds) {
      id
    }
  }
`;

export default withAuthCheck(QuestionImporter, { instructor: true });
