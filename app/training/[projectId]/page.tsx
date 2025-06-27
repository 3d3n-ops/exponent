'use client';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, TrainingRequest, TrainingResponse } from "../../../lib/api";
import { ErrorDisplay } from "../../../components/ErrorDisplay";
import { showToast } from "../../../lib/toast";

type DatasetType = 'text' | 'image';
type GPUProvider = 'A10G' | 'A100-40GB' | 'A100-80GB' | 'T4' | 'H100';

export default function TrainingSetup() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Dataset state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetType, setDatasetType] = useState<DatasetType>('text');
  const [isUploading, setIsUploading] = useState(false);
  const [datasetUploaded, setDatasetUploaded] = useState(false);

  // Training configuration state
  const [gpuProvider, setGpuProvider] = useState<GPUProvider>('A10G');
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.001);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [trainingId, setTrainingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Project state
  const [projectStatus, setProjectStatus] = useState<string>('');
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isPollingStatus, setIsPollingStatus] = useState(false);
  const [pollTimeoutRef, setPollTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const gpuOptions = [
    { value: 'T4' as GPUProvider, label: 'NVIDIA T4', description: 'Good for smaller models' },
    { value: 'A10G' as GPUProvider, label: 'NVIDIA A10G', description: 'Balanced performance' },
    { value: 'A100-40GB' as GPUProvider, label: 'NVIDIA A100 40GB', description: 'High performance' },
    { value: 'A100-80GB' as GPUProvider, label: 'NVIDIA A100 80GB', description: 'Maximum performance' },
    { value: 'H100' as GPUProvider, label: 'NVIDIA H100', description: 'Latest generation' },
  ];

  // Function to check project status
  const checkProjectStatus = async () => {
    try {
      const response = await apiClient.getProjectStatus(projectId);
      setProjectStatus(response.status);
      
      if (response.status === 'error') {
        setError(response.message || 'Project has an error');
      } else {
        setError(''); // Clear any previous errors
      }
      
      return response.status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
      throw err;
    }
  };

  // Start polling project status when it's generating
  const startStatusPolling = () => {
    if (isPollingStatus) return; // Prevent multiple polling instances
    
    setIsPollingStatus(true);
    
    const pollStatus = async () => {
      try {
        const status = await checkProjectStatus();
        
        if (status === 'ready') {
          // Project is ready, stop polling
          setIsPollingStatus(false);
          setPollTimeoutRef(null);
          showToast('🎉 Project code generation complete! Ready for training.', { 
            type: 'success', 
            duration: 4000 
          });
        } else if (status === 'generating') {
          // Still generating, continue polling
          const timeout = setTimeout(pollStatus, 3000); // Poll every 3 seconds
          setPollTimeoutRef(timeout);
        } else if (status === 'error') {
          // Error occurred, stop polling
          setIsPollingStatus(false);
          setPollTimeoutRef(null);
        } else {
          // Other status, stop polling
          setIsPollingStatus(false);
          setPollTimeoutRef(null);
        }
      } catch (err) {
        console.error('Status polling failed:', err);
        // Continue polling even if one request fails
        const timeout = setTimeout(pollStatus, 5000); // Retry after 5 seconds
        setPollTimeoutRef(timeout);
      }
    };
    
    // Start polling after a short delay
    const initialTimeout = setTimeout(pollStatus, 2000);
    setPollTimeoutRef(initialTimeout);
  };

  // Update elapsed time when generating
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isPollingStatus && generationStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - generationStartTime) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPollingStatus, generationStartTime]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef) {
        clearTimeout(pollTimeoutRef);
      }
    };
  }, [pollTimeoutRef]);

  // Check project status on load
  useEffect(() => {
    const initialStatusCheck = async () => {
      try {
        const status = await checkProjectStatus();
        // If project is already generating when we load, start polling
        if (status === 'generating') {
          startStatusPolling();
        }
      } finally {
        setIsLoadingProject(false);
      }
    };

    initialStatusCheck();
  }, [projectId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-detect dataset type based on file extension
      const extension = file.name.toLowerCase().split('.').pop();
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '')) {
        setDatasetType('image');
      } else {
        setDatasetType('text');
      }
    }
  };

  const handleUploadDataset = async () => {
    if (!selectedFile) return;

    // Validate project status before upload
    if (projectStatus !== 'ready' && projectStatus !== 'generating') {
      setError(`Cannot upload dataset. Project status: ${projectStatus}. Please wait for project to be ready.`);
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      await apiClient.uploadDataset(projectId, selectedFile);
      setDatasetUploaded(true);
      // Update project status after successful upload
      setProjectStatus('generating');
      
      // Show immediate feedback and start polling
      showToast('📁 Dataset uploaded! Generating updated project code...', { 
        type: 'info', 
        duration: 3000 
      });
      
      // Track generation start time
      setGenerationStartTime(Date.now());
      
      // Start polling to check when code generation is complete
      startStatusPolling();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload dataset';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!datasetUploaded) {
      setError('Please upload a dataset first');
      return;
    }

    // Validate project is ready for training
    if (projectStatus !== 'ready') {
      setError(`Cannot start training. Project status: ${projectStatus}. Please wait for project to be ready.`);
      return;
    }

    setIsTraining(true);
    setError('');

    try {
      const trainingRequest: TrainingRequest = {
        project_id: projectId,
        gpu_provider: gpuProvider,
        epochs: epochs,
        batch_size: batchSize,
        learning_rate: learningRate,
      };

      const response = await apiClient.startTraining(trainingRequest);
      setTrainingId(response.training_id);
      setTrainingStarted(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start training';
      setError(errorMessage);
    } finally {
      setIsTraining(false);
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

  // Show error state if project has issues
  if (projectStatus === 'error') {
    return (
      <ErrorDisplay
        error={error || 'Project has an error'}
        context="Project"
        showFullPage={true}
        onRetry={async () => {
          setIsLoadingProject(true);
          try {
            const response = await apiClient.getProjectStatus(projectId);
            setProjectStatus(response.status);
            if (response.status === 'error') {
              setError(response.message || 'Project has an error');
            } else {
              setError('');
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
            setError(errorMessage);
          } finally {
            setIsLoadingProject(false);
          }
        }}
      />
    );
  }

  if (trainingStarted) {
    return (
      <div className="min-h-screen bg-white">
        {/* Navigation Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-black">exponent</span>
              </div>
            </div>
          </div>
        </header>

        {/* Training Started Success */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Training Started!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your model is now training on {gpuProvider} GPU.<br />
              You can monitor the progress below.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push(`/training/${projectId}/${trainingId}`)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition mr-4"
              >
                Monitor Training
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition"
              >
                Back to Dashboard
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              <p>💡 The "View Results" option will be available once training completes.</p>
            </div>
            <div className="mt-6 text-sm text-gray-500">
              Training ID: {trainingId}
            </div>
          </div>
        </main>
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
              <span className="text-2xl font-bold text-black">exponent</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Setup Training
          </h1>
          <p className="text-xl text-gray-600">
            Upload your dataset and configure training parameters
          </p>
          
          {/* Project Status Indicator */}
          <div className="mt-6 flex justify-center">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              projectStatus === 'ready' ? 'bg-green-100 text-green-800' :
              projectStatus === 'generating' ? 'bg-blue-100 text-blue-800' :
              projectStatus === 'created' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {projectStatus === 'ready' && '✓ Project Ready'}
              {projectStatus === 'generating' && '⏳ Generating Code...'}
              {projectStatus === 'created' && '📝 Project Created'}
              {projectStatus && !['ready', 'generating', 'created'].includes(projectStatus) && `Status: ${projectStatus}`}
            </div>
          </div>
          
          {projectStatus === 'generating' && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                                         <p className="text-sm font-medium text-blue-900">
                       {datasetUploaded ? 'Updating project with your dataset...' : 'Generating project code...'}
                     </p>
                     <p className="text-xs text-blue-700 mt-1">
                       {isPollingStatus ? (
                         generationStartTime ? (
                           `Running for ${elapsedTime}s • We'll notify you when ready!`
                         ) : (
                           'We\'ll notify you when it\'s ready!'
                         )
                       ) : (
                         'This usually takes 1-2 minutes.'
                       )}
                     </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          {/* Dataset Upload Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Upload Dataset</h2>
            
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Dataset File
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">CSV, JSON, TXT, or image files</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".csv,.json,.txt,.xlsx,.parquet,.pkl,.jpg,.jpeg,.png,.gif,.bmp"
                    />
                  </label>
                </div>
                
                {selectedFile && (
                  <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={handleUploadDataset}
                        disabled={isUploading || datasetUploaded}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploading ? 'Uploading...' : datasetUploaded ? 'Uploaded ✓' : 'Upload'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dataset Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dataset Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="datasetType"
                      value="text"
                      checked={datasetType === 'text'}
                      onChange={(e) => setDatasetType(e.target.value as DatasetType)}
                      className="mr-2"
                    />
                    Text Data
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="datasetType"
                      value="image"
                      checked={datasetType === 'image'}
                      onChange={(e) => setDatasetType(e.target.value as DatasetType)}
                      className="mr-2"
                    />
                    Image Data
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Training Configuration Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Training Configuration</h2>
            
            <div className="space-y-6">
              {/* GPU Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GPU Type
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {gpuOptions.map((option) => (
                    <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="gpu"
                        value={option.value}
                        checked={gpuProvider === option.value}
                        onChange={(e) => setGpuProvider(e.target.value as GPUProvider)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Training Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Epochs
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={epochs}
                    onChange={(e) => setEpochs(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="512"
                    value={batchSize}
                    onChange={(e) => setBatchSize(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Learning Rate
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    max="1"
                    step="0.0001"
                    value={learningRate}
                    onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <ErrorDisplay
              error={error}
              context="training setup"
              onRetry={async () => {
                // Retry the last failed operation
                if (error.includes('upload') && selectedFile) {
                  return handleUploadDataset();
                } else if (error.includes('training') && datasetUploaded) {
                  return handleStartTraining();
                } else if (error.includes('project')) {
                  // Retry loading project status
                  setIsLoadingProject(true);
                  try {
                    const response = await apiClient.getProjectStatus(projectId);
                    setProjectStatus(response.status);
                    if (response.status === 'error') {
                      setError(response.message || 'Project has an error');
                    } else {
                      setError('');
                    }
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
                    setError(errorMessage);
                  } finally {
                    setIsLoadingProject(false);
                  }
                }
              }}
            />
          )}

          {/* Start Training Button */}
          <div className="text-center">
            <button
              onClick={handleStartTraining}
              disabled={!datasetUploaded || isTraining || projectStatus !== 'ready'}
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTraining ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting Training...
                </div>
              ) : (
                "Start Training"
              )}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              {projectStatus !== 'ready' ? "Project must be ready before training" :
               !datasetUploaded ? "Upload a dataset first to enable training" : ""}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 