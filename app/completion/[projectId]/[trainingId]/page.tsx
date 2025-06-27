'use client';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, TrainingSummary } from "../../../../lib/api";
import { showToast } from "../../../../lib/toast";
import { ErrorDisplay } from "../../../../components/ErrorDisplay";

export default function TrainingCompletion() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const trainingId = params.trainingId as string;

  const [summaryData, setSummaryData] = useState<TrainingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<string>('');
  const [isPollingAI, setIsPollingAI] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration
    
    const fetchSummary = async () => {
      try {
        // Check if summary will come from cache
        const willUseCache = apiClient.isCached('getTrainingSummary', projectId, trainingId);
        
        const summary = await apiClient.getTrainingSummary(projectId, trainingId);
        
        // Ensure the summary has the correct structure
        const normalizedSummary = {
          ...summary,
          summary: {
            technical_summary: summary.summary?.technical_summary || 'Technical details will be available here.',
            layman_summary: summary.summary?.layman_summary || 'Your AI model has been successfully trained!',
            key_achievements: Array.isArray(summary.summary?.key_achievements) ? summary.summary.key_achievements : [],
            recommendations: Array.isArray(summary.summary?.recommendations) ? summary.summary.recommendations : []
          }
        };
        
        setSummaryData(normalizedSummary);
        
        // Show toast if data came from cache
        if (willUseCache) {
          showToast('Training results loaded from cache ⚡', { type: 'success', duration: 2000 });
        }
        
        // If AI summary is generating, start polling
        if (summary.ai_summary_status === 'generating') {
          setIsPollingAI(true);
          startAIPolling();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch training summary';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [projectId, trainingId, isHydrated]);
  
  const startAIPolling = () => {
    const pollAI = async () => {
      try {
        const summary = await apiClient.getTrainingSummary(projectId, trainingId);
        
        // Ensure the summary has the correct structure
        const normalizedSummary = {
          ...summary,
          summary: {
            technical_summary: summary.summary?.technical_summary || 'Technical details will be available here.',
            layman_summary: summary.summary?.layman_summary || 'Your AI model has been successfully trained!',
            key_achievements: Array.isArray(summary.summary?.key_achievements) ? summary.summary.key_achievements : [],
            recommendations: Array.isArray(summary.summary?.recommendations) ? summary.summary.recommendations : []
          }
        };
        
        setSummaryData(normalizedSummary);
        
        if (summary.ai_summary_status === 'completed') {
          setIsPollingAI(false);
          showToast('🤖 AI insights generated!', { type: 'success', duration: 3000 });
        } else if (summary.ai_summary_status === 'failed') {
          setIsPollingAI(false);
          showToast('AI summary generation failed, showing basic summary', { type: 'warning', duration: 3000 });
        } else if (summary.ai_summary_status === 'generating') {
          // Continue polling
          setTimeout(pollAI, 3000); // Poll every 3 seconds
        }
      } catch (err) {
        console.error('Failed to poll AI summary:', err);
        setIsPollingAI(false);
      }
    };
    
    setTimeout(pollAI, 3000); // Start polling after 3 seconds
  };

  const handleDownloadWeights = async () => {
    setIsDownloading('weights');
    try {
      const blob = await apiClient.downloadModelWeights(projectId, trainingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summaryData?.project_name.replace(/ /g, '_')}_weights.pkl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading('');
    }
  };

  const handleDownloadCode = async () => {
    setIsDownloading('code');
    try {
      const blob = await apiClient.downloadProjectCode(projectId, trainingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summaryData?.project_name.replace(/ /g, '_')}_code.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading('');
    }
  };

  const handlePushToColab = () => {
    const colabUrl = `https://colab.research.google.com/github/googlecolab/colabtools/blob/master/notebooks/colab-github-demo.ipynb`;
    window.open(colabUrl, '_blank');
  };

  const handlePushToGithub = () => {
    const githubUrl = `https://github.com/new`;
    window.open(githubUrl, '_blank');
  };

  const handleDeployToAWS = () => {
    const awsUrl = `https://aws.amazon.com/sagemaker/`;
    window.open(awsUrl, '_blank');
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading training results...</p>
        </div>
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <ErrorDisplay
        error={error || 'Training summary not found'}
        context="Training results"
        showFullPage={true}
        onRetry={async () => {
          setIsLoading(true);
          setError('');
          try {
            // Check if summary will come from cache
            const willUseCache = apiClient.isCached('getTrainingSummary', projectId, trainingId);
            
            const summary = await apiClient.getTrainingSummary(projectId, trainingId);
            
            // Ensure the summary has the correct structure
            const normalizedSummary = {
              ...summary,
              summary: {
                technical_summary: summary.summary?.technical_summary || 'Technical details will be available here.',
                layman_summary: summary.summary?.layman_summary || 'Your AI model has been successfully trained!',
                key_achievements: Array.isArray(summary.summary?.key_achievements) ? summary.summary.key_achievements : [],
                recommendations: Array.isArray(summary.summary?.recommendations) ? summary.summary.recommendations : []
              }
            };
            
            setSummaryData(normalizedSummary);
            
            // Show toast if data came from cache
            if (willUseCache) {
              showToast('Training results loaded from cache ⚡', { type: 'success', duration: 2000 });
            }
            
            // If AI summary is generating, start polling
            if (summary.ai_summary_status === 'generating') {
              setIsPollingAI(true);
              startAIPolling();
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch training summary';
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            {summaryData.project_name} Done!
          </h1>
        </div>

        {/* Main Result Card */}
        <div className="bg-gray-100 rounded-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your classifier model has been trained!
            </h2>
            <p className="text-gray-600">
              Training completed in {Math.round(summaryData.training_duration / 60)} minutes on {summaryData.gpu_used} GPU
            </p>
          </div>

          {/* AI Summary */}
          <div className="bg-white rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">AI Summary</h3>
              {summaryData.ai_summary_status === 'generating' && (
                <div className="flex items-center text-sm text-blue-600">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating AI insights...
                </div>
              )}
              {summaryData.ai_summary_status === 'completed' && (
                <div className="flex items-center text-sm text-green-600">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Enhanced by AI
                </div>
              )}
              {summaryData.ai_summary_status === 'failed' && (
                <div className="flex items-center text-sm text-yellow-600">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Basic summary
                </div>
              )}
            </div>
            
            {/* Layman Summary */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-2">What happened:</h4>
              <div className={`text-gray-700 leading-relaxed ${summaryData.ai_summary_status === 'generating' ? 'relative' : ''}`}>
                {summaryData.ai_summary_status === 'generating' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50 to-transparent animate-pulse rounded"></div>
                )}
                <p className={summaryData.ai_summary_status === 'generating' ? 'relative z-10' : ''}>
                  {String(summaryData.summary.layman_summary || 'Your ML model has been successfully trained and is ready to use!')}
                </p>
              </div>
            </div>

            {/* Key Achievements */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-3">Key Achievements:</h4>
              <ul className="space-y-2">
                {(Array.isArray(summaryData.summary.key_achievements) ? summaryData.summary.key_achievements : []).map((achievement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2 mt-1">•</span>
                    <span className="text-gray-700">{String(achievement)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technical Summary */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-800 mb-2">Technical Details:</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                {String(summaryData.summary.technical_summary || 'Technical details about your model training will be available here.')}
              </p>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-3">Next Steps:</h4>
              <ul className="space-y-2">
                {(Array.isArray(summaryData.summary.recommendations) ? summaryData.summary.recommendations : []).map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">→</span>
                    <span className="text-gray-700">{String(recommendation)}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* AI Generation Status Info */}
            {summaryData.ai_summary_status === 'generating' && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="animate-spin h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-blue-900">🤖 AI is enhancing your summary</h5>
                    <p className="text-sm text-blue-700 mt-1">
                      Our AI is analyzing your training results to provide deeper insights. This page will update automatically when ready.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {summaryData.ai_summary_status === 'failed' && summaryData.ai_summary_error && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h5 className="text-sm font-medium text-yellow-900">AI enhancement unavailable</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Showing basic summary. AI insights are temporarily unavailable but your training was successful.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={handlePushToColab}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition flex flex-col items-center"
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.941 4.976c-1.19-.649-2.894-.649-4.084 0l-6.857 3.738c-1.19.649-1.19 1.701 0 2.35l6.857 3.738c1.19.649 2.894.649 4.084 0l6.857-3.738c1.19-.649 1.19-1.701 0-2.35l-6.857-3.738z"/>
              </svg>
              Push to Colab
            </button>

            <button
              onClick={handlePushToGithub}
              className="bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-900 transition flex flex-col items-center"
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Push to Github
            </button>

            <button
              onClick={handleDeployToAWS}
              className="bg-orange-400 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-500 transition flex flex-col items-center"
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.75 12.75h1.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75h-1.5c-.414 0-.75.336-.75.75s.336.75.75.75zM12 16.5c-.414 0-.75.336-.75.75v1.5c0 .414.336.75.75.75s.75-.336.75-.75v-1.5c0-.414-.336-.75-.75-.75zM5.25 12.75h-1.5c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h1.5c.414 0 .75.336.75.75s-.336.75-.75.75zM12 7.5c.414 0 .75-.336.75-.75v-1.5c0-.414-.336-.75-.75-.75s-.75.336-.75.75v1.5c0 .414.336.75.75.75z"/>
              </svg>
              Deploy to AWS
            </button>

            <button
              onClick={isDownloading === 'weights' ? undefined : handleDownloadWeights}
              disabled={isDownloading === 'weights'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition flex flex-col items-center disabled:opacity-50"
            >
              {isDownloading === 'weights' ? (
                <svg className="animate-spin w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              Download weights
            </button>
          </div>

          {/* Additional Download Options */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={isDownloading === 'code' ? undefined : handleDownloadCode}
              disabled={isDownloading === 'code'}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50"
            >
              {isDownloading === 'code' ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Complete Project Code
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Training Metrics */}
        {summaryData.training_metrics && Object.keys(summaryData.training_metrics).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(summaryData.training_metrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {typeof value === 'number' ? value.toFixed(4) : value}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">
                    {key.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 