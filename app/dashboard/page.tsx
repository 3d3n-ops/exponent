'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { apiClient, ProjectResponse, ProjectListItem } from "../../lib/api";
import { showToast } from "../../lib/toast";
import { ErrorDisplay } from "../../components/ErrorDisplay";

export default function Dashboard() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [projectName, setProjectName] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
    
    // Check if user is signed in
    if (!isSignedIn) {
      showToast('Please sign in to create a project', { type: 'error' });
      router.push('/sign-up');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.createProject({
        name: projectName,
        prompt: prompt,
      });

      console.log("Project created successfully:", response);
      // Refresh projects list
      fetchPreviousProjects(true);
      // Redirect to data processing page immediately
      router.push(`/data-processing/${response.project_id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      console.error("Failed to create project:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewProject = () => {
    setProjectName('');
    setPrompt('');
    setError('');
  };

  const fetchPreviousProjects = async (forceRefresh: boolean = false) => {
    if (!isSignedIn) return;
    
    setIsLoadingProjects(true);
    try {
      // Clear cache if forced refresh
      if (forceRefresh) {
        apiClient.clearCache();
        setIsDataFromCache(false);
      }
      
      // Check if data will come from cache
      const willUseCache = apiClient.isCached('listProjects', 12, 0);
      
      const projects = await apiClient.listProjects(12, 0);
      setPreviousProjects(projects);
      setIsDataFromCache(willUseCache && !forceRefresh);
    } catch (err) {
      console.error('Failed to fetch previous projects:', err);
      setIsDataFromCache(false);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchPreviousProjects();
    }
  }, [isLoaded, isSignedIn]);

  const getStatusBadge = (status: string, trainingStatus?: string) => {
    if (trainingStatus) {
      switch (trainingStatus) {
        case 'running':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Training</span>;
        case 'completed':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">Trained</span>;
        case 'failed':
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">Failed</span>;
        default:
          return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Queued</span>;
      }
    }
    
    switch (status) {
      case 'ready':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">Ready</span>;
      case 'generating':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Generating</span>;
      case 'error':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">Error</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">Created</span>;
    }
  };

  const handleProjectClick = (project: ProjectListItem) => {
    if (project.latest_training_status && project.latest_training_status !== 'not_started') {
      // Navigate to training monitor if there's active training
      router.push(`/training/${project.project_id}`);
    } else if (project.status === 'ready' && project.has_dataset) {
      // Navigate to training setup if ready and has dataset
      router.push(`/training/${project.project_id}`);
    } else if (project.status === 'ready' || project.status === 'generating') {
      // Navigate to data processing if project is ready but no dataset, or still generating
      router.push(`/data-processing/${project.project_id}`);
    } else {
      // Navigate to data processing for new projects
      router.push(`/data-processing/${project.project_id}`);
    }
  };

  // Show loading spinner while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <h1 className="text-2xl font-bold text-gray-900 underline decoration-2 underline-offset-4">
              ex
            </h1>
            {/* Empty space for consistency */}
            <div></div>
          </div>
        </header>

        {/* Loading Content */}
        <div className="flex-1 bg-gray-50 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-gray-600">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <h1 className="text-2xl font-bold text-gray-900 underline decoration-2 underline-offset-4">
            ex
          </h1>

          {/* User Info */}
          <div className="flex items-center space-x-4">
            {isSignedIn ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:block">
                  Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}
                </span>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8"
                    }
                  }}
                  afterSignOutUrl="/"
                />
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <SignInButton mode="modal">
                  <button className="text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Column - Form */}
        <div className="lg:w-1/2 bg-gray-50 p-8 lg:p-16 flex flex-col justify-center">
          {/* Form */}
          <div className="max-w-md">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8 lg:mb-12 leading-tight">
                What will you build today?
              </h2>

              {!isSignedIn && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 mb-3">
                    Sign in to start creating your ML projects
                  </p>
                </div>
              )}

              <form onSubmit={handleCreateProject} className="space-y-6">
                {/* Project Name */}
                <div>
                  <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                    Name of project
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-200 border-0 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition placeholder-gray-500"
                    placeholder="Enter project name"
                    disabled={!isSignedIn}
                    required
                  />
                </div>

                {/* Prompt */}
                <div>
                  <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    Prompt
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-200 border-0 rounded-lg text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition placeholder-gray-500 resize-none"
                    placeholder="Describe what you want to build..."
                    disabled={!isSignedIn}
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!projectName.trim() || !prompt.trim() || isLoading || !isSignedIn}
                  className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </div>
                  ) : !isSignedIn ? (
                    "Sign in to Begin"
                  ) : (
                    "Begin!"
                  )}
                </button>
              </form>

              {/* Error Display */}
              {error && (
                <div className="mt-6">
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
            </div>
        </div>

        {/* Right Column - Projects */}
        <div className="lg:w-1/2 bg-gray-900 p-8 lg:p-16 text-white">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Projects</h2>
              {isSignedIn && (
                <button
                  onClick={() => fetchPreviousProjects(true)}
                  disabled={isLoadingProjects}
                  className="text-sm text-gray-400 hover:text-white transition disabled:opacity-50"
                >
                  {isLoadingProjects ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </div>

            {!isSignedIn ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-gray-400">Sign in to view your projects</p>
              </div>
            ) : isLoadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-4 h-32 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : previousProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previousProjects.map((project) => (
                  <div
                    key={project.project_id}
                    onClick={() => handleProjectClick(project)}
                    className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors min-h-[8rem] flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 flex-1">
                        {project.name}
                      </h3>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(project.status, project.latest_training_status)}
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-xs mb-3 line-clamp-2 flex-1">
                      {project.prompt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                      <span>
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {project.has_dataset && (
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Data
                          </span>
                        )}
                        {project.training_count > 0 && (
                          <span>{project.training_count} training{project.training_count > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
                <p className="text-gray-400">Create your first project to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
