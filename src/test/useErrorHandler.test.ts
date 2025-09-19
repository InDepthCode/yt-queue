import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../hooks/useErrorHandler';

describe('useErrorHandler', () => {
  it('initializes with no error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(result.current.error.hasError).toBe(false);
    expect(result.current.error.message).toBe('');
    expect(result.current.error.type).toBe('unknown');
  });

  it('sets error with custom message and type', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError('Test error message', 'validation');
    });
    
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('Test error message');
    expect(result.current.error.type).toBe('validation');
  });

  it('sets error with default type when not provided', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    act(() => {
      result.current.setError('Test error message');
    });
    
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('Test error message');
    expect(result.current.error.type).toBe('unknown');
  });

  it('clears error', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // Set an error first
    act(() => {
      result.current.setError('Test error message', 'validation');
    });
    
    expect(result.current.error.hasError).toBe(true);
    
    // Clear the error
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error.hasError).toBe(false);
    expect(result.current.error.message).toBe('');
    expect(result.current.error.type).toBe('unknown');
  });

  it('handles successful async operations', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = vi.fn().mockResolvedValue('success');
    
    const returnValue = await act(async () => {
      return result.current.handleAsyncError(asyncFn, 'Custom error message');
    });
    
    expect(returnValue).toBe('success');
    expect(result.current.error.hasError).toBe(false);
    expect(asyncFn).toHaveBeenCalledOnce();
  });

  it('handles failed async operations with network errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = vi.fn().mockRejectedValue(new Error('Network error occurred'));
    
    const returnValue = await act(async () => {
      return result.current.handleAsyncError(asyncFn, 'Custom error message');
    });
    
    expect(returnValue).toBe(null);
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('Custom error message');
    expect(result.current.error.type).toBe('unknown');
  });

  it('detects network errors correctly', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = vi.fn().mockRejectedValue(new Error('fetch failed'));
    
    const returnValue = await act(async () => {
      return result.current.handleAsyncError(asyncFn);
    });
    
    expect(returnValue).toBe(null);
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('Network error. Please check your connection and try again.');
    expect(result.current.error.type).toBe('network');
  });

  it('handles failed async operations with validation errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = vi.fn().mockRejectedValue(new Error('Invalid input validation'));
    
    const returnValue = await act(async () => {
      return result.current.handleAsyncError(asyncFn, 'Custom error message');
    });
    
    expect(returnValue).toBe(null);
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('Invalid input validation');
    expect(result.current.error.type).toBe('validation');
  });

  it('handles failed async operations with API errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = vi.fn().mockRejectedValue(new Error('API response error'));
    
    const returnValue = await act(async () => {
      return result.current.handleAsyncError(asyncFn, 'Custom error message');
    });
    
    expect(returnValue).toBe(null);
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('Service temporarily unavailable. Please try again later.');
    expect(result.current.error.type).toBe('api');
  });

  it('handles failed async operations with unknown errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = vi.fn().mockRejectedValue(new Error('Unknown error'));
    
    const returnValue = await act(async () => {
      return result.current.handleAsyncError(asyncFn, 'Custom error message');
    });
    
    expect(returnValue).toBe(null);
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('Custom error message');
    expect(result.current.error.type).toBe('unknown');
  });

  it('uses default error message when none provided for async operations', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const asyncFn = vi.fn().mockRejectedValue(new Error('Unknown error'));
    
    const returnValue = await act(async () => {
      return result.current.handleAsyncError(asyncFn);
    });
    
    expect(returnValue).toBe(null);
    expect(result.current.error.hasError).toBe(true);
    expect(result.current.error.message).toBe('An unexpected error occurred');
    expect(result.current.error.type).toBe('unknown');
  });
});
