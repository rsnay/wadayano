# wadayano backend
This project provides the backend services for wadayano.

# Setup
- In this directory, run `yarn` (or `npm install` if using npm)
- Copy `config.example.js` to `config.js` and change the variables to match your environment. Note that any passwords saved when using a particular APP_SECRET will not be verifiable if the APP_SECRET is changed.
- Copy `database/prisma.example.yml` to `database/prisma.yml` and change the variables to match your environment.
- If necessary, run `prisma deploy` to deploy the latest GraphQL schema. Depending on your version, you may need to run `graphql get-schema --project database` to pull down the newest generated Prisma schema.
- Run `node src/index.js`
- Update the client to point to this server instance in `../client/src/constants.js`
