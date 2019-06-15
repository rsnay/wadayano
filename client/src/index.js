import React from 'react';
import ReactDOM from 'react-dom';

import { ApolloProvider } from 'react-apollo';
import { ApolloClient } from 'apollo-client';
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { BrowserRouter } from 'react-router-dom';
import { ApolloLink } from 'apollo-link';
import { unregister } from './registerServiceWorker';
import App from './components/App';

import { AUTH_TOKEN, GRAPHQL_ENDPOINT } from './constants';

const httpLink = new HttpLink({ uri: GRAPHQL_ENDPOINT });

const middlewareAuthLink = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem(AUTH_TOKEN);
  const authorizationHeader = token ? `Bearer ${token}` : null;
  operation.setContext({
    headers: {
      authorization: authorizationHeader,
    },
  });
  return forward(operation);
});

const httpLinkWithAuthToken = middlewareAuthLink.concat(httpLink);

/**
 * Note about fetchPolicy: some queries use cache-and-network for better UX. For these components,
 * rather than check if query is ‘loading,’ check if it doesn’t have the expected data,
 * since the cache-and-network fetch policy returns data from cache but still sets
 * loading=true while it re-fetches the query.
 * For now, leave network-only as the default for queries, since there can be unintended side effects
 * with cache-and-network; configure individual queries as necessary—this also removes some of the ‘magic’
 */
const defaultOptions = {
  watchQuery: {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  },
  query: {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  },
  mutate: {
    errorPolicy: 'all',
  },
};

export const client = new ApolloClient({
  link: httpLinkWithAuthToken,
  cache: new InMemoryCache(),
  defaultOptions,
});

ReactDOM.render(
  <BrowserRouter>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </BrowserRouter>,
  document.getElementById('root')
);

// Don’t use service worker
unregister();
