import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App, { SAMPLE_PROMPTS } from './App.jsx';
import React from 'react';
import { vi } from 'vitest';
import axios from 'axios';

vi.mock('axios');

describe('App', () => {
  beforeEach(() => {
    localStorage.removeItem('promptHistory');
    vi.restoreAllMocks();
  });

  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText(/synthetic data generator/i)).toBeInTheDocument();
  });

  it('renders format selector with JSON and CSV', () => {
    render(<App />);
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('renders the prompt text field', () => {
    render(<App />);
    expect(screen.getByLabelText(/prompt/i)).toBeInTheDocument();
  });

  it('renders sample prompt chips', () => {
    render(<App />);
    for (const sample of SAMPLE_PROMPTS) {
      expect(screen.getByText(sample)).toBeInTheDocument();
    }
  });

  it('clicking a sample prompt fills the text field', () => {
    render(<App />);
    const chip = screen.getByText(SAMPLE_PROMPTS[0]);
    fireEvent.click(chip);
    expect(screen.getByLabelText(/prompt/i).value).toBe(SAMPLE_PROMPTS[0]);
  });

  it('shows empty history message initially', () => {
    render(<App />);
    expect(screen.getByText(/no prompts yet/i)).toBeInTheDocument();
  });

  it('generate button is present and enabled', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /^generate$/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('download button is disabled when no data', () => {
    render(<App />);
    const btn = screen.getByRole('button', { name: /download/i });
    expect(btn).toBeDisabled();
  });

  it('shows success snackbar after generating data', async () => {
    axios.post.mockResolvedValueOnce({
      data: { json: [{ name: 'Alice', age: 30 }] },
    });

    render(<App />);
    const input = screen.getByLabelText(/prompt/i);
    fireEvent.change(input, { target: { value: 'test prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => {
      expect(screen.getByText(/data generated successfully/i)).toBeInTheDocument();
    });
  });

  it('shows error snackbar on API failure', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    const input = screen.getByLabelText(/prompt/i);
    fireEvent.change(input, { target: { value: 'fail prompt' } });
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('saves prompt to history after generation', async () => {
    axios.post.mockResolvedValueOnce({
      data: { json: [{ x: 1 }] },
    });

    render(<App />);
    fireEvent.change(screen.getByLabelText(/prompt/i), {
      target: { value: 'history test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => {
      expect(screen.getByText('history test')).toBeInTheDocument();
    });
  });
});
