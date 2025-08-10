import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

test('renders the app header', () => {
  render(
    <ClerkProvider publishableKey="test_publishable_key">
      <App />
    </ClerkProvider>
  );
  const headerElement = screen.getByText(/meloraa/i);
  expect(headerElement).toBeInTheDocument();
});
