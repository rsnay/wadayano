import React, { useState } from 'react';
import { act } from 'react-dom/test-utils';
import { fireEvent, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { NavigationPrompt, NavigationPromptProvider } from './NavigationPrompt';

function Editor() {
  const [dirty, setDirty] = useState(true);
  return (
    <>
      <NavigationPrompt when={dirty} message="Discard changes?" />
      <NavigationPrompt when={dirty} message="Discard changes?" />
      <button type="button" onClick={() => setDirty(false)}>Save</button>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

it('blocks canceled navigation, allows confirmed navigation, and deduplicates prompts', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  const router = createMemoryRouter([
    {
      element: <NavigationPromptProvider><Editor /></NavigationPromptProvider>,
      path: '/edit',
    },
    { path: '/next', element: <div>Next</div> },
  ], { initialEntries: ['/edit'] });
  render(<RouterProvider router={router} />);

  await act(async () => { await router.navigate('/next'); });
  expect(router.state.location.pathname).toBe('/edit');
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledWith('Discard changes?');

  await act(async () => { await router.navigate('/next'); });
  expect(router.state.location.pathname).toBe('/next');
  expect(confirm).toHaveBeenCalledTimes(2);
});

it('removes prompts when changes are saved', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const router = createMemoryRouter([
    {
      element: <NavigationPromptProvider><Editor /></NavigationPromptProvider>,
      path: '/edit',
    },
    { path: '/next', element: <div>Next</div> },
  ], { initialEntries: ['/edit'] });
  const { getByText } = render(<RouterProvider router={router} />);
  fireEvent.click(getByText('Save'));
  await act(async () => { await router.navigate('/next'); });
  expect(router.state.location.pathname).toBe('/next');
  expect(confirm).not.toHaveBeenCalled();
});

it('preserves the current location when browser back is canceled', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  const router = createMemoryRouter([
    { path: '/previous', element: <div>Previous</div> },
    { path: '/edit', element: <NavigationPromptProvider><Editor /></NavigationPromptProvider> },
  ], { initialEntries: ['/previous', '/edit'], initialIndex: 1 });
  render(<RouterProvider router={router} />);

  await act(async () => { await router.navigate(-1); });
  expect(router.state.location.pathname).toBe('/edit');
  await act(async () => { await router.navigate(-1); });
  expect(router.state.location.pathname).toBe('/previous');
  expect(confirm).toHaveBeenCalledTimes(2);
});
