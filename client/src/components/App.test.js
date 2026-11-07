import React from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { NavigationPromptProvider } from './shared/NavigationPrompt';
import Welcome from './shared/Welcome';

vi.mock('./instructor/QuestionImporter', () => ({ default: () => <div>Question Importer</div> }));
vi.mock('./student/QuizReviewPage', () => ({ default: () => <div>Quiz Review</div> }));
vi.mock('./student/QuizTaker', () => ({ default: () => <div>Take Quiz</div> }));

beforeEach(() => {
  localStorage.clear();
});

it('renders the welcome page', () => {
  const { getByText } = render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>
  );
  expect(getByText('Supporting knowledge monitoring development')).toBeTruthy();
});

it('redirects an unauthenticated instructor deep link to login', () => {
  const router = createMemoryRouter([
    { path: '*', element: <NavigationPromptProvider><App /></NavigationPromptProvider> },
  ], { initialEntries: ['/instructor/course/example'] });
  const { getByText } = render(<RouterProvider router={router} />);
  expect(getByText('Instructor Login')).toBeTruthy();
});

it('matches specific instructor import routes before the quiz editor', () => {
  localStorage.setItem('authToken', 'fixture');
  localStorage.setItem('authRole', 'instructor');
  const router = createMemoryRouter([
    { path: '*', element: <NavigationPromptProvider><App /></NavigationPromptProvider> },
  ], { initialEntries: ['/instructor/quiz/example/import'] });
  const { getByText } = render(<RouterProvider router={router} />);
  expect(getByText('Question Importer')).toBeTruthy();
});

it('matches quiz review separately from quiz taking', () => {
  localStorage.setItem('authToken', 'fixture');
  localStorage.setItem('authRole', 'student');
  const router = createMemoryRouter([
    { path: '*', element: <NavigationPromptProvider><App /></NavigationPromptProvider> },
  ], { initialEntries: ['/student/quiz/review/example'] });
  const { getByText } = render(<RouterProvider router={router} />);
  expect(getByText('Quiz Review')).toBeTruthy();
});
