import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import compose from '../../compose';
import ButterToast, { ToastTemplate } from '../shared/Toast';

// A form, intended for inclusion in a modal dialog on the course details page, to edit various course information or delete the course.
class CourseInfoForm extends Component {
  constructor(props) {
    super(props);
    const state = {
      error: '',
      isLoading: false,
      isDeleting: false,
    };
    // List of fields to edit
    // New fields to be edited need to be added here, passed in as part of the `course` prop, and added to the CourseInfoUpdateInput input type in the server’s schema.graphql
    this.fields = [
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
    // Load default value for each field from props (if undefined, set to '' to keep the form fields as controlled components)
    this.fields.forEach(field => {
      state[field.id] = props.course[field.id] || '';
    });
    // Pre-bind this function, to make adding it to input fields easier
    this.handleInputChange = this.handleInputChange.bind(this);
    // Set initial state (not done at beginning, since we mutated when setting default fields)
    this.state = state;
  }

  // When the save button is pressed, or form is submitted via enter key
  async saveCourseInfo(e) {
    if (e) {
      e.preventDefault();
    }
    // Prevent re-submission while loading
    if (this.state.isLoading) {
      return;
    }
    // Check that form is valid (e.g. for URL validation)
    if (!this.formElement.reportValidity()) {
      return;
    }
    // Clear existing error, and set loading
    this.setState({ error: '', isLoading: true });

    // Collect field data, and check that each required field has a value
    const info = {};
    let error = '';
    this.fields.forEach(field => {
      if (field.required && this.state[field.id].trim() === '') {
        error += `${field.title} is required\n`;
      }
      info[field.id] = this.state[field.id];
    });
    if (error !== '') {
      this.setState({ error, isLoading: false });
      return;
    }

    console.log('SUBMIT', info, error);

    // Send update mutation
    try {
      const result = await this.props.updateCourseMutation({
        variables: {
          id: this.props.course.id,
          info,
        },
      });
      if (result.errors && result.errors.length > 0) {
        throw result;
      }
      // Let parent know that save has finished
      if (this.props.onSave) {
        this.props.onSave();
      }
    } catch (e) {
      let message = 'Please try again later.';
      if (e.errors && e.errors.length > 0) {
        message = e.errors[0].message;
      }
      this.setState({ error: `Error saving course info: ${message}`, isLoading: false });
    }
  }

  async deleteCourse() {
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
        this.setState({ isDeleting: true });
        const result = await this.props.courseDelete({
          variables: {
            id: this.props.course.id,
          },
        });
        if (result.errors && result.errors.length > 0) {
          throw result;
        }
        ButterToast.raise({
          content: (
            <ToastTemplate
              content={`${this.props.course.title} was deleted.`}
              className="is-info"
            />
          ),
        });
        this.props.history.push('/instructor/courses');
      } catch (result) {
        ButterToast.raise({
          content: (
            <ToastTemplate
              content="Error deleting course. Please try again later."
              className="is-danger"
            />
          ),
        });
        this.setState({ isDeleting: false });
      }
    } else {
      alert('Course will not be deleted.');
    }
  }

  // Called when the form fields change
  // This function is from https://reactjs.org/docs/forms.html
  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value,
    });
  }

  render() {
    return (
      <form onSubmit={e => this.saveCourseInfo(e)} ref={el => (this.formElement = el)}>
        {this.state.error && <p className="notification is-danger">{this.state.error}</p>}

        {this.fields.map(field => (
          <div className="field" key={field.id}>
            <label className="label">
              {field.title}
              {field.required && ' (required)'}
            </label>
            <div className="control">
              <input
                value={this.state[field.id]}
                name={field.id}
                onChange={this.handleInputChange}
                className="input"
                type={field.type}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
              />
            </div>
            {field.hint !== '' && <p className="help">{field.hint}</p>}
          </div>
        ))}

        <hr />

        <div className="field">
          <p className="control buttons">
            <button className="button" type="button" onClick={this.props.onCancel}>
              Cancel
            </button>
            <button
              className={`button is-danger${this.state.isDeleting ? ' is-loading' : ''}`}
              type="button"
              onClick={() => this.deleteCourse()}
            >
              Delete Course
            </button>
            <button
              className={`button is-primary${this.state.isLoading ? ' is-loading' : ''}`}
              type="submit"
              onClick={() => this.saveCourseInfo()}
            >
              Save Changes
            </button>
          </p>
        </div>
      </form>
    );
  }
}

CourseInfoForm.propTypes = {
  course: PropTypes.object.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

const UPDATE_COURSE = gql`
  mutation updateCourse($id: ID!, $info: CourseInfoUpdateInput!) {
    updateCourse(id: $id, info: $info) {
      id
    }
  }
`;

const COURSE_DELETE = gql`
  mutation courseDelete($id: ID!) {
    deleteCourse(id: $id) {
      id
    }
  }
`;

export default withRouter(
  compose(
    graphql(UPDATE_COURSE, { name: 'updateCourseMutation' }),
    graphql(COURSE_DELETE, { name: 'courseDelete' })
  )(CourseInfoForm)
);
