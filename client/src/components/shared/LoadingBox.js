import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class LoadingBox extends Component {
    render() {
        return (
            <div className="container section">
                <center>
                    <a className="button is-large is-info is-loading">Loading</a>
                    {this.props.children}
                </center>
            </div>
        );
    }
}

LoadingBox.propTypes = {
    children: PropTypes.element
};