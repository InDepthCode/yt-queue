import { useState, useCallback } from 'react';

export interface ErrorState {
  hasError: boolean;
  message: string;
  type: 'network' | 'validation' | 'api' | 'unknown';
}

export interface UseErrorHandlerReturn {
  error: ErrorState;
  setError: (message: string, type?: ErrorState['type']) => void;
  clearError: () => void;
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    errorMessage?: string
  ) => Promise<T | null>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<ErrorState>({
    hasError: false,
    message: '',
    type: 'unknown',
  });

  const setError = useCallback((message: string, type: ErrorState['type'] = 'unknown') => {
    setErrorState({
      hasError: true,
      message,
      type,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      message: '',
      type: 'unknown',
    });
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (err) {
      const error = err as Error;
      console.error('Async operation failed:', error);
      
      let message = 'An unexpected error occurred';
      let type: ErrorState['type'] = 'unknown';

      // Categorize error types
      if (error.message.includes('network') || error.message.includes('fetch')) {
        type = 'network';
        message = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
        type = 'validation';
        message = error.message;
      } else if (error.message.includes('API') || error.message.includes('response')) {
        type = 'api';
        message = 'Service temporarily unavailable. Please try again later.';
      } else if (errorMessage) {
        message = errorMessage;
      }

      setError(message, type);
      return null;
    }
  }, [setError]);

  return {
    error,
    setError,
    clearError,
    handleAsyncError,
  };
};
