import React, { useState } from 'react';
import { useHistory } from '../../navigation';
import useForm from 'react-hook-form';
import ButterToast, { ToastTemplate } from '../shared/Toast';
import { apiRequest } from '../../api';

/**
 * Card with a simple form to create a new course.
 * Intended for use in CourseList.
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const CreateCourseForm = () => {
  const [isCreating, setIsCreating] = useState(false);
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
      const course = await apiRequest('/api/courses', { method: 'POST', body: { title } });
      // Redirect to the new course
      history.push(`/instructor/course/${course.id}`);
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
