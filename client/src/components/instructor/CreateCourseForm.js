import React, { Component } from 'react';
import { Redirect } from 'react-router';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import ButterToast, { ToastTemplate } from '../shared/Toast';

export class CreateCourseForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            newTitle: '',
            redirectCourseId: null
        };
    }

    _handleNewTitleChange(event) {
        this.setState({ newTitle: event.target.value });
    }

    _handleNewTitleKeyPress(event) {
        if (event.key === 'Enter') {
            event.target.blur();
            this._createNewCourse();
        }
    }

    async _createNewCourse() {
        // Make sure there is a non-empty course title
        if (this.state.newTitle.trim() === '') {
            ButterToast.raise({
                content: <ToastTemplate content="Please enter a title for the course." className="is-warning" />,
                timeout: 3000
            });
            return;
        }
        // Create the course
        let result = await this.props.addCourseMutation({
            variables: {
                title: this.state.newTitle
            }
        });
        // Redirect to the new course
        this.setState({ redirectCourseId: result.data.addCourse.id });
    }

    render() {
        // If the new course has been created, redirect to it
        if (this.state.redirectCourseId) {
            return (<Redirect push to={{
                pathname: `/instructor/course/${this.state.redirectCourseId}`
            }} />);
        }

        return (
            <div>
                <div className="field control">
                    <input type="text"
                        value={this.state.newTitle}
                        onChange={(e) => this._handleNewTitleChange(e)}
                        onKeyPress={(e) => this._handleNewTitleKeyPress(e)}
                        className="input"
                        maxLength={200}
                        placeholder="New Course Title" />
                </div>
                <div className="field control">
                    <button className="button is-primary" onClick={() => this._createNewCourse()}>Create</button>
                </div>
            </div>
        );
    }
}

export const ADD_COURSE = gql`
mutation addCourseMutation($title:String!)
    {
        addCourse(
            title:$title
        ){
            id
        }
    }`

export default graphql(ADD_COURSE, {name: 'addCourseMutation'}) (CreateCourseForm)