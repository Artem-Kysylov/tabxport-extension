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
 * Manager for the batch export button
 */
class BatchExportButtonManager {
  private state: BatchButtonState = {
    visible: false,
    count: 0,
    button: null
  };

  private readonly BUTTON_ID = 'tabxport-batch-export-button';
  private readonly MIN_TABLES_FOR_BATCH = 2;

  /**
   * Updates the batch button based on detection results
   */
  updateButton(batchResult: BatchTableDetectionResult): void {
    const shouldShow = batchResult.count >= this.MIN_TABLES_FOR_BATCH;
    
    logger.debug(`Batch button update: ${batchResult.count} tables, should show: ${shouldShow}`);

    if (shouldShow) {
      this.showButton(batchResult.count);
    } else {
      this.hideButton();
    }
  }

  /**
   * Shows or updates the batch export button
   */
  private showButton(count: number): void {
    if (this.state.button && this.state.visible) {
      // Update existing button
      this.updateButtonText(count);
      return;
    }

    // Create new button
    this.createButton(count);
  }

  /**
   * Creates the batch export button
   */
  private createButton(count: number): void {
    logger.debug(`Creating batch export button for ${count} tables`);

    // Remove existing button if any
    this.removeButton();

    const button = document.createElement('div');
    button.id = this.BUTTON_ID;
    button.innerHTML = this.getButtonHTML(count);
    
    // Add styles
    this.applyButtonStyles(button);
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleBatchExport(count);
    });

    // Add to page
    this.appendToPage(button);

    this.state = {
      visible: true,
      count,
      button
    };

    logger.debug('Batch export button created and added to page');
  }

  /**
   * Generates the HTML content for the button
   */
  private getButtonHTML(count: number): string {
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
  }

  /**
   * Applies styles to the button
   */
  private applyButtonStyles(button: HTMLElement): void {
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
    this.addInternalStyles();
  }

  /**
   * Adds CSS styles for internal button components
   */
  private addInternalStyles(): void {
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
      
      #${this.BUTTON_ID}:hover .tabxport-batch-arrow {
        transform: translateX(2px);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Updates the button text with new count
   */
  private updateButtonText(count: number): void {
    if (!this.state.button) return;

    const countElement = this.state.button.querySelector('.tabxport-batch-count');
    if (countElement) {
      countElement.textContent = `${count} tables found`;
      this.state.count = count;
    }
  }

  /**
   * Hides the batch export button
   */
  private hideButton(): void {
    if (this.state.button && this.state.visible) {
      logger.debug('Hiding batch export button');
      this.removeButton();
    }
  }

  /**
   * Removes the button from the DOM
   */
  private removeButton(): void {
    if (this.state.button) {
      this.state.button.remove();
    }
    
    this.state = {
      visible: false,
      count: 0,
      button: null
    };
  }

  /**
   * Appends the button to the page
   */
  private appendToPage(button: HTMLElement): void {
    // Try to append to body, with fallback
    const targetContainer = document.body || document.documentElement;
    targetContainer.appendChild(button);
  }

  /**
   * Handles the batch export button click
   */
  private handleBatchExport(count: number): void {
    logger.debug(`Batch export clicked for ${count} tables`);
    
    // TODO: In Phase 2, this will open the batch export modal
    // For now, just show a placeholder alert
    
    const message = `Batch export functionality coming soon!\n\nFound ${count} tables ready for export.`;
    
    // Use a nicer notification if possible, otherwise fallback to alert
    if (this.showNotification) {
      this.showNotification(message, 'info');
    } else {
      alert(message);
    }
  }

  /**
   * Shows a notification (placeholder for now)
   */
  private showNotification(message: string, type: 'info' | 'success' | 'error'): void {
    // TODO: Implement proper notification system in Phase 2
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Gets the current state of the batch button
   */
  getState(): BatchButtonState {
    return { ...this.state };
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    this.removeButton();
    
    // Remove styles
    const styleElement = document.getElementById('tabxport-batch-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }
}

/**
 * Singleton instance of BatchExportButtonManager
 */
export const batchExportButtonManager = new BatchExportButtonManager(); 