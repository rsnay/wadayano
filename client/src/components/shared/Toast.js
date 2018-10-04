import React from 'react';
import PropTypes from 'prop-types';
// The lean build of butter-toast is simply copied into our src directory, since using the npm package was causing production build issues.
import ButterToast from './butter-toast-lean';

// Export the lean ButterToast class, as well as our template
// See ButterToast docs: https://github.com/ealush/butter-toast
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