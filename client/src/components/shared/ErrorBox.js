import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class ErroxBox extends Component {
    render() {
        return (
            <article class="container message is-danger" style={{marginTop: "3em"}}>
            <div class="message-header">
                <p>Error</p>
                <span class="icon is-large"><i class="fas fa-3x fa-exclamation-circle" aria-hidden="true"></i></span>
            </div>
            <div class="message-body">
                {this.props.children}
            </div>
        </article>
        );
    }
}

ErroxBox.propTypes = {
    children: PropTypes.element
};