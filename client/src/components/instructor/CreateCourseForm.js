import React, { useState } from 'react';
import { Redirect } from 'react-router';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';

import ButterToast, { ToastTemplate } from '../shared/Toast';

export const ADD_COURSE = gql`
  mutation addCourseMutation($title: String!) {
    addCourse(title: $title) {
      id
    }
  }
`;

/**
 * Card with a simple form to create a new course.
 * Intended for use in CourseList.
 */
const CreateCourseForm = () => {
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [redirectCourseId, setRedirectCourseId] = useState(null);

  const [addCourseMutation] = useMutation(ADD_COURSE, {
    variables: { title: newTitle }
  });

  const handleNewTitleChange = event => {
    setNewTitle(event.target.value);
  }

  const createNewCourse = async e => {
    if (e) {
      e.preventDefault();
    }
    // Make sure there is a non-empty course title
    if (newTitle.trim() === '') {
      ButterToast.raise({
        content: (
          <ToastTemplate content="Please enter a title for the course." className="is-warning" />
        ),
        timeout: 3000,
      });
      return;
    }
    // Create the course
    setIsCreating(true);
    const result = await addCourseMutation();

    // Redirect to the new course
    setRedirectCourseId(result.data.addCourse.id);
    setIsCreating(false);
  }

    // If the new course has been created, redirect to it
    if (redirectCourseId) {
      return (
        <Redirect
          push
          to={{
            pathname: `/instructor/course/${redirectCourseId}`,
          }}
        />
      );
    }

    return (
      <form onSubmit={createNewCourse}>
        <div className="field control">
          <input
            type="text"
            value={newTitle}
            onChange={e => handleNewTitleChange(e)}
            className="input"
            maxLength={200}
            placeholder="New Course Title"
          />
        </div>
        <div className="field control">
          <button
            className="button is-primary"
            disabled={isCreating}
            type="submit"
          >
            Create
          </button>
        </div>
      </form>
    );
}

export default CreateCourseForm;
