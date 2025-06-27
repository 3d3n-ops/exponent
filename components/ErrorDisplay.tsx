import React, { useState } from 'react';
import { ErrorDetails, getErrorDetails, shouldAutoRetry, getRetryDelay } from '../lib/errors';

interface ErrorDisplayProps {
  error: string | Error;
  context?: string;
  onRetry?: () => void | Promise<void>;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  showFullPage?: boolean;
}

export function ErrorDisplay({ 
  error, 
  context, 
  onRetry, 
  className = '', 
  size = 'medium',
  showFullPage = false
}: ErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryTimeout, setAutoRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const errorDetails = getErrorDetails(error, context);
  
  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Auto-retry for certain error types
  React.useEffect(() => {
    if (shouldAutoRetry(errorDetails.type) && onRetry && retryCount === 0) {
      const delay = getRetryDelay(errorDetails.type, 1);
      const timeout = setTimeout(() => {
        handleRetry();
      }, delay);
      setAutoRetryTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [errorDetails.type, onRetry, retryCount]);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
  };
  
  const color = getSeverityColor(errorDetails.severity);
  
  if (showFullPage) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className={`mx-auto w-16 h-16 bg-${color}-100 rounded-full flex items-center justify-center mb-6`}>
            <span className="text-2xl">{errorDetails.icon}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{errorDetails.title}</h1>
          <p className="text-gray-600 mb-6">{errorDetails.message}</p>
          
          {errorDetails.action && (
            <div className={`p-4 bg-${color}-50 border border-${color}-200 rounded-lg mb-6`}>
              <p className={`text-sm text-${color}-800`}>
                <strong>What to do:</strong> {errorDetails.action}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            {errorDetails.retryable && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRetrying ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Retrying...
                  </div>
                ) : (
                  `Try Again${retryCount > 0 ? ` (${retryCount})` : ''}`
                )}
              </button>
            )}
            
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Go Back
            </button>
          </div>
          
          {retryCount > 2 && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Still having trouble? <a href="mailto:support@exponent.com" className="text-blue-600 hover:underline">Contact Support</a>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Inline error display
  const sizeClasses = {
    small: 'p-3 text-sm',
    medium: 'p-4',
    large: 'p-6 text-lg'
  };
  
  return (
    <div className={`bg-${color}-50 border border-${color}-200 rounded-lg ${sizeClasses[size]} ${className}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 mr-3 ${size === 'small' ? 'mt-0.5' : 'mt-1'}`}>
          <span className={size === 'small' ? 'text-lg' : 'text-xl'}>{errorDetails.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-${color}-900 ${size === 'small' ? 'text-sm' : ''}`}>
            {errorDetails.title}
          </h3>
          <p className={`mt-1 text-${color}-700 ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
            {errorDetails.message}
          </p>
          
          {errorDetails.action && (
            <div className={`mt-2 p-2 bg-${color}-100 rounded border border-${color}-300`}>
              <p className={`text-${color}-800 font-medium ${size === 'small' ? 'text-xs' : 'text-sm'}`}>
                💡 {errorDetails.action}
              </p>
            </div>
          )}
          
          {errorDetails.retryable && onRetry && (
            <div className="mt-3 flex items-center space-x-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-${color}-600 hover:bg-${color}-700 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRetrying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Retrying...
                  </>
                ) : (
                  `Retry${retryCount > 0 ? ` (${retryCount})` : ''}`
                )}
              </button>
              
              {autoRetryTimeout && (
                <span className={`text-xs text-${color}-600`}>
                  Auto-retrying...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 