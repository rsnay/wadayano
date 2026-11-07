import React, { useState } from 'react';
import PropTypes from 'prop-types';
import useApiQuery from '../../useApiQuery';

const SUGGESTION_COUNT = 10;

/**
 * Component used in QuestionEditor to suggest concepts from the current
 * course (typeahead) or create a new concept for the question being edited.
 * (Concepts aren’t stored outside of questions, so “creating” a new concept
 * doesn’t do anything in the database.)
 */
const ConceptSelector = ({ courseId, concept, onChange, autoFocus = false }) => {
  const { data } = useApiQuery(`/api/courses/${encodeURIComponent(courseId)}/concepts`);

  const [showSuggestions, setShowSuggestions] = useState(false);

  const setConcept = (newConcept, newShowSuggestions = false) => {
    setShowSuggestions(newShowSuggestions);
    if (onChange) {
      onChange(newConcept);
    }
  };

  // Prepare filtering (non-lowercase is used in display)
  const filterText = concept.trim();
  const lowerCaseFilterText = filterText.toLowerCase();
  // Use course concepts, if loaded
  const concepts = data && data.concepts ? data.concepts : [];
  // Perform filtering
  const filteredConcepts = concepts.filter(c => c.toLowerCase().includes(lowerCaseFilterText));

  const suggestionsList = showSuggestions ? (
    <span className="concept-suggestions-list">
      {filteredConcepts.slice(0, SUGGESTION_COUNT).map(c => (
        <button
          key={c}
          className="concept-tag tag is-light"
          onClick={() => setConcept(c)}
          type="button"
        >
          {c}
        </button>
      ))}
      {/* Add current filter text, if not empty or already present */}
      {filterText !== '' && filteredConcepts.indexOf(filterText) === -1 && (
        <button
          className="concept-tag tag is-link"
          onClick={() => setConcept(filterText)}
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
    <>
      <input
        value={concept}
        autoFocus={autoFocus}
        onFocus={() => setShowSuggestions(true)}
        onChange={e => setConcept(e.target.value, true)}
        className="input is-inline"
        type="text"
        maxLength={200}
        placeholder="Concept"
      />
      {suggestionsList}
    </>
  );
};

ConceptSelector.propTypes = {
  concept: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
  // Concept suggestions will be fetched from all quizzes in the given course
  courseId: PropTypes.string,
};

export default ConceptSelector;
