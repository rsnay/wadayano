import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useHistory } from 'react-router-dom';
import { useMutation } from 'react-apollo';
import gql from 'graphql-tag';
import useForm from 'react-hook-form';
import ButterToast, { ToastTemplate } from '../shared/Toast';

// List of course fields to edit
/**
 * New fields to be edited need to be:
 * • added to the server’s datamodel.graphql (and server re-deployed)
 * • added below
 * • passed to this component as part of the `course` prop
 * • added to the CourseInfoUpdateInput input type in the server’s schema.graphql
 */
const fields = [
  {
    id: 'title',
    type: 'text',
    title: 'Course Title',
    required: true,
    maxLength: 200,
    placeholder: 'e.g. Introduction to Pathophysiology',
    hint: '',
  },
  {
    id: 'number',
    type: 'text',
    title: 'Course Number',
    required: false,
    maxLength: 200,
    placeholder: 'e.g. CS 101',
    hint: '',
  },
  {
    id: 'lmsUrl',
    type: 'url',
    title: 'Course LMS URL',
    required: false,
    maxLength: 2000,
    placeholder: 'e.g. https://canvas.instructure.com/courses/123456',
    hint:
      'Since students must launch graded quizzes from the LMS, wadayano can provide a link to the LMS to make it easier for students. Enter a course-specific URL that works for students, perhaps pointing to the assignments page.',
  },
  {
    id: 'consentFormUrl',
    type: 'url',
    title: 'Consent Form URL',
    required: false,
    maxLength: 2000,
    placeholder: 'e.g. link to a PDF or Google Docs viewer',
    hint:
      'Enable consent if you are conducting research in your course and intend to publish the results. Students will be shown this form and required to provide yes/no consent when first accessing the course. Students can review the form and change their consent at any time from the course dashboard.',
  },
];

const UPDATE_COURSE = gql`
  mutation updateCourse($id: ID!, $info: CourseInfoUpdateInput!) {
    updateCourse(id: $id, info: $info) {
      id
    }
  }
`;

const DELETE_COURSE = gql`
  mutation courseDelete($id: ID!) {
    deleteCourse(id: $id) {
      id
    }
  }
`;

/**
 * A form, intended for inclusion in a modal dialog on the course details page,
 * to edit various course information or delete the course.
 * This form uses react-hook-form (https://react-hook-form.com/)
 */
const CourseInfoForm = ({ course, onCancel, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit } = useForm();
  const history = useHistory();

  const [deleteCourseMutation] = useMutation(DELETE_COURSE);
  const [updateCourseMutation] = useMutation(UPDATE_COURSE);
  // Load default value for each field from props (if undefined, set to '' to keep the form fields as controlled components)

  // When the save button is pressed, or form is submitted via enter key
  const saveCourseInfo = async formData => {
    // Prevent re-submission while performing operation
    if (isSaving || isDeleting) {
      return;
    }
    // Validation was already performed by react-hook-form
    setIsSaving(true);

    try {
      // Send the mutation
      const result = await updateCourseMutation({
        variables: {
          id: course.id,
          // The “name” attributes of the form elements match the
          // course property names.
          info: formData,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      ButterToast.raise({
        content: <ToastTemplate content="Course info saved." className="is-success" />,
      });

      // Let parent know that save has finished
      if (onSave) {
        onSave();
      }
    } catch (e) {
      console.error(e);
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      ButterToast.raise({
        content: (
          <ToastTemplate content={`Error saving course info: ${message}`} className="is-danger" />
        ),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCourse = async () => {
    const response = window.prompt(
      'Deleting this course will permanently delete all quizzes, students’ quizzes attempts, survey data, and other information associated with this course. This cannot be undone. Type ‘absolutely’ to delete this course.'
    );
    if (response === null) {
      return;
    }
    if (
      response &&
      (response.toLowerCase() === 'absolutely' || response.toLowerCase() === "'absolutely'")
    ) {
      try {
        setIsDeleting(true);
        const result = await deleteCourseMutation({
          variables: {
            id: course.id,
          },
        });
        if (result.errors && result.errors.length > 0) {
          throw result;
        }
        ButterToast.raise({
          content: <ToastTemplate content={`${course.title} was deleted.`} className="is-info" />,
        });
        history.push('/instructor/courses');
      } catch (result) {
        ButterToast.raise({
          content: (
            <ToastTemplate
              content="Error deleting course. Please try again later."
              className="is-danger"
            />
          ),
        });
        setIsDeleting(false);
      }
    } else {
      alert('Course will not be deleted.');
    }
  };

  return (
    <form onSubmit={handleSubmit(saveCourseInfo)}>
      {fields.map(field => (
        <div className="field" key={field.id}>
          <label className="label">
            {field.title}
            {field.required && ' (required)'}
          </label>
          <div className="control">
            <input
              name={field.id}
              defaultValue={course[field.id]}
              ref={register}
              className="input"
              type={field.type}
              required={field.required}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
            />
          </div>
          {field.hint && <p className="help">{field.hint}</p>}
        </div>
      ))}

      <hr />

      <div className="field">
        <p className="control buttons">
          <button className="button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`button is-danger${isDeleting ? ' is-loading' : ''}`}
            type="button"
            onClick={deleteCourse}
          >
            Delete Course
          </button>
          <button className={`button is-primary${isSaving ? ' is-loading' : ''}`} type="submit">
            Save Changes
          </button>
        </p>
      </div>
    </form>
  );
};

CourseInfoForm.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default CourseInfoForm;
