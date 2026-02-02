import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-background flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="text-6xl">😵</div>
            <h1 className="text-primary mt-6 text-2xl font-semibold">Something went wrong</h1>
            <p className="text-secondary mx-auto mt-3 max-w-md">
              We're sorry, but something unexpected happened. Please try reloading the page or go
              back to the home page.
            </p>

            {/* Error details (dev only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-error-bg border-error-border text-error-text mx-auto mt-6 max-w-lg overflow-auto rounded-lg border p-4 text-left">
                <p className="font-mono text-sm">{this.state.error.message}</p>
              </div>
            )}

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={this.handleGoHome}
                className="bg-card text-primary border-border hover:bg-background rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors"
              >
                Go Home
              </button>
              <button
                onClick={this.handleReload}
                className="bg-accent hover:bg-accent-hover rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
