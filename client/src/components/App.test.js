import React from 'react';
import { render } from '../test-utils';
import Welcome from './shared/Welcome';

it('renders without crashing', () => {
  const { debug, getByText } = render(<Welcome />);
});
