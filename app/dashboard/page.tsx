'use client';
import { useState } from "react";

export default function Dashboard() {
  const [projectName, setProjectName] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');

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

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    // Proceed with project creation logic here
    console.log("Creating project:", { projectName, prompt });
    // TODO: Add actual project creation logic
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
              disabled={!projectName.trim() || !prompt.trim()}
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Project
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
