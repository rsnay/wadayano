import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Navigate } from 'react-router';
import useApiQuery from '../../useApiQuery';
import { apiRequest } from '../../api';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_STUDENT } from '../../constants';
import Modal from '../shared/Modal';
import OptionSelector from '../shared/OptionSelector';

// Consent preference is saved in the database as a string
const consentOptions = [
  { value: 'yes', title: 'Yes, I consent' },
  { value: 'no', title: 'No, I do not consent' },
];

/**
 * This component handles an LTI launch, as does LTILaunch, but presents a course consent form
 * before redirecting to wherever the launch should actually go.
 * See the LTILaunch component for more details.
 * If action is not present in the route, it will just display the consent for the student to change.
 */
const CourseConsentForm = () => {
  const { token, courseId, action, parameter1 } = useParams();
  const [error, setError] = useState();
  const [consent, setConsent] = useState('none');
  const [saving, setSaving] = useState(false);
  const [redirect, setRedirect] = useState(false);

  // Save auth token (this would be better in an effect, but it must be done before the query fires)
  if (token) {
    localStorage.setItem(AUTH_TOKEN, token);
    localStorage.setItem(AUTH_ROLE, AUTH_ROLE_STUDENT);
  }

  // Fetch course and current consent
  const { data, error: queryError, loading } = useApiQuery(
    `/api/student/courses/${encodeURIComponent(courseId)}/consent`,
  );

  // Set selected consent to previously-saved value
  useEffect(() => {
    if (data?.consent) {
      setConsent(data.consent);
    }
  }, [data]);

  const submitConsent = async () => {
    setSaving(true);
    try {
      await apiRequest(
        `/api/student/courses/${encodeURIComponent(courseId)}/consent`,
        { method: 'POST', body: { consent } },
      );
      setRedirect(true);
    } catch (err) {
      setError(
        'There was an error submitting your consent. Please launch this content again from your course’s learning management system.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error || queryError) {
    return (
      <ErrorBox>
        <p>{error || 'Error loading consent form. Please try again later.'}</p>
      </ErrorBox>
    );
  }

  if (redirect) {
    // If there’s an action, it’s a first launch, and redirect should not push new history entry
    if (action) {
      return <Navigate to={`/student/${action}/${parameter1}`} replace />;
    }
    return <Navigate to={`/student/dashboard/${courseId}`} />;
  }

  const { course } = data;

  return (
    <Modal
      modalState
      // Don’t allow closing this modal
      closeModal={() => {}}
      showCloseButton={false}
      title={`Research Consent ${course ? `for ${course.title}` : ''}`}
      cardClassName="quiz-scores-report-modal"
    >
      <a href={course.consentFormUrl} target="_blank" rel="noopener noreferrer">
        If the form does not display, click here
      </a>
      <iframe src={course.consentFormUrl} title="Consent Document" className="consent-form-frame" />

      <div className="has-text-centered">
        <OptionSelector
          className="consent-form-options-container"
          type="radio"
          name="consent"
          onChange={newConsent => setConsent(newConsent)}
          value={consent}
          options={consentOptions}
        />
        <br />
        <button
          type="submit"
          className={`button is-primary consent-form-submit-button ${saving ? 'is-loading' : ''}`}
          disabled={consent === 'none'}
          onClick={submitConsent}
        >
          Save Consent
        </button>
      </div>
    </Modal>
  );
};

export default CourseConsentForm;
