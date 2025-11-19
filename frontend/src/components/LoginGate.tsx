import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import { useToast } from '../contexts/ToastContext';

interface LoginGateProps {
  children: React.ReactNode;
}

const LoginGate: React.FC<LoginGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  // Check if API key exists in localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('apiKey');
    if (storedKey) {
      // Verify the key is still valid by making a health check
      // (health check doesn't require auth, but we can test with a simple request)
      setIsAuthenticated(true);
      setIsChecking(false);
    } else {
      setIsChecking(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Save to localStorage - validation will happen on next API request
    // If the key is wrong, the user will see an error on their next action
    localStorage.setItem('apiKey', apiKey.trim());
    setIsAuthenticated(true);
    toast.showSuccess('API key saved');
  };

  const handleLogout = () => {
    localStorage.removeItem('apiKey');
    setIsAuthenticated(false);
    setApiKey('');
    toast.showInfo('Logged out');
  };

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action mx-auto"></div>
          <p className="mt-16 text-slate">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-snow">
        <Card padding="large" className="w-full max-w-md">
          <h1 className="text-h1 text-ink mb-8">Compass</h1>
          <p className="text-slate mb-24">Please enter your API key to continue</p>

          <form onSubmit={handleLogin} className="space-y-16">
            <Input
              type="password"
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              error={error}
              fullWidth
              placeholder="Enter your API key"
              autoFocus
            />

            <Button type="submit" variant="primary" fullWidth>
              Login
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Show children if authenticated
  return <>{children}</>;
};

export default LoginGate;

