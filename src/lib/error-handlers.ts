/**
 * Error handlers for Chrome Extension specific errors
 */

export interface ExtensionError {
  type: 'CONTEXT_INVALIDATED' | 'STORAGE_ERROR' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN'
  message: string
  recoverable: boolean
  userAction?: string
}

/**
 * Checks if an error is related to extension context invalidation
 */
export const isContextInvalidatedError = (error: Error | string): boolean => {
  const errorMessage = typeof error === 'string' ? error : error.message
  
  const contextInvalidatedPatterns = [
    'Extension context invalidated',
    'The extension context is invalidated',
    'extension context has been invalidated',
    'Cannot access chrome.storage',
    'chrome.storage is not available',
    'Cannot access a chrome:// URL',
    'Unchecked runtime.lastError'
  ]
  
  return contextInvalidatedPatterns.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  )
}

/**
 * Categorizes and provides user-friendly error information
 */
export const categorizeExtensionError = (error: Error | string): ExtensionError => {
  const errorMessage = typeof error === 'string' ? error : error.message
  
  if (isContextInvalidatedError(error)) {
    return {
      type: 'CONTEXT_INVALIDATED',
      message: 'Extension needs to be reloaded',
      recoverable: true,
      userAction: 'Please reload the extension in chrome://extensions/ or refresh the page'
    }
  }
  
  if (errorMessage.includes('storage')) {
    return {
      type: 'STORAGE_ERROR',
      message: 'Failed to access extension storage',
      recoverable: true,
      userAction: 'Try refreshing the page or reloading the extension'
    }
  }
  
  if (errorMessage.includes('auth') || errorMessage.includes('token')) {
    return {
      type: 'AUTH_ERROR',
      message: 'Authentication required',
      recoverable: true,
      userAction: 'Please reconnect your Google Drive account in extension settings'
    }
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Network connection failed',
      recoverable: true,
      userAction: 'Check your internet connection and try again'
    }
  }
  
  return {
    type: 'UNKNOWN',
    message: errorMessage,
    recoverable: false,
    userAction: 'Please contact support if this issue persists'
  }
}

/**
 * Enhanced error logging with categorization
 */
export const logExtensionError = (
  error: Error | string,
  context: string,
  additionalInfo?: Record<string, any>
): ExtensionError => {
  const categorizedError = categorizeExtensionError(error)
  
  console.error(`🚨 ${context} - ${categorizedError.type}:`, {
    error: typeof error === 'string' ? error : error.message,
    category: categorizedError.type,
    recoverable: categorizedError.recoverable,
    userAction: categorizedError.userAction,
    context,
    additionalInfo,
    stack: typeof error === 'string' ? null : error.stack
  })
  
  return categorizedError
}

/**
 * Safe Chrome storage operation with error handling
 */
export const safeStorageOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackValue?: T
): Promise<{ success: boolean; data?: T; error?: ExtensionError }> => {
  try {
    const result = await operation()
    return { success: true, data: result }
  } catch (error) {
    const categorizedError = logExtensionError(
      error as Error,
      `Storage operation: ${operationName}`
    )
    
    if (categorizedError.type === 'CONTEXT_INVALIDATED') {
      // For context invalidated errors, we can't recover but should inform the user
      return {
        success: false,
        error: categorizedError,
        data: fallbackValue
      }
    }
    
    return {
      success: false,
      error: categorizedError,
      data: fallbackValue
    }
  }
}

/**
 * Creates a user-friendly error notification
 */
export const createErrorNotification = (error: ExtensionError): void => {
  const notification = {
    type: "basic" as const,
    iconUrl: "/icon48.plasmo.aced7582.png",
    title: "TableXport Error",
    message: error.userAction || error.message
  }
  
  // Only create notification if chrome.notifications is available
  if (chrome?.notifications?.create) {
    try {
      // Wrap in Promise.resolve to handle both callback and promise-based Chrome API
      Promise.resolve(chrome.notifications.create(notification)).catch(() => {
        console.warn("⚠️ Failed to create notification, error:", error.message)
      })
    } catch (err) {
      // Fallback to console if notifications fail synchronously
      console.warn("⚠️ Failed to create notification, error:", error.message)
    }
  } else {
    console.warn("⚠️ Chrome notifications not available, error:", error.message)
  }
}

/**
 * Wrapper for Chrome runtime messaging with error handling
 */
export const safeRuntimeMessage = async (
  message: any,
  options?: chrome.runtime.MessageOptions
): Promise<{ success: boolean; response?: any; error?: ExtensionError }> => {
  try {
    const response = await chrome.runtime.sendMessage(message, options)
    
    if (chrome.runtime.lastError) {
      const error = categorizeExtensionError(chrome.runtime.lastError.message)
      return { success: false, error }
    }
    
    return { success: true, response }
  } catch (error) {
    const categorizedError = logExtensionError(
      error as Error,
      'Runtime messaging'
    )
    
    return { success: false, error: categorizedError }
  }
} 