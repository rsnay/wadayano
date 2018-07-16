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
let configLoader = {};
try {
  configLoader = require('../config');
} catch (ex) {
  throw Error('Make sure server/config.js is in place and contains the correct constants');
}
// Make the config immutable
const config = configLoader;

// TODO These will eventually need to come from the database, and likely be course-specific
const consumer_key = 'jisc.ac.uk';
const consumer_secret = 'secret';

// Directory to serve static files from
const appDir = '../client/build';

// GraphQL queries and mutations
const resolvers = {
  Query,
  Mutation
}

// Set up prisma DB
const db = new Prisma({
	typeDefs: 'src/generated/prisma.graphql',
	endpoint: config.PRISMA_ENDPOINT,
	secret: config.PRISMA_SECRET,
	debug: true,
});

// Set up our graphql server
const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  resolverValidationOptions :{
    requireResolversForResolveType: false
  },
  context: req => ({
    ...req,
    // Allow this server's mutations and queries to access prisma server
    db
  }),
})

// Handle LTI launch requests
server.post('/lti/:quizId', function(req, res) {
	let quizId = req.params.quizId;

	// Log info
	console.log(`We got an LTI request for quiz ${req.params.quizId}!! ${req.method} ${req.url}`);

	// Get request body
	let body = [];
	req.on('data', (chunk) => {
		body.push(chunk);
	}).on('end', () => {
		body = Buffer.concat(body).toString();
		body = querystring.parse(body);
		// at this point, `body` has the entire request body stored in it as a string
		// console.log(body);

		// Set up LTI provider
		let provider = new lti.Provider(consumer_key, consumer_secret);

		// Validate request
		provider.valid_request(req, body, (error, isValid) => {
			if (!isValid) {
				console.log('Error validating request: ' + error);
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end('Error validating request: ' + error);
			} else {
				console.log('LTI request is valid!');
				let redirectURL = `/student/quiz/${quizId}`;
				// For some reason, immediately redirecting (either via http, meta tag, or javascript) will fail if it's launched in an iframe. So just give them a link to continue in a new window if we detect it's in an iframe.
				//res.redirect(redirectURL); // Won't work in an iframe
				res.writeHead(200, {'Content-Type': 'text/html'});
				res.end(`<html><body><script>function inIframe(){try{return window.self!==window.top}catch(n){return!0}} !inIframe() && window.location.replace('${redirectURL}');</script><h3><a href="${redirectURL}" target="_blank">Continue ></a></h3></body></html>`);
			}
		});

	}).on('error', (err) => {
		// This prints the error message and stack trace to `stderr`.
		console.error(err.stack);
	});
});

// Serve static files last, to catch everything else
server.use(express.static(appDir));

server.start({
  port: config.APP_SERVER_PORT || 4000,
}, () => console.log(`Server is running on port ${config.APP_SERVER_PORT || 4000}`));
