import { createHmac, randomUUID } from 'node:crypto';

const DEMO_COURSE_ID = 'demo-course';
const DEMO_QUIZ_ID = 'demo-practice-quiz';
const DEMO_LTI_SECRET = 'wadayano-local-demo-consumer-secret';
const DEMO_STUDENT_ID = 'wadayano-local-demo-student';
const DEMO_STUDENT_NAME = 'Demo Student';
const DEMO_STUDENT_EMAIL = 'demo-student@example.test';
const DEFAULT_WORKER_URL = 'http://localhost:8787';

function oauthEncode(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function signatureBaseString(url, parameters) {
  const normalizedParameters = [...parameters.entries()]
    .filter(([key]) => key !== 'oauth_signature')
    .map(([key, value]) => [oauthEncode(key), oauthEncode(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
      leftKey < rightKey ? -1
        : leftKey > rightKey ? 1
          : leftValue < rightValue ? -1
            : leftValue > rightValue ? 1
              : 0
    ))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  return `POST&${oauthEncode(baseUrl)}&${oauthEncode(normalizedParameters)}`;
}

function assertLocalUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:'
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('DEMO_WORKER_URL must be an HTTP localhost URL');
  }
  return url;
}

async function postDemoLaunch(workerUrl) {
  const launchUrl = new URL(`/lti/quiz/${DEMO_QUIZ_ID}`, workerUrl);
  const parameters = new URLSearchParams({
    oauth_consumer_key: DEMO_COURSE_ID,
    oauth_nonce: randomUUID(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
    user_id: DEMO_STUDENT_ID,
    lis_person_name_full: DEMO_STUDENT_NAME,
    lis_person_contact_email_primary: DEMO_STUDENT_EMAIL,
  });
  const signature = createHmac('sha1', `${oauthEncode(DEMO_LTI_SECRET)}&`)
    .update(signatureBaseString(launchUrl, parameters))
    .digest('base64');
  parameters.set('oauth_signature', signature);

  const response = await fetch(launchUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: parameters,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`LTI launch failed (${response.status}): ${body.error ?? 'unknown_error'}`);
  }

  const html = await response.text();
  const launchPathMatch = /window\.location\.replace\(("(?:\\.|[^"\\])*")\)/.exec(html);
  if (!launchPathMatch) {
    throw new Error('LTI launch response did not contain a student redirect');
  }
  const launchPath = JSON.parse(launchPathMatch[1]);
  const tokenMatch = /^\/student\/(?:launch|consent)\/([^/]+)\//.exec(launchPath);
  if (!tokenMatch) {
    throw new Error('LTI launch response did not contain a student token');
  }
  return { launchPath, token: tokenMatch[1] };
}

async function verifyStudentApi(workerUrl, token, launchPath) {
  const headers = { authorization: `Bearer ${token}` };
  const response = await fetch(new URL('/api/student', workerUrl), { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`GET /api/student failed (${response.status}): ${body.error ?? 'unknown_error'}`);
  }

  const student = await response.json();
  if (student.id !== 'demo-student'
    || !student.courses?.some(course => course.id === DEMO_COURSE_ID)) {
    throw new Error('Demo student or course fixture was not returned by GET /api/student');
  }

  const dashboardResponse = await fetch(
    new URL(`/api/student/courses/${DEMO_COURSE_ID}/dashboard`, workerUrl),
    { headers },
  );
  if (!dashboardResponse.ok) {
    const body = await dashboardResponse.json().catch(() => ({}));
    throw new Error(
      `Student dashboard failed (${dashboardResponse.status}): ${body.error ?? 'unknown_error'}`,
    );
  }
  const dashboard = await dashboardResponse.json();
  if (!dashboard.course.quizzes.some(quiz => quiz.id === DEMO_QUIZ_ID)
    || !dashboard.quizAttempts.some(attempt => attempt.id === 'demo-past-attempt')) {
    throw new Error('Demo quiz or completed attempt is missing from the student dashboard');
  }

  const surveyResponse = await fetch(
    new URL(`/api/student/courses/${DEMO_COURSE_ID}/survey`, workerUrl),
    { headers },
  );
  if (!surveyResponse.ok) {
    const body = await surveyResponse.json().catch(() => ({}));
    throw new Error(
      `Student survey failed (${surveyResponse.status}): ${body.error ?? 'unknown_error'}`,
    );
  }
  const survey = await surveyResponse.json();
  if (survey.course.survey.questions.length !== 1) {
    throw new Error('Demo course survey fixture is missing');
  }

  const consentResponse = await fetch(
    new URL(`/api/student/courses/${DEMO_COURSE_ID}/consent`, workerUrl),
    { headers },
  );
  if (!consentResponse.ok) {
    const body = await consentResponse.json().catch(() => ({}));
    throw new Error(
      `Student consent failed (${consentResponse.status}): ${body.error ?? 'unknown_error'}`,
    );
  }

  const attemptResponse = await fetch(
    new URL(`/api/student/quizzes/${DEMO_QUIZ_ID}/attempt`, workerUrl),
    { method: 'POST', headers },
  );
  if (!attemptResponse.ok) {
    const body = await attemptResponse.json().catch(() => ({}));
    throw new Error(
      `Student quiz attempt failed (${attemptResponse.status}): ${body.error ?? 'unknown_error'}`,
    );
  }
  const attempt = await attemptResponse.json();
  if (attempt.quizAttempt.quiz.questions.length !== 2
    || attempt.quizAttempt.quiz.questions.some(question => (
      Object.hasOwn(question, 'correctShortAnswers')
      || question.options.some(option => Object.hasOwn(option, 'isCorrect'))
    ))) {
    throw new Error('Demo quiz questions are missing or expose answer keys');
  }

  const landingPath = launchPath.startsWith('/student/consent/')
    ? launchPath
    : `/student/launch/${token}/dashboard/${DEMO_COURSE_ID}`;
  const landingResponse = await fetch(new URL(landingPath, workerUrl));
  if (!landingResponse.ok
    || !landingResponse.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Student dashboard page failed (${landingResponse.status})`);
  }

  return { student, dashboard, attempt };
}

async function main() {
  const workerUrl = assertLocalUrl(process.env.DEMO_WORKER_URL ?? DEFAULT_WORKER_URL);
  const { launchPath, token } = await postDemoLaunch(workerUrl);
  const { student, dashboard, attempt } = await verifyStudentApi(workerUrl, token, launchPath);
  const landingPath = launchPath.startsWith('/student/consent/')
    ? launchPath
    : `/student/launch/${token}/dashboard/${DEMO_COURSE_ID}`;

  console.log(`Signed in as ${student.name}.`);
  console.log(`Verified ${student.courses.length} course(s), ${dashboard.course.quizzes.length} practice quiz(es), ${dashboard.quizAttempts.length} attempt(s), and ${attempt.quizAttempt.quiz.questions.length} answer-key-free quiz question(s).`);
  console.log(`Open this local demo student URL:\n${new URL(landingPath, workerUrl).href}`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
