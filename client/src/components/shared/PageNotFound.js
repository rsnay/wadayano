import React from 'react';
import { Link } from 'react-router-dom';

const PageNotFound = () => (
  <article className="container message is-warning" style={{ marginTop: '3em' }}>
    <div className="message-header">
      <p>Page Not Found</p>
      <span className="icon is-large">
        <i className="fas fa-3x fa-exclamation-circle" aria-hidden="true" />
      </span>
    </div>
    <div className="message-body">
      <Link to="/">Return home</Link>
    </div>
  </article>
);

export default PageNotFound;
