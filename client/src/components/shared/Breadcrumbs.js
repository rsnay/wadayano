import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

export default class Breadcrumbs extends Component {
    render() {
        return (
            <nav className="breadcrumb" aria-label="breadcrumbs">
                <ul>
                    {this.props.links.map(link => 
                        link.active === true ? 
                            <li className="is-active" key={link.to}>
                                <Link to={link.to} aria-current="page">{link.title}</Link>
                            </li>
                        :
                            <li key={link.to}>
                                <Link to={link.to}>{link.title}</Link>
                            </li>
                    )}
                </ul>
            </nav>
        );
    }
}

Breadcrumbs.propTypes = {
    links: PropTypes.arrayOf(PropTypes.shape({
        to: PropTypes.string,
        title: PropTypes.string.isRequired,
        active: PropTypes.bool
    })).isRequired
};