/**
 * LoadingContainer Usage Examples
 *
 * This file demonstrates various use cases for the LoadingContainer component.
 */

import React, { useState } from 'react';
import { LoadingContainer } from './LoadingContainer';
import { Button } from '../atoms/Button';

/**
 * Example 1: Basic Loading State
 * Shows a simple loading spinner while data is being fetched
 */
export function BasicLoadingExample() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="p-4">
      <Button onClick={() => setIsLoading(!isLoading)}>
        Toggle Loading
      </Button>
      
      <LoadingContainer isLoading={isLoading}>
        <div className="p-4 bg-background-secondary rounded-lg">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Your Content Here
          </h2>
          <p className="text-text-secondary">
            This content appears when loading is complete.
          </p>
        </div>
      </LoadingContainer>
    </div>
  );
}

/**
 * Example 2: Long Operation with Loading Text
 * Displays loading text after a delay for operations that take longer
 */
export function LongOperationExample() {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartLongOperation = () => {
    setIsLoading(true);
    // Simulate a long operation
    setTimeout(() => setIsLoading(false), 5000);
  };

  return (
    <div className="p-4">
      <Button onClick={handleStartLongOperation} disabled={isLoading}>
        Start Long Operation
      </Button>
      
      <LoadingContainer
        isLoading={isLoading}
        loadingText="Processing your request... This may take a moment."
        showLoadingTextDelay={2000}
      >
        <div className="p-4 bg-background-secondary rounded-lg">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Operation Complete!
          </h2>
          <p className="text-text-secondary">
            Your long-running operation has finished successfully.
          </p>
        </div>
      </LoadingContainer>
    </div>
  );
}

/**
 * Example 3: Error State with Retry
 * Shows an error message with a retry button when something goes wrong
 */
export function ErrorStateExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      // Simulate API call that might fail
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.5) {
            resolve('Success!');
          } else {
            reject(new Error('Failed to fetch data. Please try again.'));
          }
        }, 1000);
      });
      setData('Data loaded successfully!');
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Button onClick={fetchData} disabled={isLoading}>
        Fetch Data
      </Button>
      
      <LoadingContainer
        isLoading={isLoading}
        error={error}
        onRetry={fetchData}
        loadingText="Fetching data..."
      >
        <div className="p-4 bg-background-secondary rounded-lg">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Data Loaded
          </h2>
          <p className="text-text-secondary">
            {data || 'No data yet'}
          </p>
        </div>
      </LoadingContainer>
    </div>
  );
}

/**
 * Example 4: Custom Error Messages
 * Shows how to customize error titles and messages
 */
export function CustomErrorExample() {
  const [error] = useState<Error>(new Error('Network timeout'));

  return (
    <div className="p-4">
      <LoadingContainer
        isLoading={false}
        error={error}
        errorTitle="Connection Failed"
        errorMessage="We couldn't connect to the server. Please check your internet connection and try again."
        onRetry={() => console.log('Retry clicked')}
      >
        <div>Content</div>
      </LoadingContainer>
    </div>
  );
}

/**
 * Example 5: Fade-in Animation
 * Demonstrates the smooth fade-in effect when content loads
 */
export function FadeInExample() {
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4">
      <Button onClick={() => setIsLoading(true)}>
        Reload
      </Button>
      
      <LoadingContainer isLoading={isLoading}>
        <div className="p-4 bg-background-secondary rounded-lg">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Smooth Fade-in
          </h2>
          <p className="text-text-secondary">
            Notice how this content fades in smoothly when loading completes.
          </p>
        </div>
      </LoadingContainer>
    </div>
  );
}

/**
 * Example 6: Real-world Data Fetching
 * A complete example showing typical usage in a data-fetching scenario
 */
export function DataFetchingExample() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Simulate random failure
      if (Math.random() > 0.7) {
        throw new Error('Failed to load users');
      }

      setUsers([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' },
        { id: 3, name: 'Bob Johnson' },
      ]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="p-4">
      <LoadingContainer
        isLoading={isLoading}
        error={error}
        onRetry={loadUsers}
        loadingText="Loading users..."
        showLoadingTextDelay={1000}
        minHeight="300px"
      >
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary mb-4">
            Users
          </h2>
          {users.map((user) => (
            <div
              key={user.id}
              className="p-3 bg-background-secondary rounded-lg"
            >
              <p className="text-text-primary">{user.name}</p>
            </div>
          ))}
        </div>
      </LoadingContainer>
    </div>
  );
}
