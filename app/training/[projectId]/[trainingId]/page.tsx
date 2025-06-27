'use client';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, TrainingResponse } from "../../../../lib/api";
import { ErrorDisplay } from "../../../../components/ErrorDisplay";

export default function TrainingMonitor() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const trainingId = params.trainingId as string;

  const [trainingData, setTrainingData] = useState<TrainingResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastLogUpdate, setLastLogUpdate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    const fetchTrainingStatus = async () => {
      try {
        const response = await apiClient.getTrainingStatus(projectId, trainingId);
        setTrainingData(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch training status';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTrainingLogs = async () => {
      try {
        const logResponse = await apiClient.getTrainingLogs(projectId, trainingId, 500);
        setLogs(logResponse.logs);
        setLastLogUpdate(logResponse.last_updated);
        
        // Auto-scroll to bottom if enabled
        if (isAutoScroll) {
          setTimeout(() => {
            const logContainer = document.getElementById('log-container');
            if (logContainer) {
              logContainer.scrollTop = logContainer.scrollHeight;
            }
          }, 100);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    };

    // Initial fetch
    fetchTrainingStatus();
    fetchTrainingLogs();
    
    // Intelligent polling with exponential backoff
    let logPollInterval = 3000; // Start with 3 seconds
    let statusPollInterval = 8000; // Start with 8 seconds
    let failureCount = 0;
    
    const scheduleLogFetch = () => {
      if (!isMounted) return;
      if (trainingData?.status === 'running' || trainingData?.status === 'queued') {
        setTimeout(async () => {
          if (!isMounted) return;
          try {
            await fetchTrainingLogs();
            failureCount = 0; // Reset on success
            scheduleLogFetch(); // Schedule next fetch
          } catch (err) {
            failureCount++;
            // Exponential backoff on failure (max 30 seconds)
            logPollInterval = Math.min(logPollInterval * 1.5, 30000);
            console.warn(`Log fetch failed ${failureCount} times, backing off to ${logPollInterval}ms`);
            if (isMounted) scheduleLogFetch();
          }
        }, logPollInterval);
      }
    };
    
    const scheduleStatusFetch = () => {
      if (!isMounted) return;
      if (trainingData?.status === 'running' || trainingData?.status === 'queued') {
        setTimeout(async () => {
          if (!isMounted) return;
          try {
            await fetchTrainingStatus();
            if (isMounted) scheduleStatusFetch(); // Schedule next fetch
          } catch (err) {
            // Less aggressive backoff for status
            statusPollInterval = Math.min(statusPollInterval * 1.2, 20000);
            console.warn(`Status fetch failed, backing off to ${statusPollInterval}ms`);
            if (isMounted) scheduleStatusFetch();
          }
        }, statusPollInterval);
      }
    };
    
    // Start intelligent polling
    scheduleLogFetch();
    scheduleStatusFetch();

    // No cleanup needed for setTimeout-based approach
  }, [projectId, trainingId, trainingData?.status, isAutoScroll, isMounted]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'queued': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading training status...</p>
        </div>
      </div>
    );
  }

  if (error || !trainingData) {
    return (
      <ErrorDisplay
        error={error || 'Training data not found'}
        context="Training session"
        showFullPage={true}
        onRetry={async () => {
          setIsLoading(true);
          setError('');
          try {
            const response = await apiClient.getTrainingStatus(projectId, trainingId);
            setTrainingData(response);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch training status';
            setError(errorMessage);
          } finally {
            setIsLoading(false);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                ← Back to Dashboard
              </button>
              <span className="text-2xl font-bold text-black">exponent</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Training Monitor</h1>
          <p className="text-gray-600">
            Project: {projectId} | Training: {trainingId}
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-gray-900 mr-4">Training Status</h2>
              {(trainingData.status === 'running' || trainingData.status === 'queued') && (
                <div className="flex items-center text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  Live from Modal
                </div>
              )}
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(trainingData.status)}`}>
              {getStatusIcon(trainingData.status)}
              <span className="ml-2 capitalize">{trainingData.status.replace('_', ' ')}</span>
            </div>
          </div>
          
          {trainingData.message && (
            <p className="text-gray-600 mb-4">{trainingData.message}</p>
          )}

          {/* Training Metrics */}
          {trainingData.metrics && Object.keys(trainingData.metrics).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {Object.entries(trainingData.metrics).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace('_', ' ')}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {typeof value === 'number' ? value.toFixed(4) : value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-Time Logs Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Training Logs 
              {logs.length > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  ({logs.length} lines)
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-4">
              {lastLogUpdate && (
                <span className="text-xs text-gray-500">
                  Last updated: {new Date(lastLogUpdate).toLocaleTimeString()}
                </span>
              )}
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAutoScroll}
                  onChange={(e) => setIsAutoScroll(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Auto-scroll</span>
              </label>
              <button
                onClick={() => {
                  const logContainer = document.getElementById('log-container');
                  if (logContainer) {
                    logContainer.scrollTop = logContainer.scrollHeight;
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Scroll to bottom
              </button>
            </div>
          </div>
          
          {logs.length > 0 ? (
            <div 
              id="log-container"
              className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto"
            >
              {logs.map((log, index) => (
                <div key={index} className="mb-1 whitespace-pre-wrap">
                  {log}
                </div>
              ))}
              {trainingData?.status === 'running' && (
                <div className="flex items-center text-yellow-400 mt-2">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Training in progress...
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-100 p-8 rounded-lg text-center">
              <div className="text-gray-500 mb-2">
                <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600">
                {trainingData?.status === 'queued' 
                  ? 'Training is queued. Logs will appear when training starts.'
                  : 'No logs available yet.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex space-x-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Refresh Status
          </button>
          
          {trainingData.status === 'completed' && (
            <button
              onClick={() => router.push(`/completion/${projectId}/${trainingId}`)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition"
            >
              View Results & Download
            </button>
          )}
          
          {(trainingData.status === 'running' || trainingData.status === 'queued') && (
            <button
              onClick={() => {/* TODO: Cancel training */}}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition"
            >
              Cancel Training
            </button>
          )}
        </div>
      </main>
    </div>
  );
} 