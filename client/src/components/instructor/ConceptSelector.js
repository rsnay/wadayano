import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

const SUGGESTION_COUNT = 10;

class ConceptSelector extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showSuggestions: false,
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
  }

  setConcept(concept, showSuggestions = false) {
    this.setState({ showSuggestions });
    if (this.props.onChange) {
      this.props.onChange(concept);
    }
  }

  handleFocus() {
    this.setState({ showSuggestions: true });
  }

  handleInputChange(event) {
    this.setConcept(event.target.value, true);
  }

  render() {
    // Prepare filtering (non-lowercase is used in display)
    const filterText = this.props.concept.trim();
    const lowerCaseFilterText = filterText.toLowerCase();
    // Use course concepts, if loaded
    const { conceptsQuery } = this.props;
    const concepts =
      conceptsQuery && !conceptsQuery.error && conceptsQuery.courseConcepts
        ? conceptsQuery.courseConcepts
        : [];
    // Perform filtering
    const filteredConcepts = concepts.filter(concept =>
      concept.toLowerCase().includes(lowerCaseFilterText)
    );

    const suggestionsList = this.state.showSuggestions ? (
      <span className="concept-suggestions-list">
        {filteredConcepts.slice(0, SUGGESTION_COUNT).map(concept => (
          <button
            key={concept}
            className="concept-tag tag is-light"
            onClick={() => this.setConcept(concept, false)}
            type="button"
          >
            {concept}
          </button>
        ))}
        {/* Add current filter text, if not empty or already present */}
        {filterText !== '' && filteredConcepts.indexOf(filterText) === -1 && (
          <button
            className="concept-tag tag is-link"
            onClick={() => this.setConcept(filterText, false)}
            type="button"
          >
            + {filterText}
          </button>
        )}
      </span>
    ) : (
      <span className="concept-suggestions-list" />
    );

    return (
      <React.Fragment>
        <input
          value={this.props.concept}
          autoFocus={this.props.autoFocus}
          onFocus={this.handleFocus}
          onChange={this.handleInputChange}
          className="input is-inline"
          type="text"
          maxLength={200}
          placeholder={this.props.placeholder}
        />
        {suggestionsList}
      </React.Fragment>
    );
  }
}

ConceptSelector.propTypes = {
  concept: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
  // Concept suggestions will be fetched from all quizzes in the given course
  courseId: PropTypes.string,
  placeholder: PropTypes.string,
};

ConceptSelector.defaultProps = {
  placeholder: 'Concept',
  autoFocus: false,
};

// Get the concepts from the whole course
const CONCEPTS_QUERY = gql`
  query courseConceptsQuery($id: ID!) {
    courseConcepts(id: $id)
  }
`;

export default graphql(CONCEPTS_QUERY, {
  name: 'conceptsQuery',
  options: props => {
    return { fetchPolicy: 'cache-and-network', variables: { id: props.courseId } };
  },
})(ConceptSelector);
