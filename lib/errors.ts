// Enhanced error handling system with user-friendly messages and guidance

export interface ErrorDetails {
  type: ErrorType;
  title: string;
  message: string;
  action?: string;
  retryable: boolean;
  icon: string;
  severity: 'low' | 'medium' | 'high';
}

export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  PROJECT_STATUS = 'project_status',
  TRAINING = 'training',
  FILE_UPLOAD = 'file_upload',
  SERVER = 'server',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown'
}

const ERROR_PATTERNS = {
  // Network related
  'Failed to fetch': ErrorType.NETWORK,
  'NetworkError': ErrorType.NETWORK,
  'fetch': ErrorType.NETWORK,
  'Connection': ErrorType.NETWORK,
  
  // Authentication
  'Unauthorized': ErrorType.AUTHENTICATION,
  'Authentication': ErrorType.AUTHENTICATION,
  'Login': ErrorType.AUTHENTICATION,
  
  // Validation
  'validation': ErrorType.VALIDATION,
  'invalid': ErrorType.VALIDATION,
  'required': ErrorType.VALIDATION,
  'must be': ErrorType.VALIDATION,
  
  // Project status
  'Project status': ErrorType.PROJECT_STATUS,
  'project must be': ErrorType.PROJECT_STATUS,
  'not ready': ErrorType.PROJECT_STATUS,
  
  // Training specific
  'training': ErrorType.TRAINING,
  'Training': ErrorType.TRAINING,
  'GPU': ErrorType.TRAINING,
  'model': ErrorType.TRAINING,
  
  // File operations
  'upload': ErrorType.FILE_UPLOAD,
  'file': ErrorType.FILE_UPLOAD,
  'dataset': ErrorType.FILE_UPLOAD,
  
  // HTTP status based
  '404': ErrorType.NOT_FOUND,
  'not found': ErrorType.NOT_FOUND,
  'Not found': ErrorType.NOT_FOUND,
  
  '403': ErrorType.PERMISSION,
  'forbidden': ErrorType.PERMISSION,
  'permission': ErrorType.PERMISSION,
  
  '429': ErrorType.RATE_LIMIT,
  'rate limit': ErrorType.RATE_LIMIT,
  'too many': ErrorType.RATE_LIMIT,
  
  '500': ErrorType.SERVER,
  '502': ErrorType.SERVER,
  '503': ErrorType.SERVER,
  'Internal server': ErrorType.SERVER,
  'Server error': ErrorType.SERVER,
};

export function categorizeError(error: string | Error): ErrorType {
  const errorMessage = error instanceof Error ? error.message : error;
  const lowerMessage = errorMessage.toLowerCase();
  
  for (const [pattern, type] of Object.entries(ERROR_PATTERNS)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return type;
    }
  }
  
  return ErrorType.UNKNOWN;
}

export function getErrorDetails(error: string | Error, context?: string): ErrorDetails {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorType = categorizeError(error);
  
  switch (errorType) {
    case ErrorType.NETWORK:
      return {
        type: errorType,
        title: 'Connection Problem',
        message: 'Unable to connect to our servers. Please check your internet connection.',
        action: 'Try refreshing the page or check your connection',
        retryable: true,
        icon: '🌐',
        severity: 'medium'
      };
      
    case ErrorType.PROJECT_STATUS:
      return {
        type: errorType,
        title: 'Project Not Ready',
        message: 'Your project is still being prepared. This usually takes a few minutes.',
        action: 'Wait for the project to finish generating, then try again',
        retryable: true,
        icon: '⏳',
        severity: 'low'
      };
      
    case ErrorType.TRAINING:
      return {
        type: errorType,
        title: 'Training Issue',
        message: 'There was a problem with the training process.',
        action: 'Check your training parameters and try again',
        retryable: true,
        icon: '🤖',
        severity: 'medium'
      };
      
    case ErrorType.FILE_UPLOAD:
      return {
        type: errorType,
        title: 'File Upload Failed',
        message: 'Your file couldn\'t be uploaded. Make sure it\'s a valid format and under 100MB.',
        action: 'Try uploading a different file or check the file format',
        retryable: true,
        icon: '📁',
        severity: 'medium'
      };
      
    case ErrorType.VALIDATION:
      return {
        type: errorType,
        title: 'Invalid Input',
        message: errorMessage,
        action: 'Please correct the highlighted fields and try again',
        retryable: true,
        icon: '⚠️',
        severity: 'low'
      };
      
    case ErrorType.NOT_FOUND:
      return {
        type: errorType,
        title: 'Not Found',
        message: context ? `${context} could not be found. It may have been deleted or moved.` : 'The requested resource was not found.',
        action: 'Go back to dashboard and try again',
        retryable: false,
        icon: '🔍',
        severity: 'medium'
      };
      
    case ErrorType.AUTHENTICATION:
      return {
        type: errorType,
        title: 'Authentication Required',
        message: 'You need to sign in to continue.',
        action: 'Please sign in and try again',
        retryable: true,
        icon: '🔐',
        severity: 'high'
      };
      
    case ErrorType.PERMISSION:
      return {
        type: errorType,
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.',
        action: 'Contact support if you believe this is an error',
        retryable: false,
        icon: '🚫',
        severity: 'high'
      };
      
    case ErrorType.RATE_LIMIT:
      return {
        type: errorType,
        title: 'Too Many Requests',
        message: 'You\'re doing that too frequently. Please slow down.',
        action: 'Wait a few minutes before trying again',
        retryable: true,
        icon: '⏱️',
        severity: 'medium'
      };
      
    case ErrorType.SERVER:
      return {
        type: errorType,
        title: 'Server Problem',
        message: 'Our servers are having issues. This is temporary.',
        action: 'Please try again in a few minutes',
        retryable: true,
        icon: '🛠️',
        severity: 'high'
      };
      
    default:
      return {
        type: errorType,
        title: 'Something Went Wrong',
        message: errorMessage || 'An unexpected error occurred.',
        action: 'Try refreshing the page or contact support if the problem persists',
        retryable: true,
        icon: '❓',
        severity: 'medium'
      };
  }
}

export function shouldAutoRetry(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK,
    ErrorType.SERVER,
    ErrorType.RATE_LIMIT
  ].includes(errorType);
}

export function getRetryDelay(errorType: ErrorType, attemptNumber: number): number {
  const baseDelays: Record<ErrorType, number> = {
    [ErrorType.NETWORK]: 2000,
    [ErrorType.SERVER]: 5000,
    [ErrorType.RATE_LIMIT]: 10000,
    [ErrorType.AUTHENTICATION]: 3000,
    [ErrorType.VALIDATION]: 3000,
    [ErrorType.PROJECT_STATUS]: 3000,
    [ErrorType.TRAINING]: 3000,
    [ErrorType.FILE_UPLOAD]: 3000,
    [ErrorType.NOT_FOUND]: 3000,
    [ErrorType.PERMISSION]: 3000,
    [ErrorType.UNKNOWN]: 3000,
  };
  
  const baseDelay = baseDelays[errorType] || 3000;
  
  // Exponential backoff with jitter
  return baseDelay * Math.pow(2, attemptNumber - 1) + Math.random() * 1000;
} 