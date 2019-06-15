import React from 'react';
import PropTypes from 'prop-types';

/**
 * Displays a Bulma-styled error box, suitable for rendering in place
 * of an entire page (it has margin, etc.)
 */
const ErrorBox = ({ children }) => (
  <article className="container message is-danger" style={{ marginTop: '3em' }}>
    <div className="message-header">
      <p>Error</p>
      <span className="icon is-large">
        <i className="fas fa-3x fa-exclamation-circle" aria-hidden="true" />
      </span>
    </div>
    <div className="message-body">{children}</div>
  </article>
);

ErrorBox.propTypes = {
  children: PropTypes.element.isRequired,
};

export default ErrorBox;
