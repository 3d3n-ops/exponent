const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ProjectPrompt {
  name: string;
  prompt: string;
}

export interface ProjectResponse {
  project_id: string;
  status: 'created' | 'generating' | 'ready' | 'error';
  message?: string;
}

export interface ApiError {
  detail: string;
}

export interface TrainingRequest {
  project_id: string;
  gpu_provider: 'A10G' | 'A100-40GB' | 'A100-80GB' | 'T4' | 'H100';
  epochs: number;
  batch_size: number;
  learning_rate: number;
  additional_params?: Record<string, any>;
}

export interface TrainingResponse {
  training_id: string;
  project_id: string;
  status: 'not_started' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  logs?: string[];
  metrics?: Record<string, any>;
}

export interface ProjectListItem {
  project_id: string;
  name: string;
  prompt: string;
  status: 'created' | 'generating' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
  dataset_name?: string;
  training_count: number;
  latest_training_status?: 'not_started' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  has_dataset: boolean;
}

export interface TrainingSummary {
  project_id: string;
  training_id: string;
  project_name: string;
  summary: {
    technical_summary: string;
    layman_summary: string;
    key_achievements: string[];
    recommendations: string[];
  };
  ai_summary_status: 'not_generated' | 'generating' | 'completed' | 'failed';
  ai_summary_error?: string;
  training_metrics: Record<string, any>;
  training_duration: number;
  gpu_used: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiClient {
  private baseUrl: string;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly PROJECT_LIST_TTL = 2 * 60 * 1000; // 2 minutes for project list
  private readonly TRAINING_SUMMARY_TTL = 30 * 60 * 1000; // 30 minutes for completed training summaries

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getCacheKey(method: string, ...params: any[]): string {
    return `${method}:${params.join(':')}`;
  }

  private isValidCache<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCache(entry)) {
      return entry.data;
    }
    // Clean up expired cache
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Public method to clear all cache
  public clearCache(): void {
    this.cache.clear();
  }

  // Public method to invalidate project-related cache
  public invalidateProjectCache(projectId?: string): void {
    if (projectId) {
      this.invalidateCache(projectId);
    } else {
      this.invalidateCache('listProjects');
      this.invalidateCache('getProjectStatus');
    }
  }

  // Public method to check if data is cached
  public isCached(method: string, ...params: any[]): boolean {
    const cacheKey = this.getCacheKey(method, ...params);
    const entry = this.cache.get(cacheKey);
    return entry ? this.isValidCache(entry) : false;
  }

  // Public method to get cache statistics
  public getCacheStats(): { total: number; valid: number; expired: number; hitRate: string } {
    let valid = 0;
    let expired = 0;
    
    for (const entry of this.cache.values()) {
      if (this.isValidCache(entry)) {
        valid++;
      } else {
        expired++;
      }
    }
    
    const total = valid + expired;
    const hitRate = total > 0 ? ((valid / total) * 100).toFixed(1) + '%' : '0%';
    
    return { total, valid, expired, hitRate };
  }

  // Public method to log cache stats to console
  public logCacheStats(): void {
    const stats = this.getCacheStats();
    console.log('🚀 API Cache Statistics:', stats);
    console.log('📊 Cache entries:', Array.from(this.cache.keys()));
  }

  async createProject(projectData: ProjectPrompt): Promise<ProjectResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Invalidate projects list cache since we created a new project
      this.invalidateCache('listProjects');
      
      return result;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  async getProjectStatus(projectId: string): Promise<ProjectResponse> {
    const cacheKey = this.getCacheKey('getProjectStatus', projectId);
    
    // Check cache first
    const cached = this.getFromCache<ProjectResponse>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/status`);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache for shorter time since status can change
      this.setCache(cacheKey, result, 30 * 1000); // 30 seconds
      
      return result;
    } catch (error) {
      console.error('Failed to get project status:', error);
      throw error;
    }
  }

  async uploadDataset(projectId: string, file: File): Promise<ProjectResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/projects/${projectId}/upload-dataset/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Invalidate project-related cache since dataset was uploaded
      this.invalidateProjectCache(projectId);
      
      return result;
    } catch (error) {
      console.error('Failed to upload dataset:', error);
      throw error;
    }
  }

  async startTraining(trainingRequest: TrainingRequest): Promise<TrainingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${trainingRequest.project_id}/train/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainingRequest),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Invalidate project-related cache since training started
      this.invalidateProjectCache(trainingRequest.project_id);
      
      return result;
    } catch (error) {
      console.error('Failed to start training:', error);
      throw error;
    }
  }

  async getTrainingStatus(projectId: string, trainingId: string): Promise<TrainingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/train/${trainingId}/status`);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get training status:', error);
      throw error;
    }
  }

  async getTrainingLogs(projectId: string, trainingId: string, lastN: number = 500): Promise<{
    training_id: string;
    project_id: string;
    logs: string[];
    total_logs: number;
    status: string;
    last_updated: string | null;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/train/${trainingId}/logs?last_n=${lastN}`);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get training logs:', error);
      throw error;
    }
  }

  async listProjects(limit: number = 20, offset: number = 0): Promise<ProjectListItem[]> {
    const cacheKey = this.getCacheKey('listProjects', limit, offset);
    
    // Check cache first
    const cached = this.getFromCache<ProjectListItem[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/projects/?limit=${limit}&offset=${offset}`);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Cache project list with shorter TTL since it changes frequently
      this.setCache(cacheKey, result, this.PROJECT_LIST_TTL);
      
      return result;
    } catch (error) {
      console.error('Failed to list projects:', error);
      throw error;
    }
  }

  async getTrainingSummary(projectId: string, trainingId: string): Promise<TrainingSummary> {
    const cacheKey = this.getCacheKey('getTrainingSummary', projectId, trainingId);
    
    // Check cache first - training summaries don't change once generated
    const cached = this.getFromCache<TrainingSummary>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/train/${trainingId}/summary`);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Only cache completed AI summaries, not generating ones
      if (result.ai_summary_status === 'completed') {
        this.setCache(cacheKey, result, this.TRAINING_SUMMARY_TTL);
      } else if (result.ai_summary_status === 'generating') {
        // Cache for a short time to avoid hammering the server
        this.setCache(cacheKey, result, 10 * 1000); // 10 seconds
      }
      
      return result;
    } catch (error) {
      console.error('Failed to get training summary:', error);
      throw error;
    }
  }

  async downloadModelWeights(projectId: string, trainingId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/train/${trainingId}/download-weights`);
      
      if (!response.ok) {
        // Try to parse error as JSON if possible, otherwise use status text
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Return the response as a blob directly
      return await response.blob();
    } catch (error) {
      console.error('Failed to download model weights:', error);
      throw error;
    }
  }

  async downloadProjectCode(projectId: string, trainingId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/train/${trainingId}/download-code`);
      
      if (!response.ok) {
        // Try to parse error as JSON if possible, otherwise use status text
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Return the response as a blob directly
      return await response.blob();
    } catch (error) {
      console.error('Failed to download project code:', error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();

// Expose cache utilities to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).apiCache = {
    stats: () => apiClient.getCacheStats(),
    log: () => apiClient.logCacheStats(),
    clear: () => apiClient.clearCache(),
    invalidateProjects: () => apiClient.invalidateProjectCache()
  };
} 