import React, { useState, useEffect } from "react";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";

import { useToast } from "../contexts/ToastContext";

import api from "../lib/api";
import AuthContext from "../contexts/AuthContext";

interface LoginGateProps {
  children: React.ReactNode;
}

const LoginGate: React.FC<LoginGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const toast = useToast();

  // Check if API key exists in localStorage on mount
  useEffect(() => {
    const abortController = new AbortController();
    
    const verifyStoredKey = async () => {
      const storedKey = localStorage.getItem("apiSecret");
      if (storedKey) {
        try {
          // Verify the key is valid by making a request
          await api.get("/tasks", {
            params: { limit: 1 },
          });
          if (!abortController.signal.aborted) {
            setIsAuthenticated(true);
          }
        } catch (error) {
          // If verification fails, clear the invalid key
          if (!abortController.signal.aborted) {
            localStorage.removeItem("apiSecret");
            setIsAuthenticated(false);
            toast.showError("Session expired. Please login again.");
          }
        }
      }
      if (!abortController.signal.aborted) {
        setIsChecking(false);
      }
    };

    verifyStoredKey();
    
    return () => {
      abortController.abort();
    };
  }, [toast]);

  // Listen for session-expired events from API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
      setIsAuthenticated(false);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError("Please enter an API key");
      return;
    }

    try {
      // Temporarily set header for verification call
      await api.get("/tasks", {
        params: { limit: 1 },
        headers: { "x-api-secret": trimmedKey },
      });

      // Key is valid, save it and authenticate
      localStorage.setItem("apiSecret", trimmedKey);
      setIsAuthenticated(true);
      toast.showSuccess("API key saved");
    } catch (error) {
      setError("Invalid API key. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("apiSecret");
    setIsAuthenticated(false);
    setApiKey("");
    setSessionExpired(false);
    toast.showInfo("Logged out");
  };

  const handleSessionExpiredDismiss = () => {
    setSessionExpired(false);
    setApiKey("");
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
          <p className="text-slate mb-24">
            Please enter your API key to continue
          </p>

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

  // Show session expired modal overlay if session expired
  if (sessionExpired && isAuthenticated === false) {
    return (
      <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-24">
        <Card padding="large" className="w-full max-w-md">
          <h2 className="text-h2 text-ink mb-8">Session Expired</h2>
          <p className="text-slate mb-24">
            Your session has expired. Please re-authenticate to continue.
          </p>
          <Button
            variant="primary"
            onClick={handleSessionExpiredDismiss}
            fullWidth
          >
            Re-authenticate
          </Button>
        </Card>
      </div>
    );
  }

  // Show children if authenticated
  return (
    <AuthContext.Provider value={{ logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default LoginGate;
