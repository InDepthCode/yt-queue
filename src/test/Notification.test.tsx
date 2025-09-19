import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notification from '../components/Notification';

describe('Notification Component', () => {
  it('renders notification with success type', () => {
    const onClose = vi.fn();
    
    render(
      <Notification
        show={true}
        type="success"
        message="Success message"
        onClose={onClose}
      />
    );
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close notification/i })).toBeInTheDocument();
  });

  it('renders notification with error type', () => {
    const onClose = vi.fn();
    
    render(
      <Notification
        show={true}
        type="error"
        message="Error message"
        onClose={onClose}
      />
    );
    
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders notification with warning type', () => {
    const onClose = vi.fn();
    
    render(
      <Notification
        show={true}
        type="warning"
        message="Warning message"
        onClose={onClose}
      />
    );
    
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('renders notification with info type', () => {
    const onClose = vi.fn();
    
    render(
      <Notification
        show={true}
        type="info"
        message="Info message"
        onClose={onClose}
      />
    );
    
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('does not render when show is false', () => {
    const onClose = vi.fn();
    
    render(
      <Notification
        show={false}
        type="success"
        message="Success message"
        onClose={onClose}
      />
    );
    
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <Notification
        show={true}
        type="success"
        message="Success message"
        onClose={onClose}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: /close notification/i });
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('auto-closes after specified duration', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    render(
      <Notification
        show={true}
        type="success"
        message="Success message"
        onClose={onClose}
        duration={1000}
      />
    );
    
    expect(onClose).not.toHaveBeenCalled();
    
    // Fast-forward time
    vi.advanceTimersByTime(1000);
    
    // Use act to ensure all effects are processed
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(onClose).toHaveBeenCalledOnce();
    
    vi.useRealTimers();
  });

  it('does not auto-close when duration is 0', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    render(
      <Notification
        show={true}
        type="success"
        message="Success message"
        onClose={onClose}
        duration={0}
      />
    );
    
    // Fast-forward time
    vi.advanceTimersByTime(5000);
    
    expect(onClose).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });

  it('cleans up timer on unmount', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    
    const { unmount } = render(
      <Notification
        show={true}
        type="success"
        message="Success message"
        onClose={onClose}
        duration={1000}
      />
    );
    
    unmount();
    
    // Fast-forward time after unmount
    vi.advanceTimersByTime(1000);
    
    expect(onClose).not.toHaveBeenCalled();
    
    vi.useRealTimers();
  });
});
