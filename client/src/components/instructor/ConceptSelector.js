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
        this.handleInputChange = this.handleInputChange.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({ concept: nextProps.concept })
    }

    handleInputChange(event) {
        this.setConcept(event.target.value, true);
    }

    setConcept(concept, showSuggestions = false) {
        this.setState({ concept, showSuggestions });
        if (this.props.onChange) {
            this.props.onChange(concept);
        }
    }  

    render() {
        // Prepare filtering (non-lowercase is used in display)
        const filterText = this.state.concept.trim();
        const lowerCaseFilterText = filterText.toLowerCase();
        // Use course concepts, if loaded
        const concepts = (this.props.courseQuery && !this.props.courseQuery.loading && !this.props.courseQuery.error && this.props.courseQuery.courseConcepts) ? this.props.courseQuery.courseConcepts : [];
        // Perform filtering
        let filteredConcepts = concepts.filter(concept => (concept.toLowerCase().includes(lowerCaseFilterText)));

        let suggestionsList = this.state.showSuggestions ? (
            <span className="concept-suggestions-list">
            {filteredConcepts.slice(0,10).map(concept => (
                <button key={concept} className="concept-tag tag is-light" onClick={() => this.setConcept(concept, false)}>{concept}</button>
            ))}
            {/* Add current filter text, if not empty or already present */}
            {(filterText !== '' && filteredConcepts.indexOf(filterText) === -1) && 
                <button key={filterText} className="concept-tag tag is-link" onClick={() => this.setConcept(filterText, false)}>+ {filterText}</button>
            }
            </span>
        ) : (<span className="concept-suggestions-list"></span>);

        return (
            <React.Fragment>
                <input
                    value={this.state.concept}
                    onChange={this.handleInputChange}
                    className="input is-inline"
                    type="text"
                    maxLength={200}
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
const COURSE_CONCEPTS_QUERY = gql`
  query courseConceptsQuery($id: ID!) {
    courseConcepts(id:$id)
  }
`

export default withAuthCheck(
    graphql(COURSE_CONCEPTS_QUERY, {
        name: 'courseQuery',
        options: (props) => {
            return { variables: { id: props.courseId } }
        }
    }
) (ConceptSelector), { instructor: true });
