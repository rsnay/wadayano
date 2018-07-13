// GraphQL
const { GraphQLServer } = require('graphql-yoga')
const { Prisma } = require('prisma-binding')
const Query = require('./resolvers/Query')
const Mutation = require('./resolvers/Mutation')

// App server (static and LTI processing)
const express = require('express');
const querystring = require('querystring');
const pathUtils = require('path');
const lti = require('ims-lti');

// App Config
const config = require('../config');

// GraphQL queries and mutations
const resolvers = {
  Query,
  Mutation
}

// Set up graphQL server
const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  resolverValidationOptions :{
    requireResolversForResolveType: false
  },
  context: req => ({
    ...req,
    // Allow this server's mutations and queries to access prisma server
    db: new Prisma({
      typeDefs: 'src/generated/prisma.graphql',
      endpoint: config.PRISMA_ENDPOINT,
      secret: config.PRISMA_SECRET,
      debug: true,
    }),
  }),
})

// Directory to serve static files from
const appDir = '../client/build';

// Serve static files
server.use(express.static(appDir));

// TODO These will eventually need to come from the database, and likely be course-specific
const consumer_key = 'jisc.ac.uk';
const consumer_secret = 'secret';

server.get('/test', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('hi ');
})

server.start({
  port: config.APP_SERVER_PORT || 4000,
}, () => console.log(`Server is running on port ${config.APP_SERVER_PORT || 4000}`));
