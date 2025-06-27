'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ProjectResponse, ProjectListItem } from "../../lib/api";
import { showToast } from "../../lib/toast";
import { ErrorDisplay } from "../../components/ErrorDisplay";

export default function Dashboard() {
  const router = useRouter();
  const [projectName, setProjectName] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [projectCreated, setProjectCreated] = useState<boolean>(false);
  const [createdProjectId, setCreatedProjectId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [previousProjects, setPreviousProjects] = useState<ProjectListItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(false);
  const [isDataFromCache, setIsDataFromCache] = useState<boolean>(false);

  const suggestedPrompts = [
    { icon: "📊", text: "Train a text classifier" },
    { icon: "🎨", text: "Fine-tune a Stable Diffusion model" },
    { icon: "🔬", text: "Compare ML algorithms" },
    { icon: "📈", text: "Time series forecasting" },
    { icon: "🤖", text: "Build a chatbot" }
  ];

  const handleSuggestedPromptClick = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.createProject({
        name: projectName,
        prompt: prompt,
      });

      console.log("Project created successfully:", response);
      setCreatedProjectId(response.project_id);
      setProjectCreated(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      console.error("Failed to create project:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewProject = () => {
    setProjectCreated(false);
    setCreatedProjectId('');
    setProjectName('');
    setPrompt('');
    setError('');
  };

  const fetchPreviousProjects = async (forceRefresh: boolean = false) => {
    setIsLoadingProjects(true);
    try {
      // Clear cache if forced refresh
      if (forceRefresh) {
        apiClient.clearCache();
        setIsDataFromCache(false);
      }
      
      // Check if data will come from cache
      const willUseCache = apiClient.isCached('listProjects', 6, 0);
      
      const projects = await apiClient.listProjects(6, 0);
      setPreviousProjects(projects);
      setIsDataFromCache(willUseCache && !forceRefresh);
      
      // Show toast if data came from cache
      if (willUseCache && !forceRefresh && projects.length > 0) {
        showToast('Projects loaded from cache ⚡', { type: 'info', duration: 2000 });
      }
    } catch (err) {
      console.error('Failed to fetch previous projects:', err);
      setIsDataFromCache(false);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchPreviousProjects();
  }, []);

  const handleRefreshProjects = () => {
    fetchPreviousProjects(true);
  };

  const getStatusBadge = (status: string, trainingStatus?: string) => {
    if (trainingStatus) {
      switch (trainingStatus) {
        case 'running':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Training</span>;
        case 'completed':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Trained</span>;
        case 'failed':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Failed</span>;
        default:
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Queued</span>;
      }
    }
    
    switch (status) {
      case 'ready':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Ready</span>;
      case 'generating':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Generating</span>;
      case 'error':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Error</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Created</span>;
    }
  };

  const handleProjectClick = (project: ProjectListItem) => {
    if (project.latest_training_status && project.latest_training_status !== 'not_started') {
      // Navigate to training monitor if there's active training
      router.push(`/training/${project.project_id}`);
    } else if (project.status === 'ready' && project.has_dataset) {
      // Navigate to training setup if ready and has dataset
      router.push(`/training/${project.project_id}`);
    } else {
      // Navigate to training setup to add dataset
      router.push(`/training/${project.project_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-2xl font-bold text-black">exponent</span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Home</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Features</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Use cases</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Pricing</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Documentation</a>
            </nav>

            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
              <button className="bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition">
                Try exponent!
              </button>
              <button className="text-gray-700 hover:text-gray-900 font-medium">
                Sign in
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="text-gray-700 hover:text-gray-900">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {projectCreated ? (
          // Success State - Project Created
          <div className="text-center">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                {projectName} was<br />successfully created!
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Now let's setup your project to<br />train your model!
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleStartNewProject}
                  className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition mr-4"
                >
                  Create Another Project
                </button>
                <button
                  onClick={() => router.push(`/training/${createdProjectId}`)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Setup Training
                </button>
              </div>
              <div className="mt-6 text-sm text-gray-500">
                Project ID: {createdProjectId}
              </div>
            </div>
          </div>
        ) : (
          // Project Creation Form
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                What are you building<br />today?
              </h1>
            </div>

        <form onSubmit={handleCreateProject} className="max-w-2xl mx-auto">
          {/* Project Name */}
          <div className="mb-6">
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Name of project
            </label>
            <input
              type="text"
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
              placeholder="Enter project name"
            />
          </div>

          {/* Prompt */}
          <div className="mb-4">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 resize-none"
              placeholder="Describe what you want to build..."
            />
          </div>

          {/* Suggested Prompts - Horizontal Buttons */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedPrompts.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestedPromptClick(suggestion.text)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-200 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
                >
                  <span className="text-base">{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Create Project Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={!projectName.trim() || !prompt.trim() || isLoading}
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Project...
                </div>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto mt-6">
            <ErrorDisplay 
              error={error}
              context="project creation"
              onRetry={async () => {
                if (projectName && prompt) {
                  const fakeEvent = {
                    preventDefault: () => {}
                  } as React.FormEvent;
                  return handleCreateProject(fakeEvent);
                }
              }}
            />
          </div>
        )}

        {/* Previous Projects Section */}
        {!projectCreated && (
          <div className="mt-16 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600">Continue working on your previous projects</p>
                  {isDataFromCache && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Cached
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleRefreshProjects}
                disabled={isLoadingProjects}
                className="text-sm text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
              >
                {isLoadingProjects ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {isLoadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : previousProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previousProjects.map((project) => (
                  <div
                    key={project.project_id}
                    onClick={() => handleProjectClick(project)}
                    className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2">
                        {project.name}
                      </h3>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(project.status, project.latest_training_status)}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {project.prompt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                        {project.has_dataset && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Dataset
                          </span>
                        )}
                        {project.training_count > 0 && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {project.training_count} training{project.training_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500">Create your first project to get started!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
