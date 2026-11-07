# wadayano frontend

The client uses Vite and requires Node.js 20.19+ or 22.12+.

- Run `npm install`, then `npm start` and open `http://localhost:3000`.
- The existing backend must be running on port 4000 for local API requests.
- Run `npm test` for tests and `npm run build` to generate static assets in `build/`.
- After changing `src/styles/BulmaConfig.scss`, run `npm run build-css`; the
  checked-in CSS remains the stylesheet used by the app. `npm run watch-css`
  recompiles it while editing.

The backend migration is not yet complete. The client still uses the existing
GraphQL API.
