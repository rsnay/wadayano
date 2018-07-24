// The Application GraphQL Server endpoint to use (and auto-switch for production)
export const GRAPHQL_ENDPOINT = (process.env.NODE_ENV !== 'production') ? 'http://localhost:4000/' : 'https://wadayano.com/api/';

// This constant is simply used to make sure that the same name is always used for the localStorage key
export const AUTH_TOKEN = 'authToken';

// For the client to keep track of which role it is logged in as 
export const AUTH_ROLE = 'authRole';
export const AUTH_ROLE_STUDENT = 'student';
export const AUTH_ROLE_INSTRUCTOR = 'instructor';