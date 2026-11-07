import React from 'react';
import ReactDOM from 'react-dom';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './components/App';
import { NavigationPromptProvider } from './components/shared/NavigationPrompt';

const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <NavigationPromptProvider>
        <App />
      </NavigationPromptProvider>
    ),
  },
]);

ReactDOM.render(<RouterProvider router={router} />, document.getElementById('root'));
