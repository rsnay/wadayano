import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';
import SurveyView from '../shared/SurveyView';

class SurveyTaker extends Component {
    constructor(props) {
        super(props);

        this.state = {
          isSubmitting: false,
          isComplete: false,
          answers: {}
        };
    }

    // Submit the survey results
    async _submitSurvey() {
        this.setState({ isSubmitting: true });
        try {
            await this.props.submitSurveyMutation({
                variables: {
                    courseId: this.props.courseQuery.course.id,
                    answers: this.state.answers
                }
            });
            this.setState({ isComplete: true });
        } catch (error) {
            alert('There was an error submitting the survey. Please try again later.');
        }
        this.setState({ isSubmitting: false });
    }

    render() {

        if (this.props.courseQuery && this.props.courseQuery.loading) {
            return <LoadingBox />;
        }

        if (this.props.courseQuery && this.props.courseQuery.error) {
            return <ErrorBox><p>Couldn’t load survey. Please try again later.</p></ErrorBox>;
        }

        let course = this.props.courseQuery.course;

        if (this.state.isComplete) {
            return (
                <article className="container message is-success" style={{marginTop: "3em"}}>
                    <div className="message-header">
                        <p>Thanks! Your responses have been saved.</p>
                        <span className="icon is-large"><i className="fas fa-3x fa-check-circle" aria-hidden="true"></i></span>
                    </div>
                    <div className="message-body">
                        <Link className="button" to={"/student/dashboard/" + course.id}>Return to Dashboard</Link>
                    </div>
                </article>
            );
        }

        return (
            <section className="section">
                <div className="container">

                    <h3 className="title is-3">{course.title} Survey</h3>

                    <SurveyView
                        survey={course.survey}
                        selectedAnswers={this.state.answers}
                        onChange={(answers) => this.setState({ answers })}
                        />

                    <div className="field is-grouped">
                        <p className="control">
                            <button
                                className={"button is-link" + (this.state.isSubmitting ? " is-loading is-disabled" : "")}
                                onClick={() => this._submitSurvey()}>
                                Submit Answers
                            </button>
                        </p>
                    </div>

                </div>
            </section>
        );
    }
}

// Get the course information
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id:$id){
        id
        title
        survey
    }
  }
`

// Submit the survey results
const SUBMIT_SURVEY = gql`
mutation saveSurveyMutation(
    $courseId:ID!
    $answers:Json!
){
    submitSurveyResult(
        courseId: $courseId
        answers: $answers
    ){
        id
    }
}`

export default withAuthCheck(compose(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id: props.match.params.courseId } }
        }
    }),
    graphql(SUBMIT_SURVEY, {name: 'submitSurveyMutation'}),
) (SurveyTaker), { student: true });
