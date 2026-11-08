# Worker migration foundation

This directory is an **incomplete, local-only** migration foundation. The
existing server remains authoritative. Do not deploy this Worker or import
production data until the source Prisma 1 database layout and records have been
inventoried and a migration has been rehearsed and reconciled.

## Local Worker

From the repository root, build the client and start the Worker:

```sh
if [ ! -f server/worker/.dev.vars ]; then cp server/worker/.dev.vars.example server/worker/.dev.vars; fi
npm run build
npm run migrate:local --prefix server/worker
npm run dev:worker
```

The Worker listens on port 8787 and uses a local D1 database. In another
terminal, `npm run dev --prefix client` starts Vite on port 3000 and proxies
`/api` and `/lti` requests to that Worker. `POST /api/auth/signup` and
`POST /api/auth/login` create instructor accounts and sessions;
`POST /api/auth/password-reset-requests` sends a reset link and
`POST /api/auth/password-resets` consumes a single-use link that expires after
24 hours. Invalid and future-dated reset-token timestamps are rejected.
Passwords created or reset in the Worker use PBKDF2-HMAC-SHA-256; legacy
bcrypt accounts must reset their password before Worker login. The PBKDF2
cost, SES delivery, and Free-plan CPU impact still require deployed
verification.
`GET /api/health` checks the D1 binding. `GET /api/instructor` returns the
authenticated instructor and course
counts; `GET /api/courses/:id` returns an owned course's details; `POST
/api/courses` creates and links a course atomically; `POST
/api/courses/:id/quizzes` creates a graded quiz; and `PATCH /api/courses/:id`
updates only the instructor-owned course's title, number, LMS URL, and consent
URL. `POST /api/tracking/events` stores validated tracking events for an
authenticated instructor or student. `GET /api/quizzes/:id` returns an owned
quiz's editor metadata, question summaries, and attempt count; `PATCH
/api/quizzes/:id` updates its title and type. Course details include the survey and instructor/invite
summaries. `PUT /api/courses/:id/survey` saves a validated survey; `GET
/api/courses/:id/survey-results` returns enrolled students and their answers
to an owned course's survey; and `DELETE
/api/courses/:id/instructors` removes an instructor or cancels a pending invite
while preserving the last-instructor restriction. `POST
/api/courses/:id/instructors` adds an existing instructor or creates and
emails a 48-hour pending invitation. `POST /api/feedback` sends authenticated
student or instructor feedback while honoring the anonymous option. These
email routes require SES configuration. Enrolled students can read
`GET /api/student/courses/:id/survey` and submit or replace their latest
answers with `POST /api/student/courses/:id/survey-results`. These
authenticated routes verify HS256 tokens against `APP_SECRET`; it must match
the legacy token-signing secret.
`GET /api/courses/:id/scores` returns completed quiz attempts and confidence
details for the owned course, ordered by attempt creation time so the course
summary consistently uses each student's first completed attempt.
`GET /api/quizzes/:id/report` returns the complete enrolled-student, question,
and completed-attempt data for the owned quiz. Profile changes use
`PATCH /api/instructor/profile`. Instructors can delete owned courses and
quizzes with `DELETE /api/courses/:id` and `DELETE /api/quizzes/:id`;
`DELETE /api/quizzes/:id/questions/:questionId` removes a question from that
quiz while preserving questions referenced by student attempts or another
quiz. `POST /api/quizzes/:id/questions/import-json` validates and atomically
imports up to 20 question objects.
Course deletion removes course-scoped quizzes, attempts, confidence data,
enrollments, consent, and survey responses; it preserves student/instructor
accounts, tracking events, and question/option content, including content no
longer used by a quiz. Quiz deletion removes that quiz's attempts while
retaining question-attempt and confidence rows shared with other quizzes.
Removing a question from a quiz preserves question content referenced by
another quiz or historical attempt. These destructive retention behaviors were
verified with isolated in-memory SQLite tests; source data and persistent local
D1 were not modified. Reconcile these semantics with the legacy source before
production migration.
Students can start or resume an enrolled quiz with `POST
/api/student/quizzes/:id/attempt`, save concept confidence with `POST
/api/student/quiz-attempts/:id/concept-confidences`, submit answers with `POST
/api/student/quiz-attempts/:id/questions`, and complete attempts with
`POST /api/student/quiz-attempts/:id/complete`. Start responses omit answer
keys; answer submission validates attempt ownership and quiz membership.
LTI completion posts grades to the configured HTTPS outcome service with up to
two retries after the initial attempt and records passback status.
`GET /api/quizzes/:id/questions/:questionId` returns full editor data,
including answer keys, only when the instructor owns that quiz. `POST
/api/quizzes/:id/questions` creates a sanitized question and options for an
owned quiz; `PUT /api/quizzes/:id/questions/:questionId` updates a question
and its existing options atomically after verifying quiz membership.
`GET /api/courses/:id/concepts` supplies distinct, trimmed concept suggestions
to instructors who own that course.
`GET /api/student` returns the authenticated student's enrolled course list.
`GET /api/student/courses/:id/dashboard` returns the enrolled course's practice
quiz counts and the student's quiz-attempt scoring data. `GET
/api/student/courses/:id/consent` reads the enrolled student's consent state;
`POST` to the same path validates and atomically replaces the student's yes/no
choice. `GET /api/quiz-attempts/:id/review` returns a quiz attempt's review
details only to its student or an instructor who owns the course. `GET
/api/quizzes/:id/importable-questions` returns the course's source quiz and
question summaries for the owning instructor; `POST
/api/quizzes/:id/questions/import` copies selected question content and answer
options from quizzes in that course into the owned destination quiz in one
D1 batch.
Provide `APP_SECRET` through Wrangler's local `.dev.vars` file and configure
the Worker secret separately for each deployed environment. The course list, course
details, quiz editor read and metadata save, course creation/edit forms,
profile read, student course list, survey editor/results/taking, instructor
list/removal, student dashboard and consent form, individual quiz attempt
reviews, and question-importer reads now call these JSON endpoints. `QuestionEditor` loads
question data and concept suggestions from the Worker and saves new and edited
questions through sanitized Worker APIs. Question deletion and quiz deletion
use Worker APIs, with question deletion retaining historical attempts. Student quiz
start/resume, concept confidence, answer submission, review, and completion
use the Worker. Question importer reads and writes now use the Worker.
LTI launch accepts signed quiz requests at
`POST /lti?action=quiz&objectId=:id` or `POST /lti/quiz/:id`, verifies OAuth
HMAC-SHA1 signatures and timestamp/nonce replay protection, enrolls the student,
creates or resumes the attempt, and presents the consent or launch route. The
nonce table is local migration state and must be applied in every environment.
Completed LTI attempts post grades to the configured HTTPS outcome service and
record passback status. Feedback and instructor-invitation mail use AWS SES v2
with Signature Version 4 signing.
The client uses the Worker JSON API for its data and mutation workflows. Other
`/api` paths return JSON 404 responses. Existing survey CSV exports quote each
field and escape embedded quotes; aggregate quiz CSV/export behavior and
production migration remain incomplete.

For local email-route testing, add `AWS_SES_REGION`, `AWS_SES_KEY`,
`AWS_SES_SECRET`, and `AWS_SES_FROM_ADDRESS` to the ignored
`server/worker/.dev.vars` file. Instructor invitations and password resets
also require an HTTPS `PUBLIC_BASE_URL`; feedback requires
`FEEDBACK_EMAIL_ADDRESS`.
`AWS_SES_SESSION_TOKEN` is optional for temporary credentials. Local email
calls use real SES unless the fetch function is mocked, so use a non-production
SES account and verified test recipients. Never commit credentials or place
production secrets in this file.

## Cloudflare deployment

**Production deployment is not ready yet.** The current
`wrangler.jsonc` is local-only and points at a synthetic D1 database ID. The
draft schema migration is not approved for production, and the source-data
inventory, production importer, reconciliation, deployed Free-plan
measurements, and cutover rehearsal are incomplete. Do not connect this
configuration to Cloudflare, run a production D1 migration, or switch live
traffic until the gates in the migration plan have passed. Keep the existing
server authoritative until then.

When those gates are satisfied:

1. Create a dedicated production D1 database in the Cloudflare account and
   region selected for the application. The checked-in
   `wrangler.production.jsonc` is the production configuration template and
   uses a placeholder rather than containing the database ID. Keep the current
   synthetic local database and any preview D1 database separate. The
   production Worker name must match the name in this configuration.
2. Review and rehearse every production schema/data migration on an isolated
   database first. The checked-in `migrations/0001_draft_init.sql` is not
   approved for production. Take an authorized source backup, reconcile all
   records and relationships, rehearse restore and rollback, and verify the
   capacity and security gates before applying reviewed migrations to
   production.
3. In Cloudflare, open **Workers & Pages**, select the production Worker, then
   **Settings > Builds > Connect**. Authorize GitHub and connect
   `rsnay/wadayano`. Set the production branch to `main` and the root directory
   to `server/worker`. Set the build command to:

   ```sh
   npm ci --include=dev && npm ci --prefix ../../client --include=dev && npm run build --prefix ../../client && npm run prepare:production-config
   ```

   Set the deploy command to:

   ```sh
   npx wrangler deploy --config wrangler.production.generated.jsonc
   ```

   Add `D1_DATABASE_ID` as a **Workers Builds build variable** (not a Worker
   runtime variable); the build step inserts it into the generated config.
   The generated file is ignored by Git and is not included in the repository.
   This ID is deployment configuration, not a credential. It does not become
   available to Worker code: the Worker receives the D1 binding as `env.DB`.
   This builds `client/build/` before Wrangler publishes the Worker and assets.
   Enable deployment for `main` only.
   Disable branch previews until they have an isolated Wrangler config, D1
   database, and runtime secrets; never let previews use production data.
   Cloudflare uses the Wrangler version pinned in this project's
   `server/worker/package-lock.json`. Check the build log and deployed Worker
   name after the first push. The production Worker name can be changed in
   `wrangler.production.jsonc` before connecting if a different name is
   required.
4. Configure runtime values in the Worker's **Settings > Variables & Secrets**,
   not in Workers Builds' build variables. Add `AWS_SES_REGION`,
   `AWS_SES_FROM_ADDRESS`, `PUBLIC_BASE_URL`, and `FEEDBACK_EMAIL_ADDRESS` as
   non-secret variables. Add `APP_SECRET`, `AWS_SES_KEY`, and `AWS_SES_SECRET`
   as encrypted secrets. `AWS_SES_SESSION_TOKEN` is an optional secret when
   using temporary AWS credentials. Use a high-entropy `APP_SECRET` that
   matches the existing JWT signing secret if legacy tokens must remain valid.
   Set the canonical, public HTTPS application origin in `PUBLIC_BASE_URL`;
   it is used to create invitation and password-reset links. Set these values
   independently for every environment. Do not add `D1_DATABASE_ID` here; it
   is used only while generating the deployment config in Workers Builds.
5. After the reviewed schema is applied, configure the production hostname and
   HTTPS route, and confirm the exact external URL/path used by existing LTI
   integrations. Test signed LMS launches and grade passback against a
   non-production LMS/course before making the production branch serve live
   traffic. Do not redirect or canonicalize signed LTI requests without
   verifying the signature behavior.

Cloudflare's [Workers Builds guide](https://developers.cloudflare.com/workers/ci-cd/builds/)
describes connecting an existing Worker; its
[build configuration reference](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
covers branch, root directory, build, and deploy commands.

## AWS SES setup

The Worker sends through the SES v2 HTTPS API, not SMTP. In AWS, choose one SES
region and in that region:

1. Verify the sending domain (recommended) or exact sender email address in
   **Amazon SES > Configuration > Identities**. Publish the DNS verification
   and DKIM records SES provides, then wait for the identity to show verified.
   Configure SPF and DMARC for the sending domain as appropriate for your mail
   policy. `AWS_SES_FROM_ADDRESS` must be an address covered by that verified
   identity.
2. If the SES account is still in its sandbox, request production access before
   sending to users. Sandbox recipients must also be verified (or use the SES
   mailbox simulator). Production access is regional; keep test email limited
   to addresses you control until sending access and delivery behavior are
   confirmed.
3. Create a dedicated IAM principal for this application with only the SES
   send permission needed (`ses:SendEmail`), scoped to the sending identity and
   region where supported. Create an access key for that principal. Store its
   access key ID as `AWS_SES_KEY` and secret access key as `AWS_SES_SECRET`.
   Do not use root credentials, SMTP credentials, or check either value into
   Git. Rotate the key by updating the Worker secret and then retiring the old
   key. The Worker supports an optional session token, but the access key
   credentials above are the configured production path.
4. Set `AWS_SES_REGION` to the region containing the verified identity and
   `AWS_SES_FROM_ADDRESS` to the verified sender. Set
   `FEEDBACK_EMAIL_ADDRESS` to an inbox controlled by the application team.
   Store all three as Worker runtime variables. Keep AWS account region,
   identity, sender, and Worker variables consistent.
5. For local testing, use a separate SES identity/account and verified test
   recipients in ignored `.dev.vars`. Never use production keys locally. The
   SES implementation reports missing credentials as
   `email_not_configured` and rejected delivery as `email_delivery_failed`;
   investigate provider logs/status without logging message contents, tokens,
   student data, or credentials.

See AWS's [SES identity setup](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html)
and [production access / sandbox guide](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
for the current AWS-console steps and regional restrictions.

## Post-deployment verification

Use synthetic accounts and records first, and a non-production LMS and SES
recipients until the migration and cutover are explicitly approved.

1. In the Cloudflare Worker dashboard, confirm the `main` build succeeded, the
   intended version is active, and the production D1 binding and runtime
   variables/secrets are attached to the deployed Worker. Review logs and D1
   metrics for errors, CPU, rows read/written, and storage; compare measured
   usage with the migration plan's limits and 50% headroom gates.
2. Request `GET /api/health` on the deployed hostname. It must return a
   successful JSON response and confirm the production D1 binding is reachable.
   Confirm an unknown `/api/...` path returns a JSON 404 rather than SPA HTML.
   Open the app's welcome and login pages, refresh nested routes, and confirm
   static assets and SPA fallback work without Worker/API errors.
3. Exercise signup/login, protected-route redirects, password reset, and
   logout with a test instructor. Exercise an owned course and quiz, question
   editor/import, student quiz start/resume/answer/review, survey submission,
   consent, and reports/exports with synthetic records. Confirm ownership
   checks, answer-key suppression, complete exports, and expected error paths.
4. Send a password-reset request to a controlled test account and verify the
   email's sender, destination, HTTPS link, expiry, and one-time use. Exercise
   an instructor invitation and feedback email using test users. Confirm
   invalid/missing SES configuration and SES delivery failures surface as
   failures rather than success. Do not include real student data in test
   records or logs.
5. Using a non-production LMS, verify valid and tampered LTI signatures,
   timestamp/nonce replay rejection, student enrollment, consent, quiz
   launch, completion, and grade passback, including LMS and email failures.
   Confirm the actual LMS launch URL still has the expected host and path.
6. Re-run the client and Worker tests and schema validation, inspect the
   Cloudflare build/deployment logs, and rehearse D1 backup/restore and
   application rollback. Monitor daily requests, CPU, D1 rows/size, SES bounces
   and complaints, and errors after cutover. Stop and roll back using the
   rehearsed data-safe procedure if data reconciliation, access control,
   email, LTI, capacity, or integrity checks fail.

## Demo student

With the local Worker running on port 8787, run this from the repository root
in another terminal:

```sh
npm run demo:student
```

The command seeds idempotent synthetic D1 data (`demo-student`, `demo-course`,
`demo-practice-quiz`, two questions, a completed attempt, and a survey response),
posts a signed local LTI launch, verifies the student and dashboard APIs, and
prints a URL to open in the browser. Open the URL printed by the most recent
run; revisiting `/student/dashboard` alone keeps the browser's existing token.
If that token is stale, use **Log Out** first, then open the new demo URL. The
demo uses the `APP_SECRET` from
`server/worker/.dev.vars`; the example file contains a public, demo-only secret
that must never be used outside local development. This is a fake LTI launch,
not a student password login. It does not contact an LMS or use production
records. The **Demo Student Login** button on `/login` uses the same fixture.
Seed the fixture first with `npm run demo:student`.

The Wrangler configuration has a synthetic database ID for local use only.
`migrations/0001_draft_init.sql` is generated from the current Prisma schema and
has been applied to local D1, but is not an approved production migration.
Production and preview bindings, the production data importer, and a production
deployment configuration are not yet available. Do not use this configuration
to deploy or connect it to real data.

The Prisma schema models the entities in `../database/datamodel.graphql` and
uses explicit join tables for relationships that have no backlink in the
legacy model. The real source's relationship cardinalities, nullable records,
delete semantics, ordering, and JSON/date encodings still require verification.
In particular, join-table cascades remove links rather than automatically
deleting linked question/attempt/confidence entities; application deletion
workflows must be implemented and tested explicitly. The existing D1 adapter
does not guarantee atomic nested writes: use tested D1 batches for operations
that require atomicity.

Use Node.js 24 or later for the built-in SQLite test runner. Run
`npm run schema:validate`, `npm run generate`, and `npm test` here.
`npm run schema:diff` prints a draft initial SQLite migration; it is not an
approved production migration. `npm run migrate:local` applies the checked-in
draft through Wrangler to local D1 only.
