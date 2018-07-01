import React, { Component } from 'react';

export default class ErroxBox extends Component {
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