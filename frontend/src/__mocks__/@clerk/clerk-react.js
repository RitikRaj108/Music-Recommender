import React from 'react';

// Dummy Clerk provider that simply renders its children
export const ClerkProvider = ({ children, ...props }) => <>{children}</>;

// Dummy components to bypass authentication in tests
export const SignedIn = ({ children }) => <>{children}</>;
export const SignedOut = ({ children }) => <>{children}</>;

// Provide a dummy RedirectToSignIn component
export const RedirectToSignIn = () => <div>Redirecting to sign in...</div>;

// Dummy implementation for useUser hook
export const useUser = () => {
  // You can change this to return a dummy user object if needed.
  return { user: null };
};

// Export any other necessary Clerk functions/hooks if used
export default ClerkProvider;
