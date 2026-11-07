import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useApiQuery from '../../useApiQuery';
import { apiRequest } from '../../api';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';
import SurveyView from '../shared/SurveyView';

const SurveyTaker = () => {
  const { courseId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [answers, setAnswers] = useState({});

  const { loading, error, data: course } = useApiQuery(
    `/api/student/courses/${encodeURIComponent(courseId)}/survey`,
  );

  // Submit the survey results
  async function submitSurvey() {
    // Prevent re-submission while loading
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await apiRequest(
        `/api/student/courses/${encodeURIComponent(courseId)}/survey-results`,
        { method: 'POST', body: { answers } },
      );
      setIsComplete(true);
    } catch (err) {
      alert('There was an error submitting the survey. Please try again later.');
    }
    setIsSubmitting(false);
  }

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <ErrorBox>
        <p>Couldn’t load survey. Please try again later.</p>
      </ErrorBox>
    );
  }

  if (isComplete) {
    return (
      <article className="container message is-success" style={{ marginTop: '3em' }}>
        <div className="message-header">
          <p>Thanks! Your responses have been saved.</p>
          <span className="icon is-large">
            <i className="fas fa-3x fa-check-circle" aria-hidden="true" />
          </span>
        </div>
        <div className="message-body">
          <Link className="button" to={`/student/dashboard/${courseId}`}>
            Return to Dashboard
          </Link>
        </div>
      </article>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <h3 className="title is-3">{course.course.title} Survey</h3>

        <SurveyView
          survey={course.course.survey}
          selectedAnswers={answers}
          onChange={newAnswers => setAnswers(newAnswers)}
        />

        {course.course.survey &&
          course.course.survey.questions &&
          course.course.survey.questions.length > 0 && (
            <div className="field is-grouped">
              <p className="control">
                <button
                  className={`button is-primary${isSubmitting ? ' is-loading is-disabled' : ''}`}
                  onClick={submitSurvey}
                  type="submit"
                >
                  Submit Answers
                </button>
              </p>
            </div>
          )}
      </div>
    </section>
  );
};

export default SurveyTaker;
