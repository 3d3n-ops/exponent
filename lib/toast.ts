// Simple toast notification utility
export interface ToastOptions {
  type?: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

export const showToast = (message: string, options: ToastOptions = {}) => {
  const { type = 'info', duration = 3000 } = options;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full ${
    type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
    type === 'info' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
    type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
    'bg-red-100 text-red-800 border border-red-200'
  }`;
  
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>' :
          type === 'info' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>' :
          type === 'warning' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.632 0L4.232 16.5c-.77.833.192 2.5 1.732 2.5z"></path>' :
          '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'}
      </svg>
      <span class="text-sm font-medium">${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 100);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.add('translate-x-full');
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
}; 