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
`POST /api/auth/password-resets` consumes a single-use link. Passwords created
or reset in the Worker use PBKDF2-HMAC-SHA-256; legacy bcrypt accounts must
reset their password before Worker login. The PBKDF2 cost, SES delivery, and
Free-plan CPU impact still require deployed verification.
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
`/api` paths return JSON 404 responses. Aggregate CSV/export behavior and
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
records. The **Demo Student Login** button on `/login` uses the same fixture
and is enabled only when `DEMO_STUDENT_ENABLED=true` and the Worker request
uses an HTTP localhost origin. Seed the fixture first with `npm run demo:student`;
restart Wrangler after adding the flag to `.dev.vars`.

The Wrangler configuration has a synthetic database ID for local use only.
`migrations/0001_draft_init.sql` is generated from the current Prisma schema and
has been applied to local D1, but is not an approved production migration.
There is no production or preview binding, API implementation, data importer,
or deploy command. Do not use this configuration to deploy or connect it to
real data.

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
