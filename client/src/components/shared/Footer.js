import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Main wadayano footer with copyright and legal info
 */
const Footer = () => (
  <footer className="app-footer no-select">
    <div className="content">
      <span className="footer-item">&copy; {new Date().getFullYear()} wadayano</span>
      <Link to="/privacy" className="footer-item">
        Privacy
      </Link>
      <Link to="/about" className="footer-item">
        About
      </Link>
    </div>
  </footer>
);

export default Footer;
