import React from 'react';
import PropTypes from 'prop-types';

/**
 * A simple loading spinner, in the wadayano primary color.
 */
const Spinner = ({ style, children }) => (
  <div className="container section" style={style}>
    <center>
      <div className="button is-large is-primary is-loading">Loading</div>
      {children}
    </center>
  </div>
);

Spinner.propTypes = {
  style: PropTypes.object,
  children: PropTypes.element,
};

export default React.memo(Spinner);
