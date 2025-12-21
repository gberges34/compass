import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from './Button';
import Card from './Card';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-snow flex items-center justify-center p-24">
          <Card padding="large" className="max-w-md w-full text-center">
            <div className="mb-16 flex justify-center">
              <div className="w-64 h-64 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <svg className="w-32 h-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h1 className="text-h2 text-ink mb-8">Something went wrong</h1>
            <p className="text-slate mb-24">
              We're sorry, but an unexpected error occurred. Please try reloading the page.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-left bg-fog p-12 rounded mb-24 text-micro overflow-auto max-h-48">
                {this.state.error.toString()}
              </pre>
            )}
            <Button variant="primary" onClick={this.handleReload} className="w-full">
              Reload Application
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

