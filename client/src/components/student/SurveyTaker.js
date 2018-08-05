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
          isSubmitting: false
        };
    }

    async _submitSurvey() {
        this.setState({ isSubmitting: true });
        alert('Not yet implemented');
        try {
            // TODO
            await this.props.submitSurveyMutation({
                variables: {
                    courseId: this.props.courseQuery.course.id,
                    survey: this._parseSurveyText(this.state.newSurveyText)
                }
            });
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

        return (
            <section className="section">
                <div className="container">

                    <h3 className="title is-3">{course.title} Survey</h3>

                    <SurveyView survey={course.survey} />

                    <div className="field is-grouped">
                        <p className="control">
                            <button
                                className={"button is-link" + (this.state.isSubmitting ? " is-loading" : "")}
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

// TODO
const SUBMIT_SURVEY = gql`
mutation saveSurveyMutation(
    $courseId:ID!
    $survey:Json!
){
    updateSurvey(
        courseId: $courseId
        survey: $survey
    ){
        id
        survey
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
