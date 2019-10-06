import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql, useQuery, useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import { Redirect } from 'react-router-dom';

import compose from '../../compose';
import ErrorBox from '../shared/ErrorBox';
import ButterToast, { ToastTemplate } from '../shared/Toast';

// Get course instructors and pending invites
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id: $id) {
      id
      instructors {
        id
        email
      }
      pendingCourseInvites {
        id
        createdAt
        email
      }
    }
  }
`;

const INVITE_INSTRUCTOR = gql`
  mutation inviteInstructor($email: String!, $courseId: ID!) {
    sendInstructorCourseInvite(email: $email, courseId: $courseId)
  }
`;

const REMOVE_INSTRUCTOR = gql`
  mutation removeInstructor($email: String!, $courseId: ID!) {
    removeInstructorFromCourse(email: $email, courseId: $courseId)
  }
`;

/**
 * Component to view, add, and remove instructors of a course.
 * Intended for use in CourseDetails
 */
const CourseInstructors = ({ courseId }) => {
  const { error, loading, data: course, refetch } = useQuery(COURSE_QUERY, {
    variables: { id: courseId },
  });
  const [inviteInstructorMutation] = useMutation(INVITE_INSTRUCTOR);
  const [removeInstructorMutation] = useMutation(REMOVE_INSTRUCTOR);

  // Takes email address of an instructor to invite and sends to server
  async function inviteInstructor(email) {
    // Send invite mutation
    const result = await inviteInstructorMutation({
      variables: {
        courseId,
        email,
      },
    });
    // Show error, or success string from mutation
    if (result.errors && result.errors.length > 0) {
      ButterToast.raise({
        content: <ToastTemplate content={result.errors[0].message} className="is-danger" />,
        timeout: 3000,
      });
    } else {
      ButterToast.raise({
        content: (
          <ToastTemplate content={result.data.sendInstructorCourseInvite} className="is-success" />
        ),
        sticky: true,
      });
    }
    refetch();
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
    // Send remove mutation
    const result = await removeInstructorMutation({
      variables: {
        courseId,
        email: email.trim(),
      },
    });
    // Show error, or success string from mutation
    if (result.errors && result.errors.length > 0) {
      ButterToast.raise({
        content: <ToastTemplate content={result.errors[0].message} className="is-danger" />,
        timeout: 12000,
      });
    } else {
      ButterToast.raise({
        content: (
          <ToastTemplate content={result.data.removeInstructorFromCourse} className="is-success" />
        ),
      });
    }
    refetch();
  }

  if (error) {
    if (error.message.indexOf('Not Authorised') !== -1) {
      // In case an instructor removed themselves from the course, redirect back to the course list
      ButterToast.raise({
        content: (
          <ToastTemplate content="You do not have access to this course." className="is-danger" />
        ),
      });
      return <Redirect to="/instructor/courses" />;
    }
    return (
      <ErrorBox>
        <p>Couldn’t load instructors for this course.</p>
      </ErrorBox>
    );
  }

  // If loading for the first time, don’t render anything (course.course will be populated when refetching)
  if (loading && (!course || !course.course || !course.course.instructors)) {
    return null;
  }

  return (
    <>
      <div className="is-flex-tablet">
        <span style={{ flex: '1 1 0%' }}>
          {course.course.instructors.map(instructor => (
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
      {course.course.pendingCourseInvites.map(invite => (
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
