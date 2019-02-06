import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class LoadingBox extends Component {
    render() {
        return (
            <div className="container section" {...this.props}>
                <center>
                    <div className="button is-large is-primary is-loading">Loading</div>
                    {this.props.children}
                </center>
            </div>
        );
    }
}

LoadingBox.propTypes = {
    children: PropTypes.element
};