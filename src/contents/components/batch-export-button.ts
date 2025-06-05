import type { BatchTableDetectionResult } from '../../utils/table-detection/types';
import { logger } from '../../utils/table-detection/common/logging';

/**
 * Interface for batch export button state
 */
interface BatchButtonState {
  visible: boolean;
  count: number;
  button: HTMLElement | null;
}

/**
 * Private state for batch export button management
 */
const createBatchButtonState = (): BatchButtonState => ({
  visible: false,
  count: 0,
  button: null
});

// Global state
const buttonState = createBatchButtonState();

// Constants
const BUTTON_ID = 'tabxport-batch-export-button';
const MIN_TABLES_FOR_BATCH = 2;

/**
 * Shows a notification (placeholder for now)
 */
const showNotification = (message: string, type: 'info' | 'success' | 'error'): void => {
  // TODO: Implement proper notification system in Phase 2
  console.log(`[${type.toUpperCase()}] ${message}`);
};

/**
 * Handles the batch export button click
 */
const handleBatchExport = (count: number): void => {
  logger.debug(`Batch export clicked for ${count} tables`);
  
  // TODO: In Phase 2, this will open the batch export modal
  // For now, just show a placeholder alert
  
  const message = `Batch export functionality coming soon!\n\nFound ${count} tables ready for export.`;
  
  // Use a nicer notification if possible, otherwise fallback to alert
  try {
    showNotification(message, 'info');
  } catch {
    alert(message);
  }
};

/**
 * Appends the button to the page
 */
const appendToPage = (button: HTMLElement): void => {
  // Try to append to body, with fallback
  const targetContainer = document.body || document.documentElement;
  targetContainer.appendChild(button);
};

/**
 * Adds CSS styles for internal button components
 */
const addInternalStyles = (): void => {
  const styleId = 'tabxport-batch-styles';
  
  if (document.getElementById(styleId)) {
    return; // Styles already added
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .tabxport-batch-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .tabxport-batch-icon {
      flex-shrink: 0;
      opacity: 0.9;
    }
    
    .tabxport-batch-content {
      flex: 1;
    }
    
    .tabxport-batch-title {
      font-weight: 600;
      line-height: 1.2;
      margin-bottom: 2px;
    }
    
    .tabxport-batch-count {
      opacity: 0.8;
      font-size: 12px;
      line-height: 1.2;
    }
    
    .tabxport-batch-arrow {
      flex-shrink: 0;
      opacity: 0.7;
      transition: transform 0.2s ease;
    }
    
    #${BUTTON_ID}:hover .tabxport-batch-arrow {
      transform: translateX(2px);
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Generates the HTML content for the button
 */
const getButtonHTML = (count: number): string => {
  return `
    <div class="tabxport-batch-container">
      <div class="tabxport-batch-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      </div>
      <div class="tabxport-batch-content">
        <div class="tabxport-batch-title">Export All Tables</div>
        <div class="tabxport-batch-count">${count} tables found</div>
      </div>
      <div class="tabxport-batch-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </div>
    </div>
  `;
};

/**
 * Applies styles to the button
 */
const applyButtonStyles = (button: HTMLElement): void => {
  // Main button styles
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: 'linear-gradient(135deg, #1B9358 0%, #16a085 100%)',
    color: 'white',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 8px 32px rgba(27, 147, 88, 0.3)',
    cursor: 'pointer',
    zIndex: '10000',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minWidth: '280px',
    userSelect: 'none'
  });

  // Add hover styles
  button.addEventListener('mouseenter', () => {
    Object.assign(button.style, {
      transform: 'translateY(-2px)',
      boxShadow: '0 12px 40px rgba(27, 147, 88, 0.4)'
    });
  });

  button.addEventListener('mouseleave', () => {
    Object.assign(button.style, {
      transform: 'translateY(0)',
      boxShadow: '0 8px 32px rgba(27, 147, 88, 0.3)'
    });
  });

  // Add internal styles
  addInternalStyles();
};

/**
 * Removes the button from the DOM
 */
const removeButton = (): void => {
  if (buttonState.button) {
    buttonState.button.remove();
  }
  
  buttonState.visible = false;
  buttonState.count = 0;
  buttonState.button = null;
};

/**
 * Updates the button text with new count
 */
const updateButtonText = (count: number): void => {
  if (!buttonState.button) return;

  const countElement = buttonState.button.querySelector('.tabxport-batch-count');
  if (countElement) {
    countElement.textContent = `${count} tables found`;
    buttonState.count = count;
  }
};

/**
 * Creates the batch export button
 */
const createButton = (count: number): void => {
  logger.debug(`Creating batch export button for ${count} tables`);

  // Remove existing button if any
  removeButton();

  const button = document.createElement('div');
  button.id = BUTTON_ID;
  button.innerHTML = getButtonHTML(count);
  
  // Add styles
  applyButtonStyles(button);
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleBatchExport(count);
  });

  // Add to page
  appendToPage(button);

  buttonState.visible = true;
  buttonState.count = count;
  buttonState.button = button;

  logger.debug('Batch export button created and added to page');
};

/**
 * Shows or updates the batch export button
 */
const showButton = (count: number): void => {
  if (buttonState.button && buttonState.visible) {
    // Update existing button
    updateButtonText(count);
    return;
  }

  // Create new button
  createButton(count);
};

/**
 * Hides the batch export button
 */
const hideButton = (): void => {
  if (buttonState.button && buttonState.visible) {
    logger.debug('Hiding batch export button');
    removeButton();
  }
};

/**
 * Updates the batch button based on detection results
 */
export const updateBatchButton = (batchResult: BatchTableDetectionResult): void => {
  const shouldShow = batchResult.count >= MIN_TABLES_FOR_BATCH;
  
  logger.debug(`Batch button update: ${batchResult.count} tables, should show: ${shouldShow}`);

  if (shouldShow) {
    showButton(batchResult.count);
  } else {
    hideButton();
  }
};

/**
 * Gets the current state of the batch button
 */
export const getBatchButtonState = (): BatchButtonState => {
  return { ...buttonState };
};

/**
 * Cleanup method
 */
export const cleanupBatchButton = (): void => {
  removeButton();
  
  // Remove styles
  const styleElement = document.getElementById('tabxport-batch-styles');
  if (styleElement) {
    styleElement.remove();
  }
}; 