import React, { Component } from 'react';
import { Link } from 'react-router-dom';

export default class PageNotFound extends Component {
    render() {
        return (
        <article className="section message is-warning">
            <div className="message-header">
                <p>Page Not Found</p>
                <span className="icon is-large"><i className="fas fa-3x fa-exclamation-circle" aria-hidden="true"></i></span>
            </div>
            <div className="message-body">
                <Link to="/">Return home</Link>
            </div>
        </article>
        );
    }
}