import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { withAuthCheck } from '../shared/AuthCheck';

class ConceptSelector extends Component {
    constructor(props) {
        super(props);

        this.state = {
            concept: "",
            showSuggestions: false,
            concepts: []
        };
        this._handleInputChange = this._handleInputChange.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        console.log(nextProps.concept)
        // Workaround for no callback after apollo query finishes loading.
        if (nextProps.quizQuery && !nextProps.quizQuery.loading && !nextProps.quizQuery.error) {
            // Update order of question IDs
            const quiz = nextProps.quizQuery.quiz;
            // Tweak structure so (future) drag-and-drop reorder is easier
            // Map of questions: key=questionId, value=question
            // Array of ordered question IDs that will be changed on reorder
            let questions = new Map();
            let orderedQuestionIds = [];
            quiz.questions.forEach(q => {
                questions.set(q.id, q);
                orderedQuestionIds.push(q.id);
            });
            this.setState({ concept: nextProps.concept, questions, orderedQuestionIds });
        } else {
            this.setState({ concept: nextProps.concept })
        }
    }

    _handleInputChange(event) {
        this._setConcept(event.target.value);
    }

    _setConcept(concept) {
        this.setState({ concept });
        if (this.props.onChange) {
            this.props.onChange(concept);
        }
    }  

    render() {

        let suggestionsList = this.state.showSuggestions && this.state.concepts.length > 0 && (
            <span className="concept-suggestions-list">
            &nbsp; Suggestions: &nbsp;
            {this.state.concepts.map(concept => (
                <button id={concept} key={concept} className="concept-tag tag is-light" onClick={() => this._setConcept(concept)}>{concept}</button>
            ))}
            </span>
        );

        return (
            <span>
                <input
                    value={this.state.concept}
                    onChange={this._handleInputChange}
                    className="input is-inline"
                    type="text"
                    placeholder="Concept" />
            </span>
        );

    }
}

ConceptSelector.propTypes = {
    concept: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    // Concept suggestions will be fetched from all quizzes in the given course
    courseId: PropTypes.string
};

// Get the concepts from the whole course
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id:$id){
        id
        quizzes {
            id {
                questions {
                    id
                    concept
                }
            }
        }
    }
  }
`

export default withAuthCheck(
    graphql(COURSE_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id: props.courseId } }
        }
    })
(ConceptSelector), { instructor: true });
