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
    if (!isSignedIn) return;
    
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
    if (isLoaded && isSignedIn) {
      fetchPreviousProjects();
    }
  }, [isLoaded, isSignedIn]);

  const handleRefreshProjects = () => {
    fetchPreviousProjects(true);
  };

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
    } else {
      // Navigate to training setup to add dataset
      router.push(`/training/${project.project_id}`);
    }
  };

  // Show loading spinner while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1633] via-[#10192b] to-black flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1633] via-[#10192b] to-black text-white font-sans relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-800 opacity-30 rounded-full blur-3xl z-0" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500 opacity-20 rounded-full blur-2xl z-0" />

      {/* Navigation Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center select-none">
              <span className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-300 to-cyan-400 bg-clip-text text-transparent">
                exponent
              </span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-white/70 hover:text-white font-medium transition">Home</a>
              <a href="#" className="text-white/70 hover:text-white font-medium transition">Features</a>
              <a href="#" className="text-white/70 hover:text-white font-medium transition">Use cases</a>
              <a href="#" className="text-white/70 hover:text-white font-medium transition">Pricing</a>
              <a href="#" className="text-white/70 hover:text-white font-medium transition">Documentation</a>
            </nav>

            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <>
                  <span className="text-white/70 text-sm">
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
                <>
                  <SignUpButton mode="modal">
                    <button className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-md font-medium hover:from-blue-700 hover:to-cyan-600 transition shadow-lg">
                      Try exponent!
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="text-white/70 hover:text-white font-medium transition">
                      Sign in
                    </button>
                  </SignInButton>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="text-white/70 hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {projectCreated ? (
          // Success State - Project Created
          <div className="text-center">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm">
                <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-white via-blue-200 to-cyan-400 bg-clip-text text-transparent">
                {projectName} was<br />successfully created!
              </h1>
              <p className="text-xl text-white/80 mb-8">
                Now let's setup your project to<br />train your model!
              </p>
              <div className="space-y-4">
                <button
                  onClick={handleStartNewProject}
                  className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-8 py-3 rounded-lg font-medium hover:bg-white/20 transition mr-4"
                >
                  Create Another Project
                </button>
                <button
                  onClick={() => router.push(`/training/${createdProjectId}`)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition shadow-lg"
                >
                  Setup Training
                </button>
              </div>
              <div className="mt-6 text-sm text-white/60">
                Project ID: {createdProjectId}
              </div>
            </div>
          </div>
        ) : (
          // Project Creation Form
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-blue-200 to-cyan-400 bg-clip-text text-transparent">
                What are you building<br />today?
              </h1>
              {!isSignedIn && (
                <p className="text-white/70 text-lg mb-4">
                  Sign in to start creating your ML projects
                </p>
              )}
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 sm:p-10 max-w-2xl mx-auto">
              <form onSubmit={handleCreateProject}>
                {/* Project Name */}
                <div className="mb-6">
                  <label htmlFor="projectName" className="block text-sm font-medium text-white/70 mb-2">
                    Name of project
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-cyan-400/60 transition placeholder-white/40"
                    placeholder="Enter project name"
                    disabled={!isSignedIn}
                  />
                </div>

                {/* Prompt */}
                <div className="mb-4">
                  <label htmlFor="prompt" className="block text-sm font-medium text-white/70 mb-2">
                    Prompt
                  </label>
                  <textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-cyan-400/60 transition placeholder-white/40 resize-none"
                    placeholder="Describe what you want to build..."
                    disabled={!isSignedIn}
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
                        disabled={!isSignedIn}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-full text-sm font-medium text-white/80 hover:bg-white/20 hover:border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={!projectName.trim() || !prompt.trim() || isLoading || !isSignedIn}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Project...
                      </div>
                    ) : !isSignedIn ? (
                      "Sign in to Create Project"
                    ) : (
                      "Create Project"
                    )}
                  </button>
                </div>
              </form>
            </div>
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
        {!projectCreated && isSignedIn && (
          <div className="mt-16 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Your Projects</h2>
                <div className="flex items-center gap-2">
                  <p className="text-white/70">Continue working on your previous projects</p>
                  {isDataFromCache && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
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
                className="text-sm text-white/60 hover:text-white/80 transition disabled:opacity-50"
              >
                {isLoadingProjects ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {isLoadingProjects ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-white/10 rounded mb-3"></div>
                    <div className="h-3 bg-white/10 rounded mb-2"></div>
                    <div className="h-3 bg-white/10 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : previousProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previousProjects.map((project) => (
                  <div
                    key={project.project_id}
                    onClick={() => handleProjectClick(project)}
                    className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-lg p-6 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all duration-200 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-white text-lg leading-tight line-clamp-2">
                        {project.name}
                      </h3>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(project.status, project.latest_training_status)}
                      </div>
                    </div>
                    
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">
                      {project.prompt}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-white/50">
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
                <div className="mx-auto w-16 h-16 bg-white/10 border border-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
                <p className="text-white/60">Create your first project to get started!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
