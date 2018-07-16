import React, { Component } from 'react';

export default class CreateCourseForm extends Component {
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
        
    }

    render() {
        return (
            <div>
                <div className="field control">
                    <input type="text"
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