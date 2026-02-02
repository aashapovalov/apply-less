interface Props {
  message: string | null;
  onRetry: () => void;
}

export function CVModalError({ message, onRetry }: Props) {
  return (
    <div className="p-8 text-center">
      <div className="bg-error-bg text-error-text mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-primary text-xl font-semibold">Generation Failed</h2>
      <p className="text-secondary mt-2">Something went wrong while generating your CV.</p>
      {message && (
        <p className="bg-error-bg text-error-text mt-4 rounded-lg p-3 text-sm">{message}</p>
      )}
      <button
        onClick={onRetry}
        className="bg-accent hover:bg-accent-hover mt-6 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
