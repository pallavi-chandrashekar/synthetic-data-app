import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary.jsx';
import React from 'react';
import { vi } from 'vitest';

function BrokenChild() {
  throw new Error('Test crash');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders fallback UI on error', () => {
    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });
});
