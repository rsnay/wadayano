import React, { useState } from 'react';
import { useHistory } from 'react-router';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import useForm from 'react-hook-form';
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
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const CreateCourseForm = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [addCourseMutation] = useMutation(ADD_COURSE);
  const { register, handleSubmit } = useForm();
  const history = useHistory();

  const createNewCourse = async ({ title }) => {
    ButterToast.dismissAll();
    // Make sure there is a non-empty course title
    if (title.trim() === '') {
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
    try {
      const result = await addCourseMutation({ variables: { title } });
      // Redirect to the new course
      history.push(`/instructor/course/${result.data.addCourse.id}`);
    } catch (error) {
      ButterToast.raise({
        content: <ToastTemplate content="Error creating new course." className="is-danger" />,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(createNewCourse)}>
      <div className="field control">
        <input
          type="text"
          name="title"
          ref={register}
          className="input"
          maxLength={200}
          placeholder="New Course Title"
        />
      </div>
      <div className="field control">
        <button className="button is-primary" disabled={isCreating} type="submit">
          Create
        </button>
      </div>
    </form>
  );
};

export default CreateCourseForm;
