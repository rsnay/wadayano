import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Prompt } from 'react-router';
import { useMutation, useQuery } from 'react-apollo';
import gql from 'graphql-tag';

import withAuthCheck from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import SurveyView from '../shared/SurveyView';
import Modal from '../shared/Modal';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import Breadcrumbs from '../shared/Breadcrumbs';

// Parses the survey text into an array of questions objects containing prompt and options
function parseSurveyText(text) {
  // Add an extra new line at the end so that last question gets popped off
  text += '\n';
  const lines = text.split('\n');
  const questions = [];
  let newQuestion = { options: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' && newQuestion.prompt) {
      questions.push(newQuestion);
      newQuestion = { options: [] };
    } else if (!newQuestion.prompt) {
      newQuestion.prompt = line;
      newQuestion.index = questions.length + 1;
    } else if (line !== '') {
      newQuestion.options.push({ index: newQuestion.options.length + 1, text: line });
    }
  }
  // console.log(questions);
  return { questions };
}

// Stringifies a survey object into the user-editable text
function stringifySurvey(survey) {
  if (!survey) {
    return '';
  }
  let text = '';
  try {
    survey.questions.forEach(question => {
      text += `${question.prompt}\n`;
      text += question.options.map(opt => opt.text).join('\n');
      text += '\n\n';
    });
  } catch (error) {
    alert('Error parsing survey');
  }
  return text.trim();
}

// Get the course information
const COURSE_QUERY = gql`
  query courseQuery($courseId: ID!) {
    course(id: $courseId) {
      id
      title
      survey
    }
  }
`;

const SAVE_SURVEY = gql`
  mutation saveSurveyMutation($courseId: ID!, $survey: Json!) {
    updateSurvey(courseId: $courseId, survey: $survey) {
      id
      survey
    }
  }
`;

const SurveyEditor = ({
  match: {
    params: { courseId },
  },
  history,
}) => {
  const [newSurveyText, setNewSurveyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formatModalVisible, setFormatModalVisible] = useState(false);

  const { loading, error, data: course } = useQuery(COURSE_QUERY, { variables: { courseId } });
  const [saveSurveyMutation] = useMutation(SAVE_SURVEY);

  console.log(loading, error, course);

  useEffect(() => {
    // Parse the survey text when it loads
    if (!loading && !error && course.course && course.course.survey) {
      setNewSurveyText(stringifySurvey(course.course.survey));
    }
  }, [loading, error, course]);

  useEffect(() => {
    // If the survey has been modified, have the browser confirm before user leaves the page
    if (isDirty) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = undefined;
    }
    return () => {
      // Remove leave confirmation when the user navigates away
      window.onbeforeunload = undefined;
    };
  }, [isDirty]);

  /* Structure of survey object:
       survey = {
           questions: [
               {
                    index: 0,
                    prompt: "What is your favorite color?",
                    options: [
                        {index: 0, text: "Red"},
                        {index: 1, text: "Blue"},
                        {index: 2, text: "Orange"},
                        {index: 3, text: "Green"},
                    ]
                },
               {
                    index: 1,
                    prompt: "What is your favorite fruit?",
                    options: [
                        {index: 0, text: "Redberry"},
                        {index: 1, text: "Blueberry"},
                        {index: 2, text: "Orange"},
                        {index: 3, text: "Greenleaf"},
                    ]
                }
           ]
       }
    */

  const saveSurvey = async () => {
    setIsSaving(true);
    try {
      // Save the new survey
      const result = await saveSurveyMutation({
        variables: {
          courseId,
          survey: parseSurveyText(newSurveyText),
        },
      });
      // Handle errors
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      setIsSaving(false);
      setIsDirty(false);
      ButterToast.raise({
        content: <ToastTemplate content="Survey saved successfully." className="is-success" />,
      });
      // Redirect to course details after successful save
      history.push(`/instructor/course/${courseId}`);
    } catch (err) {
      ButterToast.raise({
        content: (
          <ToastTemplate
            content="There was an error saving the survey. Please copy the text somewhere safe and try again later."
            className="is-danger"
          />
        ),
      });
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load course survey</p>
      </ErrorBox>
    );
  }

  if (loading) {
    return <LoadingBox />;
  }

  return (
    <section className="section">
      <div className="container">
        <Breadcrumbs
          links={[
            { to: '/instructor/courses', title: 'Courses' },
            { to: `/instructor/course/${courseId}`, title: course.course.title },
            {
              to: `/instructor/survey/edit/${courseId}`,
              title: 'Edit Course Survey',
              active: true,
            },
          ]}
        />
        <h3 className="title is-3">Course Survey</h3>
        <i>
          Note: modifying the survey (except for adding new questions to the very end) after
          students have taken it will invalidate existing student responses.
        </i>
        <br />
        <br />
        <div className="columns">
          <div className="column is-6">
            <h4 className="subtitle is-4">
              Editor
              <button
                style={{ height: 'inherit', padding: '0 0 0 0.5rem' }}
                className="button is-text is-pulled-right"
                onClick={() => setFormatModalVisible(true)}
                type="button"
              >
                <span className="icon is-small">
                  <i className="fas fa-question-circle" />
                </span>
                <span>Formatting hints</span>
              </button>
            </h4>

            <textarea
              className="textarea is-medium survey-editor"
              rows={10}
              value={newSurveyText}
              placeholder="Click “Formatting Hints” above to get started creating your survey."
              onChange={e => {
                setNewSurveyText(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
          <div className="column is-6">
            <h4 className="subtitle is-4">Preview</h4>
            <SurveyView survey={parseSurveyText(newSurveyText)} />
          </div>
        </div>
        <br /> <br />
        <div className="field is-grouped">
          <p className="control">
            <Link className="button" to={`/instructor/course/${courseId}`}>
              Cancel
            </Link>
          </p>
          <p className="control">
            <button
              className={`button is-primary${isSaving ? ' is-loading' : ''}`}
              onClick={saveSurvey}
              type="submit"
            >
              Save Survey
            </button>
          </p>
        </div>
        {/* If the survey was modified, have react router confirm before user navigates away */}
        <Prompt
          when={isDirty}
          message="Do you want to discard your unsaved changes to this survey?"
        />
        {formatModalVisible && (
          <Modal
            modalState
            closeModal={() => setFormatModalVisible(false)}
            title="Survey Formatting"
            showFooter
          >
            <ol>
              <li>Type a question on one line.</li>
              <li>Put each option for that question on a new line.</li>
              <li>
                Add an extra blank line between the last option and the text of the next question.
              </li>
              <li>Repeat for the next question.</li>
            </ol>
            Example:
            <textarea
              wrap="off"
              className="textarea is-medium survey-editor"
              style={{ overflowY: 'hidden' }}
              rows={11}
              value={`How many hours do you spend doing homework each day?
0–2
2–4
4–6
6+

How many hours do you sleep each night?
0–5
5–7
7–9
...and so forth`}
            />
          </Modal>
        )}
      </div>
    </section>
  );
};

export default withAuthCheck(SurveyEditor, { instructor: true });
