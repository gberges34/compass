import type { FallbackProps } from 'react-error-boundary';
import Button from './Button';
import Card from './Card';

/**
 * Fallback UI for react-error-boundary.
 * Provides both soft reset (retry) and hard refresh options.
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-snow flex items-center justify-center p-24">
      <Card padding="large" className="max-w-md w-full text-center">
        <div className="mb-16 flex justify-center">
          <div className="w-64 h-64 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <svg className="w-32 h-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-h2 text-ink mb-8">Something went wrong</h1>
        <p className="text-slate mb-24">
          We're sorry, but an unexpected error occurred. You can try again or reload the page.
        </p>
        {import.meta.env.DEV && error && (
          <pre className="text-left bg-fog p-12 rounded mb-24 text-micro overflow-auto max-h-48">
            {error.toString()}
          </pre>
        )}
        <div className="flex gap-12">
          <Button variant="primary" onClick={resetErrorBoundary} className="flex-1">
            Try Again
          </Button>
          <Button variant="secondary" onClick={handleReload} className="flex-1">
            Reload Page
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ErrorFallback;

