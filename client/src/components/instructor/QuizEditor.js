/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-apollo';
import gql from 'graphql-tag';

import withAuthCheck from '../shared/AuthCheck';
import { QUIZ_TYPE_NAMES } from '../../constants';

import PageTitle from '../shared/PageTitle';
import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import Modal from '../shared/Modal';
import Breadcrumbs from '../shared/Breadcrumbs';

import QuestionEditor from './QuestionEditor';
import QuizInfoForm from './QuizInfoForm';
import QuizJSONImportModal from './QuizJSONImportModal';
import LTISetupModal from './LTISetupModal';

// Get the quiz
const QUIZ_QUERY = gql`
  query quizQuery($id: ID!) {
    quiz(id: $id) {
      id
      title
      type
      course {
        id
        title
        ltiSecret
      }
      questions {
        id
        prompt
      }
      quizAttempts {
        id
      }
    }
  }
`;

const MAX_NAVBAR_QUESTIONS = 20;
const TEMP_ID_PREFIX = '_new';

// Scroll to a particular question, taking into account the sticky question navbar
function scrollToQuestionId(questionId) {
  const questionElement = document.getElementById(`container${questionId}`);
  if (questionElement !== null) {
    questionElement.scrollIntoView(true);

    // Scroll up to account for sticky question navbar, if not at bottom of page already
    // https://stackoverflow.com/a/44422472/702643
    if (window.innerHeight + Math.ceil(window.pageYOffset) < document.body.offsetHeight) {
      const headerHeight = document.getElementById('question-navbar').offsetHeight;
      window.scrollTo(0, window.scrollY - headerHeight);
    }
  }
}

/**
 * This page component displays quiz info, and manages QuestionEditors corresponding to the questions in the quiz.
 * The actual saving of changes to quiz questions or quiz info happens in the QuestionEditor and QuizInfoForm components, respectively.
 */
const QuizEditor = ({
  match: {
    params: { quizId },
  },
}) => {
  // Keep separate loading state (even though query has its own) for finer control
  // Initial load and refetching after importing JSON should display spinner
  // Refetch after saving quiz info should not display spinner so that question editor state is not lost (only the title and quiz type would have been updated)
  const [isLoading, setIsLoading] = useState(true);
  const [showQuizInfoModal, setShowQuizInfoModal] = useState(false);
  const [showQuizJSONImportModal, setShowQuizJSONImportModal] = useState(false);
  const [showLTISetup, setShowLTISetup] = useState(false);

  // Each new question needs a temporary ID before it gets saved to server. Keep a simple count
  const [newQuestionCount, setNewQuestionCount] = useState(0);
  // Keep minimal objects for new questions: { id: '_new0', prompt: '' }
  const [newQuestions, setNewQuestions] = useState([]);

  // Keep the saved questions separate from the query data (but update when the query updates), so that questions can be added/deleted without refetching the entire quiz
  const [savedQuestions, setSavedQuestions] = useState([]);

  // Get quiz data
  const { queryLoading, error, data: quizQuery, refetch } = useQuery(QUIZ_QUERY, {
    variables: { id: quizId },
  });

  useEffect(() => {
    if (quizQuery && !queryLoading && !error) {
      // Update separate questions array when query is updated
      setSavedQuestions(quizQuery.quiz.questions);
      setIsLoading(false);
    }
  }, [error, queryLoading, quizQuery]);

  const addQuestion = async () => {
    // Add a new question with a temporary ID
    const newQuestionId = `${TEMP_ID_PREFIX}${newQuestionCount + 1}`;
    setNewQuestionCount(newQuestionCount + 1);

    setNewQuestions([...newQuestions, { id: newQuestionId, prompt: '' }]);

    // Scroll to new question after render has hopefully finished
    window.setTimeout(() => scrollToQuestionId(newQuestionId), 100);
    return false;
  };

  // Called after a question is deleted (the delete mutation was already sent; we just need to remove from display)
  const onQuestionDelete = questionId => {
    // This transition isn’t super great. Consider https://reactcommunity.org/react-transition-group/
    document.getElementById(`container${questionId}`).classList.add('fade-opacity');
    // After fade animation finishes, remove this question from the list of ordered question IDs, and it won’t be displayed
    window.setTimeout(() => {
      // If this becomes measurably slow, switch to a more efficient method of checking and removing
      const updatedQuestions = savedQuestions.filter(q => q.id !== questionId);
      // If the question was removed, then update saved questions
      if (updatedQuestions.length !== savedQuestions.length) {
        setSavedQuestions(updatedQuestions);
      } else {
        // Otherwise it was a new question, which is stored separately
        setNewQuestions(newQuestions.filter(q => q.id !== questionId));
      }
    }, 300);
  };

  // Called after a new question is saved to the database for the first time. Switch from the "_new0" temp ID to actual ID
  const onNewQuestionSaved = (tempQuestionId, newQuestion) => {
    // Remove temp new question
    setNewQuestions(newQuestions.filter(q => q.id !== tempQuestionId));
    // Add actual new question at the end (will contain final server-generated ID)
    setSavedQuestions([...savedQuestions, newQuestion]);
  };

  // Called when the import question JSON modal is closed
  const onImportComplete = shouldRefetch => {
    setShowQuizJSONImportModal(false);
    setIsLoading(shouldRefetch);
    // Reload quiz data after it’s done
    if (shouldRefetch) {
      refetch();
    }
  };

  if (quizQuery && error) {
    return (
      <ErrorBox>
        <p>Couldn’t load quiz.</p>
      </ErrorBox>
    );
  }

  if (isLoading) {
    return <Spinner />;
  }

  const { quiz } = quizQuery;
  const allQuestions = savedQuestions.concat(newQuestions);

  // Render up to 20 questions in navbar
  const divisor = Math.ceil(allQuestions.length / MAX_NAVBAR_QUESTIONS);
  const questionNavbar = (
    <div id="question-navbar" className="question-navbar no-select">
      <span className="has-text-dark is-inline-block question-navbar-title">Jump to Question:</span>
      {/* Only render up to 20 questions by omitting non-factors of the divisor, 
          but always include first and last questions */}
      {allQuestions.map(({ id }, index) => {
        if ((index + 1) % divisor === 0 || index === 0 || index === allQuestions.length - 1) {
          return (
            <button
              key={id}
              onClick={() => scrollToQuestionId(id)}
              className="question-navbar-item button is-text"
              type="button"
            >
              {index + 1}
            </button>
          );
        }
        return null;
      })}
      <button
        className="button is-text question-navbar-item"
        title="Add Question"
        onClick={addQuestion}
        type="button"
      >
        <span className="icon">
          <i className="fas fa-plus" />
        </span>
      </button>
    </div>
  );

  const questionList = allQuestions.map(({ id, prompt }, index) => (
    <QuestionEditor
      key={id}
      courseId={quiz.course.id}
      quizId={quiz.id}
      elementId={`container${id}`}
      questionId={id}
      questionIndex={index}
      defaultPrompt={prompt}
      isNew={id.startsWith(TEMP_ID_PREFIX)}
      onDelete={() => onQuestionDelete(id)}
      onNewSave={onNewQuestionSaved}
    />
  ));

  const newQuestionButton = (
    <div className="panel question-editor no-select" onClick={addQuestion}>
      <p className="panel-heading is-flex">
        <i style={{ paddingLeft: '1rem', cursor: 'pointer' }}>New Question</i>
        <span className="is-pulled-right is-flex question-editor-button-group">
          <button className="button" onClick={addQuestion} type="button">
            <span className="icon">
              <i className="fas fa-plus" />
            </span>
            <span>Add Question</span>
          </button>
        </span>
      </p>
    </div>
  );

  // Show a section hinting instructor to add quiz to the LMS if there are > 0 saved questions
  const addToLMSSection = savedQuestions.length > 0 && (
    <section>
      <h4 className="title is-4">Add Quiz to LMS</h4>
      <div className="is-flex-tablet">
        <span className="flex-1">
          {quizQuery.quiz.type === 'GRADED' ? (
            <>
              Students launch graded quizzes directly from the course LMS.
              <br /> To make this quiz available to students, create an LTI assignment or link for
              this quiz.
              <br />
            </>
          ) : (
            <>
              Students can launch all practice quizzes (including this one) from their wadayano
              dashboard.
              <br /> You can also add a direct LTI link to this quiz.
              <br />
            </>
          )}
          When taking a quiz, students will see questions in a random order.
        </span>
        <button
          style={{ marginLeft: '1rem' }}
          className="button is-light"
          onClick={() => setShowLTISetup(true)}
          type="button"
        >
          <span className="icon">
            <i className="fas fa-link" />
          </span>
          <span>Add Quiz to LMS</span>
        </button>
      </div>
      <LTISetupModal
        action="quiz"
        objectId={quiz.id}
        consumerKey={quiz.course.id}
        sharedSecret={quiz.course.ltiSecret}
        closeModal={() => setShowLTISetup(false)}
        modalState={showLTISetup}
      />
    </section>
  );

  const quizInfoModal = (
    <Modal
      modalState={showQuizInfoModal}
      closeModal={() => setShowQuizInfoModal(false)}
      title="Edit Quiz Info"
    >
      <QuizInfoForm
        quiz={quiz}
        onCancel={() => setShowQuizInfoModal(false)}
        onSave={() => {
          setShowQuizInfoModal(false);
          refetch();
        }}
      />
    </Modal>
  );

  return (
    <section className="section">
      <div className="container">
        <PageTitle title={`wadayano | ${quiz.title} Editor`} />

        <Breadcrumbs
          links={[
            { to: '/instructor/courses', title: 'Courses' },
            { to: `/instructor/course/${quiz.course.id}`, title: quiz.course.title },
            { to: `/instructor/quiz/${quiz.id}`, title: quiz.title, active: true },
          ]}
        />

        <section>
          <div className="is-flex-tablet">
            <div style={{ flex: 1 }}>
              <h1 className="title is-3">{quiz.title}</h1>
              <h2 className="subtitle is-4">{QUIZ_TYPE_NAMES[quiz.type]} Quiz</h2>
            </div>
            <button
              className="button is-light"
              onClick={() => setShowQuizInfoModal(true)}
              style={{ marginTop: '1rem' }}
              type="button"
            >
              <span className="icon">
                <i className="fas fa-edit" />
              </span>
              <span>Edit Quiz Info</span>
            </button>
          </div>
          <hr />
        </section>

        <div className="is-flex-tablet">
          <h2 className="title is-4" style={{ flex: 1 }}>
            Questions
          </h2>
          <Link
            to={`/instructor/quiz/${quiz.id}/import-questions`}
            className="button is-light"
            style={{ marginBottom: '1rem' }}
          >
            <span className="icon">
              <i className="fas fa-file-import" />
            </span>
            <span>Import From Other Quizzes</span>
          </Link>

          <button
            className="button is-light"
            style={{ marginBottom: '1rem', marginLeft: '0.5rem' }}
            onClick={() => setShowQuizJSONImportModal(true)}
            type="button"
          >
            <span className="icon">
              <i className="fas fa-code" />
            </span>
            <span>Import Question JSON</span>
          </button>
          {showQuizJSONImportModal && (
            <QuizJSONImportModal quizId={quiz.id} onClose={onImportComplete} />
          )}
        </div>

        {quiz.quizAttempts.length > 0 && (
          <div className="notification is-warning">
            <p>
              Students have taken (or started taking) this quiz. Changing quiz questions will
              invalidate data and lead to inconsistencies and/or errors. Please{' '}
              <Link to="/feedback">contact us</Link> if you need assistance.
            </p>
          </div>
        )}

        {allQuestions.length > 0 && questionNavbar}
        <br />

        {questionList}
        {newQuestionButton}

        {addToLMSSection}

        {quizInfoModal}
      </div>
    </section>
  );
};

export default withAuthCheck(QuizEditor, { instructor: true });
