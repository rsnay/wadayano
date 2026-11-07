import React from 'react';
import track from 'react-tracking';
import { apiRequest } from '../api';

/**
 * Wraps the App component with react-tracking and uses a custom dispatch
 * function to send tracking events to the same-origin API
 * @param {App} ComposedComponent
 */
export default function withTracking(ComposedComponent) {
  const WithTracking = props => <ComposedComponent {...props} />;

  WithTracking.displayName = `WithTracking(${ComposedComponent.displayName ||
    ComposedComponent.name ||
    'Component'})`;

  return track(
    {},
    {
      dispatch: data => {
        const { action, ...context } = data;

        return apiRequest('/api/tracking/events', {
          method: 'POST',
          body: { action, context },
        }).catch(error => {
          console.error('Tracking event request failed', error.status || 'network error');
          });
      },
    }
  )(WithTracking);
}
