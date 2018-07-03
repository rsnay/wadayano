import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class ErroxBox extends Component {
    render() {
        return (
            <article className="container message is-danger" style={{marginTop: "3em"}}>
            <div className="message-header">
                <p>Error</p>
                <span className="icon is-large"><i className="fas fa-3x fa-exclamation-circle" aria-hidden="true"></i></span>
            </div>
            <div className="message-body">
                {this.props.children}
            </div>
        </article>
        );
    }
}

ErroxBox.propTypes = {
    children: PropTypes.element
};