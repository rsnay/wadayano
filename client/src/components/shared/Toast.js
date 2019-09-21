import React from 'react';
import PropTypes from 'prop-types';
import ButterToast from 'butter-toast';

// Export the lean ButterToast class, as well as our template
// See ButterToast docs: https://github.com/ealush/butter-toast
export default ButterToast;

export const ToastTemplate = ({ dismiss, className, content }) => (
  <div className={`notification ${className}`} onClick={dismiss}>
    <button className="delete" type="button" title="Dismiss" aria-label="Dismiss Notification" />
    {content}
  </div>
);

ToastTemplate.propTypes = {
  dismiss: PropTypes.func,
  className: PropTypes.string,
  content: PropTypes.string.isRequired,
};

/*
Example usage:

import ButterToast, { ToastTemplate } from '../shared/Toast';

ButterToast.raise({
    content: <ToastTemplate content="Something great happened." className="is-success" />,
    timeout: 3000
});

*/
