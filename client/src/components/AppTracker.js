import React from 'react';
import gql from 'graphql-tag';
import track from 'react-tracking';
import { client } from '../index';

/**
 * Wraps the App component with react-tracking and uses a custom dispatch
 * function to send tracking events via a GraphQL mutation
 * @param {App} ComposedComponent
 */
export default function withGraphQLTracking(ComposedComponent) {
  const WithGraphQLTracking = props => <ComposedComponent {...props} />;

  WithGraphQLTracking.displayName = `WithGraphQLTracking(${ComposedComponent.displayName ||
    ComposedComponent.name ||
    'Component'})`;

  // Mutation to send a tracking event
  const TRACK_MUTATION = gql`
    mutation trackEvent($event: TrackingEventCreateInput!) {
      trackEvent(event: $event) {
        id
      }
    }
  `;

  return track(
    {},
    {
      dispatch: data => {
        console.table(data);

        // Extract action from `data` and put rest in context
        const { action, ...context } = data;

        client
          .mutate({
            variables: {
              event: {
                action,
                context,
              },
            },
            mutation: TRACK_MUTATION,
          })
          .then(result => {
            console.table(result);
          })
          .catch(error => {
            console.table(error);
          });
      },
    }
  )(WithGraphQLTracking);
}
