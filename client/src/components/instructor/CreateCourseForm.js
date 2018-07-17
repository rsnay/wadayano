import React, { Component } from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';

export class CreateCourseForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            newTitle: ''
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

    _createNewCourse() {
        this.props.addCourseMutation({
            variables: {
                id:"cjjej0vhi0w5f0b370p49q85c",
                title:document.getElementById("newCourseTitle").value
            }
        });
        //window.location.reload(true);
    }

    render() {
        return (
            <div>
                <div className="field control">
                    <input type="text"
                        id="newCourseTitle"
                        ref="newCourseTitle"
                        value={this.state.newTitle}
                        onChange={(e) => this._handleNewTitleChange(e)}
                        onKeyPress={(e) => this._handleNewTitleKeyPress(e)}
                        className="input"
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
mutation addCourseMutation($id:ID!, $title:String!)
    {
        addCourse(
            id:$id
            title:$title
        ){
            title
        }
    }`

export default graphql(ADD_COURSE, {name: 'addCourseMutation'}) (CreateCourseForm)