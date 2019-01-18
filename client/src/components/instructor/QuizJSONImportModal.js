import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import JSON5 from 'json5';

import ButterToast, { ToastTemplate } from '../shared/Toast';
import Modal from '../shared/Modal';

export class QuizJSONImportModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            jsonInput: '',
            isLoading: false
        };
    }

    async importJSON() {
        // Update the quiz with the new questions
        try {
            const questionData = JSON5.parse(this.state.jsonInput);
            this.setState({ isLoading: true });
            // Send the mutation
            const result = await this.props.saveQuizMutation({
                variables:{
                    id: this.props.quizId,
                    data: { questions: { create : questionData } }
                }
            });
            if (result.errors && result.errors.length > 0) {
                throw result.errors[0];
            }
            ButterToast.raise({
                content: <ToastTemplate content="Questions imported successfully." className="is-success" />,
                timeout: 3000
            });
            // Close this modal, and tell the QuizEditor to refetch data
            this.props.onClose(true);
        } catch (error) {
            ButterToast.raise({
                content: <ToastTemplate content={"The entered JSON was invalid, or there was an error importing the questions: " + error} className="is-danger" />,
                timeout: 3000
            });
        }
        this.setState({ isLoading: false });
    }

    render() {
        return (
            <Modal modalState={true} title="Import Question JSON" closeModal={() => this.props.onClose(false)}>
                <textarea className="textarea is-medium" rows={10}
                    value={this.state.jsonInput}
                    placeholder="Paste question JSON to import into this quiz"
                    disabled={this.state.isLoading}
                    onChange={(e) => this.setState({ jsonInput: e.target.value })} />

                <hr />

                <div className="field is-grouped">
                    <p className="control">
                        <button
                            className={"button" + (this.state.isLoading ? " is-loading" : "")}
                            onClick={() => this.props.onClose(false)}>
                            Cancel
                        </button>
                    </p>
                    <p className="control">
                        <button
                            className={"button is-primary" + (this.state.isLoading ? " is-loading" : "")}
                            onClick={() => this.importJSON()}>
                            Import Questions
                        </button>
                    </p>
                </div>
            </Modal>
        );
    }
}

QuizJSONImportModal.propTypes = {
    quizId: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
};

const QUIZ_SAVE = gql`
mutation quizSaveMutation(
    $id: ID!
    $data: QuizUpdateInput!
){
    updateQuiz(
        id: $id
        data: $data
    ){
        id
    }
}`;

export default graphql(QUIZ_SAVE, {name: 'saveQuizMutation'}) (QuizJSONImportModal);