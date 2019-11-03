import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-apollo';
import gql from 'graphql-tag';
import { Redirect } from 'react-router';

import ErrorBox from '../shared/ErrorBox';
import Spinner from '../shared/Spinner';

// This constant is simply used to make sure that the same name is always used for the localStorage key
import { AUTH_TOKEN, AUTH_ROLE, AUTH_ROLE_STUDENT } from '../../constants';
import Modal from '../shared/Modal';
import OptionSelector from '../shared/OptionSelector';

const STUDENT_QUERY = courseId => gql`
  query {
    currentStudent {
      id
      courses(where: { id: "${courseId}" }) {
        id
        title
        consentFormUrl
      }
      courseConsents(where: { course: { id: "${courseId}" } }) {
        consent
      }
    }
  }
`;

const SUBMIT_COURSE_CONSENT_MUTATION = gql`
  mutation($courseId: ID!, $consent: String!) {
    submitCourseConsent(courseId: $courseId, consent: $consent)
  }
`;

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
const CourseConsentForm = ({
  match: {
    params: { token, courseId, action, parameter1 },
  },
}) => {
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
  const student = useQuery(STUDENT_QUERY(courseId));
  const [submitMutation] = useMutation(SUBMIT_COURSE_CONSENT_MUTATION, {
    variables: { courseId, consent },
  });

  // Set selected consent to previously-saved value
  useEffect(() => {
    if (!student.loading && !student.error) {
      const [existingConsent] = student.data.currentStudent.courseConsents;
      if (student.data.currentStudent.courseConsents.length) {
        setConsent(existingConsent.consent);
      }
    }
  }, [student]);

  const submitConsent = async () => {
    setSaving(true);
    try {
      await submitMutation();
    } catch (err) {
      console.log(err);
      setError(
        'There was an error submitting your consent. Please launch this content again from your course’s learning management system.'
      );
    }
    setSaving(false);
    setRedirect(true);
  };

  if (student.loading) {
    return <Spinner />;
  }

  if (error || student.error) {
    return (
      <ErrorBox>
        <p>{error || 'Error loading consent form. Please try again later.'}</p>
      </ErrorBox>
    );
  }

  if (redirect) {
    // If there’s an action, it’s a first launch, and redirect should not push new history entry
    if (action) {
      return <Redirect to={`/student/${action}/${parameter1}`} />;
    }
    return <Redirect push to={`/student/dashboard/${courseId}`} />;
  }

  // Get the first course and courseConsent objects (there will only be one of each)
  const [course] = student.data.currentStudent.courses;

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
