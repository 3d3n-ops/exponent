'use client';
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient, TrainingRequest, TrainingResponse, TrainingConfigOptions } from "../../../lib/api";
import { ErrorDisplay } from "../../../components/ErrorDisplay";
import { showToast } from "../../../lib/toast";

export default function TrainingSetup() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  // Training configuration state
  const [configOptions, setConfigOptions] = useState<TrainingConfigOptions | null>(null);
  const [modelType, setModelType] = useState<string>('classifier');
  const [gpuProvider, setGpuProvider] = useState<string>('A10G');
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.001);
  const [trainSplit, setTrainSplit] = useState(80);
  const [testSplit, setTestSplit] = useState(20);
  const [validationMetric, setValidationMetric] = useState<string>('accuracy');

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [trainingId, setTrainingId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  
  // Project state
  const [projectStatus, setProjectStatus] = useState<string>('');
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [datasetUploaded, setDatasetUploaded] = useState(false);

  // Polling control
  const [isPolling, setIsPolling] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Stop polling function
  const stopPolling = () => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setIsPolling(false);
  };

  // Load training configuration options and project status
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load configuration options
        const options = await apiClient.getTrainingConfigOptions();
        setConfigOptions(options);
        
        // Set default values
        if (options.default_values) {
          setEpochs(options.default_values.epochs);
          setBatchSize(options.default_values.batch_size);
          setLearningRate(options.default_values.learning_rate);
          setTrainSplit(options.default_values.train_split * 100);
          setTestSplit(options.default_values.test_split * 100);
        }

        // Check project status
        const statusResponse = await apiClient.getProjectStatus(projectId);
        setProjectStatus(statusResponse.status);
        
        if (statusResponse.status === 'error') {
          setError(statusResponse.message || 'Project has an error');
        }

        // Check if dataset exists
        try {
          const analysis = await apiClient.getDatasetAnalysis(projectId);
          if (analysis && analysis.dataset_name) {
            setDatasetUploaded(true);
          }
        } catch (err) {
          // No dataset uploaded yet
          console.log('No existing dataset found');
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
      } finally {
        setIsLoadingProject(false);
      }
    };

    loadData();
  }, [projectId]);

  const handleStartTraining = async () => {
    if (!datasetUploaded) {
      setError('Please upload a dataset first');
      return;
    }

    if (projectStatus !== 'ready') {
      setError(`Cannot start training. Project status: ${projectStatus}. Please wait for project to be ready.`);
      return;
    }

    // Prevent multiple training starts
    if (isTraining || trainingStarted) {
      return;
    }

    setIsTraining(true);
    setError('');

    try {
      const trainingRequest: TrainingRequest = {
        project_id: projectId,
        model_type: modelType as any,
        gpu_provider: gpuProvider as any,
        epochs: epochs,
        batch_size: batchSize,
        learning_rate: learningRate,
        train_split: trainSplit / 100,
        validation_split: (100 - trainSplit - testSplit) / 100,
        test_split: testSplit / 100,
        validation_metric: validationMetric as any,
        early_stopping: true,
        patience: 5,
        random_seed: 42,
      };

      const response = await apiClient.startTraining(trainingRequest);
      setTrainingId(response.training_id);
      setTrainingStarted(true);
      
      // Start polling logs only if not already polling
      if (!isPolling) {
        setIsPolling(true);
        pollingTimeoutRef.current = setTimeout(() => {
          pollTrainingLogs(response.training_id);
        }, 2000);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start training';
      setError(errorMessage);
    } finally {
      setIsTraining(false);
    }
  };

  const pollTrainingLogs = async (tId: string) => {
    // Clear any existing timeout
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    try {
      const logsResponse = await apiClient.getTrainingLogs(projectId, tId, 100);
      setLogs(logsResponse.logs || []);
      
      // Continue polling if training is still running
      if (['queued', 'running'].includes(logsResponse.status) && isPolling) {
        pollingTimeoutRef.current = setTimeout(() => {
          pollTrainingLogs(tId);
        }, 3000);
      } else {
        // Training completed or failed, stop polling
        setIsPolling(false);
      }
    } catch (err) {
      console.error('Failed to poll training logs:', err);
      // Stop polling on error
      setIsPolling(false);
    }
  };

  // Get validation metrics based on selected model type
  const getValidationMetrics = () => {
    if (!configOptions) return [];
    
    return configOptions.validation_metrics.filter(metric => {
      if (modelType === 'regression') {
        return metric.suitable_for.includes('regression');
      } else if (['classifier', 'nlp', 'computer_vision'].includes(modelType)) {
        return metric.suitable_for.includes('classification');
      }
      return true;
    });
  };

  // Show loading state
  if (isLoadingProject || !configOptions) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
            setError(response.status === 'error' ? response.message || 'Project has an error' : '');
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

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Column - Training Configuration */}
      <div className="w-1/2 border-r border-gray-200 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              ← Back
            </button>
            <span className="text-2xl font-bold text-black">ex</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Testing & Training</h1>
          <p className="text-gray-600">Configure your model training parameters</p>
        </div>

        {/* Model Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Model Selection</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {configOptions.model_types.slice(0, 3).map((model) => (
              <button
                key={model.value}
                onClick={() => setModelType(model.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  modelType === model.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {configOptions.model_types.slice(3).map((model) => (
              <button
                key={model.value}
                onClick={() => setModelType(model.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  modelType === model.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fine-tuning */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Fine-tuning (optional)</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm">
              Models
            </button>
          </div>
        </div>

        {/* Data-splitting ratio */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Data-splitting ratio</h2>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Train</span>
              <span className="text-sm font-medium text-gray-700">{trainSplit}/{100 - trainSplit}</span>
              <span className="text-sm font-medium text-gray-700">Test</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div 
                className="absolute h-2 bg-gray-800 rounded-full"
                style={{ width: `${trainSplit}%` }}
              ></div>
            </div>
            <input
              type="range"
              min="60"
              max="90"
              value={trainSplit}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setTrainSplit(value);
                setTestSplit(100 - value);
              }}
              className="absolute top-0 w-full h-2 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* GPU Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">GPU</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {configOptions.gpu_providers.slice(0, 3).map((gpu) => (
              <button
                key={gpu.value}
                onClick={() => setGpuProvider(gpu.value)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                  gpuProvider === gpu.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {gpu.label.replace('NVIDIA ', '')}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {configOptions.gpu_providers.slice(3).map((gpu) => (
              <button
                key={gpu.value}
                onClick={() => setGpuProvider(gpu.value)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                  gpuProvider === gpu.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {gpu.label.replace('NVIDIA ', '')}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Parameters */}
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Epochs</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size</label>
              <input
                type="number"
                min="1"
                max="512"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Learning Rate</label>
              <input
                type="number"
                min="0.0001"
                max="1"
                step="0.0001"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validation Metric</label>
            <select
              value={validationMetric}
              onChange={(e) => setValidationMetric(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getValidationMetrics().map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay
              error={error}
              context="training setup"
              onRetry={async () => {
                if (error.includes('training') && datasetUploaded) {
                  return handleStartTraining();
                }
              }}
            />
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={handleStartTraining}
          disabled={!datasetUploaded || isTraining || projectStatus !== 'ready' || trainingStarted}
          className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTraining ? 'Starting Training...' : trainingStarted ? 'Training Started' : 'Continue'}
        </button>
        
        {!datasetUploaded && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-2">No dataset uploaded yet.</p>
            <button
              onClick={() => router.push(`/data-processing/${projectId}`)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Upload Dataset →
            </button>
          </div>
        )}
      </div>

      {/* Right Column - Training Logs and Results */}
      <div className="w-1/2 bg-black text-white p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Training logs...</h2>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
          {!trainingStarted ? (
            <div className="text-gray-400">
              Training logs will appear here once training starts...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-gray-400">
              Starting training... Logs will appear shortly.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 text-green-400">
                {log}
              </div>
            ))
          )}
        </div>

        {trainingStarted && (
          <div className="mt-6">
            <button
              onClick={() => {
                stopPolling();
                router.push(`/training/${projectId}/${trainingId}`);
              }}
              className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 