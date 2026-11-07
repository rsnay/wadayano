import React from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import useApiQuery from '../../useApiQuery';
import { apiRequest } from '../../api';

import ErrorBox from '../shared/ErrorBox';
import ButterToast, { ToastTemplate } from '../shared/Toast';

/**
 * Component to view, add, and remove instructors of a course.
 * Intended for use in CourseDetails
 */
const CourseInstructors = ({ courseId }) => {
  const { error, loading, data, refetch } = useApiQuery(
    `/api/courses/${encodeURIComponent(courseId)}`,
  );
  // Takes email address of an instructor to invite and sends to server
  async function inviteInstructor(email) {
    try {
      const result = await apiRequest(
        `/api/courses/${encodeURIComponent(courseId)}/instructors`,
        { method: 'POST', body: { email } },
      );
      ButterToast.raise({
        content: <ToastTemplate content={result.message} className="is-success" />,
        sticky: true,
      });
    } catch (inviteError) {
      ButterToast.raise({
        content: (
          <ToastTemplate
            content={`Could not send invitation (${inviteError.code || 'request_failed'}).`}
            className="is-danger"
          />
        ),
        timeout: 12000,
      });
    } finally {
      refetch();
    }
  }

  // Asks for the email address of an instructor to invite and sends to server
  function inviteInstructorPrompt() {
    const email = window.prompt(
      'Other instructors will have all course permissions, including managing quizzes, deleting the course, and inviting/removing any instructors.\nEnter the email address of the instructor whom you would like to invite to this course:'
    );
    if (!email || email.trim() === '') {
      return;
    }

    // Send the invite
    inviteInstructor(email.trim());
  }

  // Removes the given instructor from the course
  async function removeInstructor(email) {
    if (!window.confirm(`Are you sure you want to remove ${email} from this course?`)) {
      return;
    }
    try {
      const result = await apiRequest(
        `/api/courses/${encodeURIComponent(courseId)}/instructors`,
        { method: 'DELETE', body: { email: email.trim() } },
      );
      ButterToast.raise({
        content: <ToastTemplate content={result.message} className="is-success" />,
      });
    } catch (removeError) {
      ButterToast.raise({
        content: (
          <ToastTemplate
            content={`Could not remove instructor (${removeError.code || 'request_failed'}).`}
            className="is-danger"
          />
        ),
        timeout: 12000,
      });
    }
    refetch();
  }

  if (error) {
    if (error.status === 403 || error.status === 404) {
      // In case an instructor removed themselves from the course, redirect back to the course list
      ButterToast.raise({
        content: (
          <ToastTemplate content="You do not have access to this course." className="is-danger" />
        ),
      });
      return <Navigate to="/instructor/courses" replace />;
    }
    return (
      <ErrorBox>
        <p>Couldn’t load instructors for this course.</p>
      </ErrorBox>
    );
  }

  // If loading for the first time, don’t render anything (course.course will be populated when refetching)
  if (loading && (!data || !data.course || !data.course.instructors)) {
    return null;
  }
  if (!data || !data.course) return null;

  return (
    <>
      <div className="is-flex-tablet">
        <span style={{ flex: '1 1 0%' }}>
          {data.course.instructors.map(instructor => (
            <span
              className="tag is-white is-large is-rounded instructor-tag"
              key={instructor.email}
            >
              {instructor.email}&nbsp;&nbsp;
              <button
                className="button is-light is-rounded"
                onClick={() => removeInstructor(instructor.email)}
                title="Remove Instructor"
                type="button"
              >
                <span className="icon">
                  {' '}
                  <i className="fas fa-user-minus" />
                </span>
              </button>
            </span>
          ))}
        </span>
        <button
          className="button is-light"
          style={{ marginLeft: '1rem', marginTop: '0.25rem' }}
          onClick={inviteInstructorPrompt}
          type="button"
        >
          <span className="icon">
            <i className="fas fa-user-plus" />
          </span>
          <span>Invite an Instructor</span>
        </button>
        <br />
      </div>
      {data.course.pendingCourseInvites.map(invite => (
        <span
          className="tag is-warning is-large is-rounded instructor-tag-pending"
          key={invite.email}
        >
          {invite.email} (pending)&nbsp;
          <button
            className="delete"
            onClick={() => removeInstructor(invite.email)}
            title="Cancel Invite"
            aria-label="Cancel invite"
            type="button"
          />
        </span>
      ))}
    </>
  );
};

CourseInstructors.propTypes = {
  courseId: PropTypes.string.isRequired,
};

export default CourseInstructors;
