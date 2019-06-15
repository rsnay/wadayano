import React from 'react';
import { Link } from 'react-router-dom';
import { withRouter } from 'react-router';

/**
 * Main wadayano footer with copyright and legal info
 */
const Footer = () => (
  <footer className="app-footer no-select">
    <div className="content">
      <span className="footer-item">&copy; 2019 wadayano</span>
      <Link to="/terms" className="footer-item">
        Terms
      </Link>
      <Link to="/privacy" className="footer-item">
        Privacy
      </Link>
      <Link to="/about" className="footer-item">
        About
      </Link>
    </div>
  </footer>
);

export default withRouter(Footer);
