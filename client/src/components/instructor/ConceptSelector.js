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
            conceptsLoaded: false,
            concepts: []
        };
        this._handleInputChange = this._handleInputChange.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        // Workaround for no callback after apollo query finishes loading.
        if (!this.state.conceptsLoaded && nextProps.courseQuery && !nextProps.courseQuery.loading && !nextProps.courseQuery.error) {
            // Get concepts from all quizzes in the course
            let concepts = new Set();

            const course = nextProps.courseQuery.course;
            course.quizzes.forEach(quiz => {
                quiz.questions.forEach(question => {
                    concepts.add(question.concept.trim());
                })
            });
            // In case of an empty concept, remove it
            concepts.delete('');
            concepts = Array.from(concepts);

            this.setState({ concept: nextProps.concept, conceptsLoaded: true, concepts });
        } else {
            this.setState({ concept: nextProps.concept })
        }
    }

    _handleInputChange(event) {
        this._setConcept(event.target.value, true);
    }

    _setConcept(concept, showSuggestions = false) {
        this.setState({ concept, showSuggestions });
        if (this.props.onChange) {
            this.props.onChange(concept);
        }
    }  

    render() {
        // Filter all concepts
        const filterText = this.state.concept.trim();
        const lowerCaseFilterText = filterText.toLowerCase();
        let filteredConcepts = this.state.concepts.filter(concept => (concept.toLowerCase().includes(lowerCaseFilterText)));

        // Add current filter text, if not empty or already present
        if (this.state.concept.trim() !== '' && filteredConcepts.indexOf(this.state.concept.trim()) === -1) {
            //filteredConcepts.push(this.state.concept.trim());
        }


        let suggestionsList = this.state.showSuggestions && (
            <span className="concept-suggestions-list">
            {filteredConcepts.map(concept => (
                <button key={concept} className="concept-tag tag is-light" onClick={() => this._setConcept(concept, false)}>{concept}</button>
            ))}
            {/* Add current filter text, if not empty or already present */}
            {(filterText !== '' && filteredConcepts.indexOf(filterText) === -1) && 
                <button key={filterText} className="concept-tag tag is-link" onClick={() => this._setConcept(filterText, false)}>+ {filterText}</button>
            }
            </span>
        );

        return (
            <React.Fragment>
                <input
                    value={this.state.concept}
                    onChange={this._handleInputChange}
                    className="input is-inline"
                    type="text"
                    placeholder={this.props.placeholder} />
                {suggestionsList}
            </React.Fragment>
        );

    }
}

ConceptSelector.propTypes = {
    concept: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    // Concept suggestions will be fetched from all quizzes in the given course
    courseId: PropTypes.string,
    placeholder: PropTypes.string
};

ConceptSelector.defaultProps = {
    placeholder: 'Concept'
};

// Get the concepts from the whole course
const COURSE_QUERY = gql`
  query courseQuery($id: ID!) {
    course(id:$id){
        id
        quizzes {
            id
            questions {
                id
                concept
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
    }
) (ConceptSelector), { instructor: true });
