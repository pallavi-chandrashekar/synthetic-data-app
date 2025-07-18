import { render, screen } from '@testing-library/react';
import App from './App.jsx';
import React from 'react';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    // Adjust the text below to match your actual heading in App.jsx
    const heading = screen.getByText(/synthetic data/i);
    expect(heading).toBeInTheDocument();
  });
});
