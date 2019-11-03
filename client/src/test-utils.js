/* eslint-disable react/prop-types */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MockedProvider } from '@apollo/react-testing';

// This file re-exports everything from react-testing-library and uses
// a render wrapper with the providers needed for wadayano components
// For more info on this pattern, see https://testing-library.com/docs/react-testing-library/setup#custom-render

const Providers = ({ children }) => {
  return (
    <MemoryRouter>
      <MockedProvider>{children}</MockedProvider>
    </MemoryRouter>
  );
};

const customRender = (ui, options) => render(ui, { wrapper: Providers, ...options });

export * from '@testing-library/react';
export { customRender as render };
