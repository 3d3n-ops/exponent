'use client';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, ProjectResponse, DatasetAnalysis } from "../../../lib/api";
import { ErrorDisplay } from "../../../components/ErrorDisplay";
import { showToast } from "../../../lib/toast";

type DatasetType = 'text' | 'image' | 'video';

export default function DataProcessing() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Dataset state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetType, setDatasetType] = useState<DatasetType>('text');
  const [visualizationPrompt, setVisualizationPrompt] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [datasetUploaded, setDatasetUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Project state
  const [projectStatus, setProjectStatus] = useState<string>('');
  const [datasetAnalysis, setDatasetAnalysis] = useState<DatasetAnalysis | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  // Check project status on load
  useEffect(() => {
    const checkProjectStatus = async () => {
      try {
        const response = await apiClient.getProjectStatus(projectId);
        setProjectStatus(response.status);
        
        if (response.status === 'error') {
          setError(response.message || 'Project has an error');
        }
        
        // Check if dataset already exists
        try {
          const analysis = await apiClient.getDatasetAnalysis(projectId);
          setDatasetAnalysis(analysis);
          setDatasetUploaded(true);
          if (analysis.status === 'generating') {
            setIsProcessing(true);
            startStatusPolling();
          }
        } catch (err) {
          // No dataset uploaded yet, this is expected
          console.log('No dataset found, ready for upload');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
        setError(errorMessage);
      } finally {
        setIsLoadingProject(false);
      }
    };

    checkProjectStatus();
  }, [projectId]);

  // Start polling for dataset processing status
  const startStatusPolling = () => {
    const pollStatus = async () => {
      try {
        const analysis = await apiClient.getDatasetAnalysis(projectId);
        setDatasetAnalysis(analysis);
        
        if (analysis.status === 'ready') {
          setIsProcessing(false);
          showToast('🎉 Dataset analysis complete!', { type: 'success', duration: 4000 });
        } else if (analysis.status === 'generating') {
          // Continue polling
          setTimeout(pollStatus, 3000);
        } else if (analysis.status === 'error') {
          setIsProcessing(false);
          setError('Dataset processing failed');
        }
      } catch (err) {
        console.error('Status polling failed:', err);
        setTimeout(pollStatus, 5000); // Retry after 5 seconds
      }
    };

    // Start polling after a short delay
    setTimeout(pollStatus, 2000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect dataset type based on file extension
      const extension = file.name.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '')) {
        setDatasetType('image');
      } else if (['mp4', 'avi', 'mov', 'mkv'].includes(extension || '')) {
        setDatasetType('video');
      } else {
        setDatasetType('text');
      }
    }
  };

  const handleUploadDataset = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');

    try {
      await apiClient.uploadDataset(projectId, selectedFile, datasetType, visualizationPrompt);
      setDatasetUploaded(true);
      setIsProcessing(true);
      
      showToast('📁 Dataset uploaded! Processing data...', { 
        type: 'info', 
        duration: 3000 
      });
      
      // Start polling to check when processing is complete
      startStatusPolling();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload dataset';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleContinue = () => {
    if (datasetAnalysis && datasetAnalysis.status === 'ready') {
      router.push(`/training/${projectId}`);
    }
  };

  // Show loading state while checking project
  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
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
                ← Back
              </button>
              <span className="text-2xl font-bold text-black underline decoration-2 underline-offset-4">ex</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex min-h-[calc(100vh-64px)]">
        {/* Left Column - Data Processing Form */}
        <div className="w-1/2 p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              Data Processing
            </h1>
            
            <div className="space-y-6">
              {/* Upload Data Section */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-4">
                  Upload data
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center">
                      {selectedFile ? (
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <>
                          <svg className="w-6 h-6 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-500">Choose file</p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".csv,.json,.txt,.xlsx,.parquet,.pkl,.jpg,.jpeg,.png,.gif,.bmp,.mp4,.avi,.mov,.mkv"
                    />
                  </label>
                </div>
              </div>

              {/* Data Format Selection */}
              <div>
                <label className="block text-lg font-medium text-gray-900 mb-4">
                  Data format
                </label>
                <div className="flex space-x-2">
                  {(['text', 'image', 'video'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setDatasetType(type)}
                      className={`px-6 py-2 rounded-md text-sm font-medium transition ${
                        datasetType === type
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Prompt */}
              <div>
                <label className="block text-lg font-medium text-black mb-4">
                  Prompt (optional)
                </label>
                <textarea
                  value={visualizationPrompt}
                  onChange={(e) => setVisualizationPrompt(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  rows={4}
                  placeholder="Describe how you'd like to visualize your data..."
                />
              </div>

              {/* Upload Button */}
              {!datasetUploaded && (
                <button
                  onClick={handleUploadDataset}
                  disabled={!selectedFile || isUploading}
                  className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Visualization/Results */}
        <div className="w-1/2 bg-black text-white flex flex-col">
          <div className="flex-1 flex items-center justify-center p-12">
            {!datasetUploaded ? (
              /* Placeholder State */
              <div className="w-full max-w-md">
                <div className="bg-gray-800 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">Data visualization will appear here</p>
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              /* Processing State */
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-6"></div>
                <h2 className="text-3xl font-bold mb-2">Processing data...</h2>
                <p className="text-gray-400">Analyzing your dataset and generating insights</p>
              </div>
            ) : datasetAnalysis ? (
              /* Results State */
              <div className="w-full max-w-4xl overflow-y-auto max-h-[calc(100vh-200px)]">
                {/* Analysis Summary */}
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-bold mb-4">Dataset Analysis</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400">Dataset:</span>
                      <span className="ml-2">{datasetAnalysis.dataset_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <span className="ml-2 capitalize">{datasetAnalysis.dataset_type}</span>
                    </div>
                  </div>
                  
                  {/* Analysis Summary */}
                  {datasetAnalysis.data_analysis && (
                    <div className="mb-4">
                      <span className="text-gray-400 text-sm font-medium">Summary:</span>
                      <div className="mt-2 text-sm text-gray-300 leading-relaxed">
                        {typeof datasetAnalysis.data_analysis === 'string' ? (
                          <p>{datasetAnalysis.data_analysis.slice(0, 200)}...</p>
                        ) : (
                          <div className="space-y-2">
                            {datasetAnalysis.data_analysis.summary && (
                              <p className="text-gray-100">{datasetAnalysis.data_analysis.summary}</p>
                            )}
                            {datasetAnalysis.data_analysis.key_insights && datasetAnalysis.data_analysis.key_insights.length > 0 && (
                              <div>
                                <span className="text-gray-400 text-xs font-medium">Key Insights:</span>
                                <ul className="list-disc list-inside text-xs mt-1 space-y-1 text-gray-300">
                                  {datasetAnalysis.data_analysis.key_insights.slice(0, 3).map((insight: string, index: number) => (
                                    <li key={index}>{insight}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-green-400 text-sm">Analysis Complete</span>
                  </div>
                </div>

                {/* Visualizations */}
                {datasetAnalysis.visualization_data && datasetAnalysis.visualization_data.success && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Data Visualizations</h3>
                    <div className="space-y-6">
                      {Object.entries(datasetAnalysis.visualization_data.visualizations).map(([chartName, chartData]) => (
                        <div key={chartName} className="bg-gray-900 rounded-lg p-4">
                          <h4 className="text-lg font-medium mb-3 capitalize text-gray-200">
                            {chartName.replace('_', ' ')}
                          </h4>
                          <div className="bg-white rounded p-2">
                            <img 
                              src={chartData} 
                              alt={`${chartName} visualization`}
                              className="w-full h-auto rounded"
                              style={{ maxHeight: '500px', objectFit: 'contain' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {datasetAnalysis.visualization_data.note && (
                      <div className="mt-4 p-3 bg-gray-700 rounded text-sm text-gray-300">
                        📝 {datasetAnalysis.visualization_data.note}
                      </div>
                    )}
                  </div>
                )}

                {/* Error State for Visualizations */}
                {datasetAnalysis.visualization_data && !datasetAnalysis.visualization_data.success && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Visualizations</h3>
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                      <div className="flex items-center text-red-400 mb-2">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Visualization Generation Failed
                      </div>
                      <p className="text-sm text-gray-300">
                        {datasetAnalysis.visualization_data.error || datasetAnalysis.visualization_data.message || 'Unable to generate visualizations for this dataset.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Continue Button */}
          {datasetAnalysis && datasetAnalysis.status === 'ready' && (
            <div className="p-12 border-t border-gray-800">
              <button
                onClick={handleContinue}
                className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-100 transition"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md">
          <ErrorDisplay
            error={error}
            context="data processing"
            onRetry={async () => {
              if (selectedFile && !datasetUploaded) {
                return handleUploadDataset();
              }
              setError('');
            }}
          />
        </div>
      )}
    </div>
  );
} 