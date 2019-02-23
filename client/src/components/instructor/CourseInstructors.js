import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import { Redirect } from 'react-router-dom';

import ErrorBox from '../shared/ErrorBox';
import ButterToast, { ToastTemplate } from '../shared/Toast';

class CourseInstructors extends Component {
    constructor(props) {
        super(props);
        this.state = {  };
    }

    // Asks for the email address of an instructor to invite and sends to server
    inviteInstructorPrompt(course) {
        let email = window.prompt('Other instructors will have all course permissions, including managing quizzes, deleting the course, and inviting/removing any instructors.\nEnter the email address of the instructor whom you would like to invite to this course:');
        if (!email || email.trim() === '') {
            return;
        }

        // Send the invite
        this.inviteInstructor(course, email.trim());
    }

    // Takes email address of an instructor to invite and sends to server
    async inviteInstructor(course, email) {
        // Send invite mutation
        const result = await this.props.inviteInstructorMutation({
            variables: {
            courseId: course.id,
            email: email
            }
        });
        // Show error, or success string from mutation
        if (result.errors && result.errors.length > 0) {
            ButterToast.raise({
                content: <ToastTemplate content={result.errors[0].message} className="is-danger" />,
                timeout: 3000
            });
        } else {
            ButterToast.raise({
                content: <ToastTemplate content={result.data.sendInstructorCourseInvite} className="is-success" />,
                sticky: true
            });
        }
        this.props.courseQuery.refetch();
    }

    // Removes the given instructor from the course
    async removeInstructor(course, email) {
        if (!window.confirm(`Are you sure you want to remove ${email} from this course?`)) { return; }
        // Send remove mutation
        const result = await this.props.removeInstructorMutation({
            variables: {
            courseId: course.id,
            email: email.trim()
            }
        });
        // Show error, or success string from mutation
        if (result.errors && result.errors.length > 0) {
            ButterToast.raise({
                content: <ToastTemplate content={result.errors[0].message} className="is-danger" />,
                timeout: 12000
            });
        } else {
            ButterToast.raise({
                content: <ToastTemplate content={result.data.removeInstructorFromCourse} className="is-success" />,
            });
        }
        this.props.courseQuery.refetch();
    }
    

    render() {
        if (this.props.courseQuery && this.props.courseQuery.loading && (!this.props.courseQuery.course || !this.props.courseQuery.course.instructors)) { return null; }
        if (this.props.courseQuery && this.props.courseQuery.error) {
            if (this.props.courseQuery.error.message.indexOf('Not Authorised') !== -1) {
                ButterToast.raise({
                    content: <ToastTemplate content="You do not have access to this course." className="is-danger" />
                });
                return <Redirect to="/instructor/courses" />
            } else {
                return <ErrorBox><p>Couldn’t load instructors for this course.</p></ErrorBox>;
            }
        }

        const course = this.props.courseQuery.course;

        return (
            <React.Fragment>
            <div className="is-flex-tablet">
            <span style={{flex: "1 1 0%"}}>
            {course.instructors.map(instructor => 
                <span className="tag is-light is-large is-rounded instructor-tag" style={{margin: ".25rem", paddingRight: "0"}} key={instructor.email}>
                    {instructor.email}&nbsp;
                    <button className="button is-gray is-rounded"
                        onClick={() => this.removeInstructor(course, instructor.email)}
                        title="Remove Instructor"
                    >
                        <span className="icon">
                            <i className="fas fa-user-minus"></i>
                        </span>
                    </button>
                </span>
            )}
            </span>
            <button style={{marginLeft: "1rem"}} className="button is-light"
                onClick={() => this.inviteInstructorPrompt(course)}>
                <span className="icon">
                <i className="fas fa-user-plus"></i>
                </span>
                <span>Invite an Instructor</span>
            </button>
            <br /></div>
            {course.pendingCourseInvites.map(invite => 
                <span className="tag is-warning is-large is-rounded instructor-tag" style={{margin: ".25rem"}} key={invite.email}>
                    {invite.email} (pending)&nbsp;
                    <button className="delete" onClick={() => this.removeInstructor(course, invite.email)} title="Cancel Invite"></button>
                </span>
            )} 
            </React.Fragment>
        );
    }
}

// Get course instructors and pending invites
const COURSE_QUERY = gql`
  query courseQuery($id:ID!) {
    course(id:$id) {
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
  } `;

const INVITE_INSTRUCTOR = gql`
mutation inviteInstructor($email: String!, $courseId: ID!) {
    sendInstructorCourseInvite(email: $email, courseId: $courseId)
} `;

const REMOVE_INSTRUCTOR = gql`
mutation removeInstructor($email: String!, $courseId: ID!) {
    removeInstructorFromCourse(email: $email, courseId: $courseId)
} `;

CourseInstructors.propTypes = {
    courseId: PropTypes.string.isRequired
};

export default compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id:props.courseId } }
        }
    }),
    graphql(INVITE_INSTRUCTOR, {name:"inviteInstructorMutation"}),
    graphql(REMOVE_INSTRUCTOR, {name:"removeInstructorMutation"}),
) (CourseInstructors);
