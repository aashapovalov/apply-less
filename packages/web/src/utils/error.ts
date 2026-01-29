import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export function getErrorMessage(error: unknown): string {
  // RTK Query error
  if (isFetchBaseQueryError(error)) {
    if ('data' in error && typeof error.data === 'object' && error.data !== null) {
      const data = error.data as Record<string, unknown>;
      if (typeof data.error === 'string') {
        return data.error;
      }
      if (typeof data.message === 'string') {
        return data.message;
      }
    }
    return 'Server error';
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}
