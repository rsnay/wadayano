import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ButterToast from 'butter-toast';
// TODO: this breaks the production webpack build (fails to minify this file)
// import ButterToast from 'butter-toast/dist/lean.min.js';

// Export the lean ButterToast class, as well as our template
// See ButterToast docs: https://github.com/ealush/butter-toast#controlling-the-bundle-size
export default ButterToast;

export const ToastTemplate = ({ dismiss, className, content }) => (
    <div className={"notification " + className} onClick={dismiss}>
        <button className="delete"></button>
        {content}
    </div>
);

ToastTemplate.propTypes = {
    dismiss: PropTypes.func,
    className: PropTypes.string,
    content: PropTypes.string.isRequired
};