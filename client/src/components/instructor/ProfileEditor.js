import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

import ErrorBox from '../shared/ErrorBox';
import LoadingBox from '../shared/LoadingBox';

class ProfileEditor extends Component {
    constructor(props) {
        super(props);

        this.state = {
            instructorLoaded: false,
            isSaving: false
        };
    }

    // This is kind of a react anti-pattern to seed state from props, but without a proper callback for when the apollo query finishes loading, it's the easiest way.
    componentWillReceiveProps(nextProps) {
        if (!nextProps.instructorQuery.loading && !this.state.instructorLoaded) {
            // TODO
            /*this.setState({
                newSurveyText: this._stringifySurvey(nextProps.courseQuery.course.survey),
                surveyLoaded: true
            });*/
        }
    }

    // If navigating away from this component and back to it, apollo won't reload the query, but automatically populate the courseQuery prop. So handle that case on component mount.
    componentDidMount() {
        // TODO
        /*if (!this.state.surveyLoaded && this.props.courseQuery && !this.props.courseQuery.loading && this.props.courseQuery.course.survey) {
            this.setState({
                newSurveyText: this._stringifySurvey(this.props.courseQuery.course.survey),
                surveyLoaded: true
            });
        }*/
    }

    async _saveSurvey() {
        this.setState({ isSaving: true });
        try {
            await this.props.saveSurveyMutation({
                variables: {
                    courseId: this.props.courseQuery.course.id,
                    survey: this._parseSurveyText(this.state.newSurveyText)
                }
            });
        } catch (error) {
            alert('There was an error saving the survey. Please copy the text somewhere safe and try again later.');
        }
        this.setState({ isSaving: false });
    }

    render() {

        if (this.props.instructorQuery && this.props.instructorQuery.loading) {
            return <LoadingBox />;
        }

        if (this.props.instructorQuery && this.props.instructorQuery.error) {
            return <ErrorBox><p>Couldn’t load instructor profile</p></ErrorBox>;
        }

        const instructor = this.props.instructorQuery.currentInstructor;

        return (
            <section className="section">
                <div className="container">

                    <h3 className="title is-3">My Profile</h3>
                    <hr /><br />

                    {/* TODO form to edit the profile */}
                    <pre>{JSON.stringify(instructor)}</pre>

                    <br /> <br />
                    <div className="field is-grouped">
                        <p className="control">
                            <Link className="button" to="/instructor/courses">Cancel</Link>
                        </p>
                        <p className="control">
                            <button
                                className={"button is-primary" + (this.state.isSaving ? " is-loading" : "")}
                                onClick={() => alert('Not yet implemented')}>
                                Update Profile
                            </button>
                        </p>
                    </div>


                </div>
            </section>
        );
    }
}

// Get the instructor’s profile
const INSTRUCTOR_QUERY = gql`
  query instructorQuery {
    currentInstructor {
        id
        email
        createdAt
        courses {
            id
        }
    }
  }
`

// TODO
const SAVE_INSTRUCTOR = gql`
mutation saveInstructorMutation(
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
    graphql(INSTRUCTOR_QUERY, { name: 'instructorQuery' }),
    graphql(SAVE_INSTRUCTOR, {name: 'saveInstructorMutation'}),
) (ProfileEditor), { instructor: true });
