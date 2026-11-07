# wadayano frontend

The client uses Vite and requires Node.js 20.19+ or 22.12+.

- Run `npm install`, then `npm start` and open `http://localhost:3000`.
- Run `npm run migrate:local --prefix server/worker`, then `npm run dev:worker`
  from the repository root. The client proxies `/api` and `/lti` requests to
  the Worker on port 8787.
- Run `npm test` for tests and `npm run build` to generate static assets in `build/`.
- After changing `src/styles/BulmaConfig.scss`, run `npm run build-css`; the
  checked-in CSS remains the stylesheet used by the app. `npm run watch-css`
  recompiles it while editing.

The Cloudflare Worker and D1 migration is still in progress. The client uses
same-origin JSON APIs and the local Worker; production migration, account
password-hash compatibility, configured email delivery, and deployment
feasibility still require verification.
