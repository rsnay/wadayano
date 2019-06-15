import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const Breadcrumbs = ({ links }) => (
  <nav className="breadcrumb" aria-label="breadcrumbs">
    <ul>
      {links.map(link =>
        link.active === true ? (
          <li className="is-active" key={link.to}>
            <Link to={link.to} aria-current="page">
              {link.title}
            </Link>
          </li>
        ) : (
          <li key={link.to}>
            <Link to={link.to}>{link.title}</Link>
          </li>
        )
      )}
    </ul>
  </nav>
);

Breadcrumbs.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string,
      title: PropTypes.string.isRequired,
      active: PropTypes.bool,
    })
  ).isRequired,
};

export default React.memo(Breadcrumbs);
