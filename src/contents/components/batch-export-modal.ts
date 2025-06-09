import type { BatchTableDetectionResult, TableDetectionResult } from '../../utils/table-detection/types';
import { exportTable } from '../../lib/export';
import { exportCombinedTables } from '../../lib/exporters/combined-exporter';
import type { ExportOptions } from '../../types';
import JSZip from 'jszip';

/**
 * Export modes for batch processing
 */
const EXPORT_MODES = {
  separate: {
    key: 'separate',
    name: 'Separate Files',
    icon: '📄',
    description: 'Download each table as individual file'
  },
  zip: {
    key: 'zip', 
    name: 'ZIP Archive',
    icon: '📦',
    description: 'Download all files in ZIP archive'
  },
  combined: {
    key: 'combined',
    name: 'Combined File',
    icon: '📊',
    description: 'All tables in one file (XLSX: multiple sheets)'
  }
} as const;

type ExportMode = keyof typeof EXPORT_MODES;

/**
 * Supported export formats with icons and descriptions
 */
const EXPORT_FORMATS = {
  xlsx: {
    name: 'Excel',
    icon: '📊',
    description: 'Excel spreadsheet with formatting',
    extension: '.xlsx',
    supportsCombined: true
  },
  csv: {
    name: 'CSV',
    icon: '📄',
    description: 'Comma-separated values',
    extension: '.csv',
    supportsCombined: true
  },
  docx: {
    name: 'Word',
    icon: '📝',
    description: 'Word document with formatted table',
    extension: '.docx',
    supportsCombined: true
  },
  pdf: {
    name: 'PDF',
    icon: '📋',
    description: 'PDF document',
    extension: '.pdf',
    supportsCombined: true
  }
} as const;

type ExportFormat = keyof typeof EXPORT_FORMATS;

/**
 * Interface for batch export configuration
 */
interface BatchExportConfig {
  selectedTables: Set<string>;
  format: ExportFormat;
  exportMode: ExportMode;
  customNames: Map<string, string>;
  combinedFileName?: string;
  includeHeaders: boolean;
  zipArchive: boolean; // Legacy field for backward compatibility
}

/**
 * Constants for combined export
 */
const COMBINED_EXPORT_LIMITS = {
  maxTables: 10,
  maxSheetNameLength: 25
} as const;

/**
 * Batch export modal state
 */
interface BatchModalState {
  isVisible: boolean;
  batchResult: BatchTableDetectionResult | null;
  config: BatchExportConfig;
  isExporting: boolean;
  progress: { current: number; total: number; };
}

// Global state
let modalState: BatchModalState = {
  isVisible: false,
  batchResult: null,
  config: {
    selectedTables: new Set(),
    format: 'xlsx',
    exportMode: 'separate',
    customNames: new Map(),
    includeHeaders: true,
    zipArchive: false
  },
  isExporting: false,
  progress: { current: 0, total: 0 }
};

// Constants
const MODAL_ID = 'tabxport-batch-modal';
const OVERLAY_ID = 'tabxport-modal-overlay';

/**
 * Creates the modal overlay
 */
const createModalOverlay = (): HTMLElement => {
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });
  
  return overlay;
};

/**
 * Creates format selector HTML
 */
const createFormatSelector = (): string => {
  const options = Object.entries(EXPORT_FORMATS)
    .map(([key, format]) => `
      <option value="${key}" ${modalState.config.format === key ? 'selected' : ''}>
        ${format.icon} ${format.name} - ${format.description}
      </option>
    `).join('');
    
  return `
    <div class="format-selector">
      <label class="format-label">Export Format:</label>
      <select id="batch-format-select" class="format-select">
        ${options}
      </select>
    </div>
  `;
};

/**
 * Creates export mode selector HTML
 */
const createExportModeSelector = (): string => {
  const currentFormat = modalState.config.format;
  const formatSupportsCombin = EXPORT_FORMATS[currentFormat].supportsCombined;
  
  const modeOptions = Object.entries(EXPORT_MODES)
    .map(([key, mode]) => {
      const isDisabled = key === 'combined' && !formatSupportsCombin;
      const isSelected = modalState.config.exportMode === key;
      
      return `
        <label class="mode-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}">
          <input type="radio" name="export-mode" value="${key}" 
                 ${isSelected ? 'checked' : ''} 
                 ${isDisabled ? 'disabled' : ''}
                 class="mode-radio">
          <div class="mode-content">
            <div class="mode-header">
              <span class="mode-icon">${mode.icon}</span>
              <span class="mode-name">${mode.name}</span>
            </div>
            <div class="mode-description">${mode.description}</div>
          </div>
        </label>
      `;
    }).join('');
    
  return `
    <div class="export-mode-selector">
      <label class="section-label">Export Mode:</label>
      <div class="mode-options">
        ${modeOptions}
      </div>
    </div>
  `;
};

/**
 * Creates combined filename input HTML
 */
const createCombinedFilenameInput = (): string => {
  const isVisible = modalState.config.exportMode === 'combined';
  const selectedCount = modalState.config.selectedTables.size;
  const isOverLimit = selectedCount > COMBINED_EXPORT_LIMITS.maxTables;
  
  if (!isVisible) return '';
  
  return `
    <div class="combined-filename-section">
      <label class="combined-filename-label">
        Combined File Name (optional):
      </label>
      <input type="text" 
             id="combined-filename-input" 
             class="combined-filename-input" 
             placeholder="Monthly_Report, Data_Analysis, etc."
             value="${modalState.config.combinedFileName || ''}"
             maxlength="50">
      
      <div class="combined-info">
        <div class="table-count-info ${isOverLimit ? 'warning' : ''}">
          📊 Tables to combine: <strong>${selectedCount}/${COMBINED_EXPORT_LIMITS.maxTables}</strong>
          ${isOverLimit ? `<span class="warning-text">⚠️ Too many tables! Maximum ${COMBINED_EXPORT_LIMITS.maxTables} allowed.</span>` : ''}
        </div>
        ${modalState.config.format === 'xlsx' ? 
          '<div class="format-info">📋 Each table will be on a separate sheet</div>' : 
          '<div class="format-info">📄 All tables will be combined sequentially</div>'
        }
      </div>
    </div>
  `;
};

/**
 * Creates table list HTML
 */
const createTableList = (): string => {
  if (!modalState.batchResult) return '';
  
  const tableItems = modalState.batchResult.tables.map((table, index) => {
    const isSelected = modalState.config.selectedTables.has(table.data.id);
    const customName = modalState.config.customNames.get(table.data.id) || '';
    
    const previewText = table.data.headers.length > 0 
      ? table.data.headers.join(' | ').substring(0, 80)
      : table.data.rows[0]?.join(' | ').substring(0, 80) || 'No data';
    
    return `
      <div class="table-item ${isSelected ? 'selected' : ''}" data-table-id="${table.data.id}">
        <div class="table-item-header">
          <label class="table-checkbox-label">
            <input type="checkbox" class="table-checkbox" ${isSelected ? 'checked' : ''} 
                   data-table-id="${table.data.id}">
            <span class="table-title">Table ${index + 1}</span>
          </label>
          <span class="table-stats">${table.data.headers.length} cols × ${table.data.rows.length} rows</span>
        </div>
        <div class="table-preview">${previewText}${previewText.length >= 80 ? '...' : ''}</div>
        <div class="table-name-input">
          <input type="text" class="custom-name-input" placeholder="Custom filename (optional)" 
                 value="${customName}" data-table-id="${table.data.id}">
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <div class="table-list">
      <div class="table-list-header">
        <label class="select-all-label">
          <input type="checkbox" id="select-all-checkbox" ${modalState.config.selectedTables.size === modalState.batchResult.tables.length ? 'checked' : ''}>
          <span>Select All Tables (${modalState.batchResult.tables.length})</span>
        </label>
      </div>
      <div class="table-items">
        ${tableItems}
      </div>
    </div>
  `;
};

/**
 * Creates progress indicator HTML
 */
const createProgressIndicator = (): string => {
  const { current, total } = modalState.progress;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return `
    <div class="progress-container ${modalState.isExporting ? 'visible' : 'hidden'}">
      <div class="progress-label" id="progress-label">
        ${modalState.isExporting && current === total && modalState.config.zipArchive ? 
          '📦 Creating ZIP archive...' : 
          `Exporting tables... (${current}/${total})`
        }
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      ${modalState.isExporting && current === total && modalState.config.zipArchive ? 
        '<div class="zip-spinner">🔄</div>' : ''
      }
    </div>
  `;
};

/**
 * Creates the modal content
 */
const createModalContent = (): string => {
  const selectedCount = modalState.config.selectedTables.size;
  const totalCount = modalState.batchResult?.tables.length || 0;
  const isOverLimit = modalState.config.exportMode === 'combined' && selectedCount > COMBINED_EXPORT_LIMITS.maxTables;
  
  // Determine button text based on export mode
  let buttonText = '';
  switch (modalState.config.exportMode) {
    case 'separate':
      buttonText = `Export Separately (${selectedCount})`;
      break;
    case 'zip':
      buttonText = `Export as ZIP (${selectedCount})`;
      break;
    case 'combined':
      buttonText = `Export Combined (${selectedCount})`;
      break;
    default:
      buttonText = `Export Selected (${selectedCount})`;
  }
  
  return `
    <div class="modal-header">
      <h2 class="modal-title">📊 Export All Tables</h2>
      <button class="close-button" id="close-modal-btn">×</button>
    </div>
    
    <div class="modal-body">
      ${createFormatSelector()}
      
      <div class="options-row">
        <label class="option-label">
          <input type="checkbox" id="include-headers-checkbox" ${modalState.config.includeHeaders ? 'checked' : ''}>
          Include Headers
        </label>
        <label class="option-label">
          <input type="checkbox" id="zip-archive-checkbox" ${modalState.config.zipArchive ? 'checked' : ''}>
          📦 Download as ZIP archive
        </label>
      </div>
      
      ${createExportModeSelector()}
      ${createCombinedFilenameInput()}
      ${createTableList()}
      ${createProgressIndicator()}
    </div>
    
    <div class="modal-footer">
      <button class="cancel-button" id="cancel-btn">Cancel</button>
      <button class="export-button" id="export-btn" ${selectedCount === 0 || isOverLimit ? 'disabled' : ''}>
        ${buttonText}
      </button>
    </div>
  `;
};

/**
 * Adds CSS styles for the modal
 */
const addModalStyles = (): void => {
  const styleId = 'tabxport-modal-styles';
  
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #${MODAL_ID} {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 90vw;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .close-button {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      padding: 4px;
      border-radius: 4px;
    }
    
    .close-button:hover {
      background: #f3f4f6;
      color: #374151;
    }
    
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 24px 20px;
    }
    
    .format-selector {
      margin-bottom: 20px;
    }
    
    .format-label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .format-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
    }
    
    .options-row {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .option-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #374151;
      cursor: pointer;
    }
    
    .table-list-header {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .select-all-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
    }
    
    .table-items {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .table-item {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      transition: all 0.2s ease;
    }
    
    .table-item:hover {
      border-color: #1B9358;
      background: #f8fdf9;
    }
    
    .table-item.selected {
      border-color: #1B9358;
      background: #f0fdf4;
    }
    
    .table-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .table-checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    
    .table-title {
      font-weight: 500;
      color: #1f2937;
    }
    
    .table-stats {
      font-size: 12px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .table-preview {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
      font-family: monospace;
      background: #f9fafb;
      padding: 4px 6px;
      border-radius: 4px;
    }
    
    .custom-name-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .custom-name-input:focus {
      outline: none;
      border-color: #1B9358;
      box-shadow: 0 0 0 1px #1B9358;
    }
    
    .progress-container {
      margin-top: 16px;
      padding: 12px;
      background: #f0fdf4;
      border-radius: 6px;
      border: 1px solid #22c55e;
    }
    
    .progress-container.hidden {
      display: none;
    }
    
    .progress-label {
      font-size: 14px;
      color: #15803d;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #dcfce7;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #16a34a);
      transition: width 0.3s ease;
    }
    
    .zip-spinner {
      text-align: center;
      margin-top: 8px;
      font-size: 16px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .cancel-button, .export-button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .cancel-button {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      color: #374151;
    }
    
    .cancel-button:hover {
      background: #e5e7eb;
    }
    
    .export-button {
      background: linear-gradient(135deg, #1B9358, #16a085);
      border: 1px solid #1B9358;
      color: white;
    }
    
    .export-button:hover:not(:disabled) {
      background: linear-gradient(135deg, #166d42, #138b74);
    }
    
    .export-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .export-mode-selector {
      margin-bottom: 20px;
    }
    
    .section-label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 12px;
    }
    
    .mode-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .mode-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }
    
    .mode-option:hover:not(.disabled) {
      border-color: #1B9358;
      background: #f8fdf9;
    }
    
    .mode-option.selected {
      border-color: #1B9358;
      background: #f0fdf4;
      box-shadow: 0 0 0 1px #1B9358;
    }
    
    .mode-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f9fafb;
    }
    
    .mode-radio {
      margin-top: 2px;
    }
    
    .mode-content {
      flex: 1;
    }
    
    .mode-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    
    .mode-icon {
      font-size: 16px;
    }
    
    .mode-name {
      font-weight: 500;
      color: #1f2937;
    }
    
    .mode-description {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
    }
    
    .combined-filename-section {
      margin-bottom: 20px;
      padding: 16px;
      background: #f8fdf9;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
    }
    
    .combined-filename-label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .combined-filename-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .combined-filename-input:focus {
      outline: none;
      border-color: #1B9358;
      box-shadow: 0 0 0 1px #1B9358;
    }
    
    .combined-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .table-count-info {
      font-size: 14px;
      color: #374151;
    }
    
    .table-count-info.warning {
      color: #dc2626;
    }
    
    .warning-text {
      display: block;
      font-size: 12px;
      color: #dc2626;
      margin-top: 4px;
    }
    
    .format-info {
      font-size: 12px;
      color: #6b7280;
      font-style: italic;
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Updates progress with specific message
 */
const updateProgressWithMessage = (current: number, total: number, message?: string): void => {
  modalState.progress = { current, total };
  
  const progressLabel = document.getElementById('progress-label');
  if (progressLabel && message) {
    progressLabel.textContent = message;
  }
  
  const progressContainer = document.querySelector('.progress-container');
  if (progressContainer) {
    const progressHTML = createProgressIndicator();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = progressHTML;
    const newContent = tempDiv.querySelector('.progress-container');
    if (newContent) {
      progressContainer.innerHTML = newContent.innerHTML;
    }
  }
};

/**
 * Updates progress indicator (simple version)
 */
const updateProgress = (current: number, total: number): void => {
  updateProgressWithMessage(current, total);
};

/**
 * Handles table selection change
 */
const handleTableSelection = (tableId: string, selected: boolean): void => {
  if (selected) {
    modalState.config.selectedTables.add(tableId);
  } else {
    modalState.config.selectedTables.delete(tableId);
  }
  
  // Update UI
  updateModalContent();
};

/**
 * Handles select all toggle
 */
const handleSelectAll = (selectAll: boolean): void => {
  if (!modalState.batchResult) return;
  
  if (selectAll) {
    modalState.batchResult.tables.forEach(table => {
      modalState.config.selectedTables.add(table.data.id);
    });
  } else {
    modalState.config.selectedTables.clear();
  }
  
  updateModalContent();
};

/**
 * Handles custom name input
 */
const handleCustomNameInput = (tableId: string, customName: string): void => {
  if (customName.trim()) {
    modalState.config.customNames.set(tableId, customName.trim());
  } else {
    modalState.config.customNames.delete(tableId);
  }
};

/**
 * Updates modal content
 */
const updateModalContent = (): void => {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;
  
  modal.innerHTML = createModalContent();
  attachEventListeners();
};

/**
 * Attaches event listeners to modal elements
 */
const attachEventListeners = (): void => {
  // Close button
  const closeBtn = document.getElementById('close-modal-btn');
  closeBtn?.addEventListener('click', hideModal);
  
  // Cancel button
  const cancelBtn = document.getElementById('cancel-btn');
  cancelBtn?.addEventListener('click', hideModal);
  
  // Export button
  const exportBtn = document.getElementById('export-btn');
  exportBtn?.addEventListener('click', handleBatchExport);
  
  // Format selector
  const formatSelect = document.getElementById('batch-format-select') as HTMLSelectElement;
  formatSelect?.addEventListener('change', (e) => {
    modalState.config.format = (e.target as HTMLSelectElement).value as ExportFormat;
    // Reset to separate mode if format doesn't support combined
    if (modalState.config.exportMode === 'combined' && !EXPORT_FORMATS[modalState.config.format].supportsCombined) {
      modalState.config.exportMode = 'separate';
    }
    updateModalContent();
  });
  
  // Options checkboxes
  const includeHeadersCheckbox = document.getElementById('include-headers-checkbox') as HTMLInputElement;
  includeHeadersCheckbox?.addEventListener('change', (e) => {
    modalState.config.includeHeaders = (e.target as HTMLInputElement).checked;
  });
  
  const zipArchiveCheckbox = document.getElementById('zip-archive-checkbox') as HTMLInputElement;
  zipArchiveCheckbox?.addEventListener('change', (e) => {
    modalState.config.zipArchive = (e.target as HTMLInputElement).checked;
  });
  
  // Select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-checkbox') as HTMLInputElement;
  selectAllCheckbox?.addEventListener('change', (e) => {
    handleSelectAll((e.target as HTMLInputElement).checked);
  });
  
  // Table checkboxes
  const tableCheckboxes = document.querySelectorAll('.table-checkbox') as NodeListOf<HTMLInputElement>;
  tableCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const tableId = target.dataset.tableId;
      if (tableId) {
        handleTableSelection(tableId, target.checked);
      }
    });
  });
  
  // Custom name inputs
  const nameInputs = document.querySelectorAll('.custom-name-input') as NodeListOf<HTMLInputElement>;
  nameInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const tableId = target.dataset.tableId;
      if (tableId) {
        handleCustomNameInput(tableId, target.value);
      }
    });
  });
  
  // Export mode selector
  const modeRadios = document.querySelectorAll('input[name="export-mode"]') as NodeListOf<HTMLInputElement>;
  modeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      modalState.config.exportMode = target.value as ExportMode;
      
      // Update legacy zipArchive field for backward compatibility
      modalState.config.zipArchive = target.value === 'zip';
      
      updateModalContent();
    });
  });
  
  // Combined filename input
  const combinedFilenameInput = document.getElementById('combined-filename-input') as HTMLInputElement;
  combinedFilenameInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    modalState.config.combinedFileName = target.value.trim() || undefined;
  });
};

/**
 * Converts data URL to ArrayBuffer for ZIP
 */
const dataUrlToArrayBuffer = (dataUrl: string): ArrayBuffer => {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Generates ZIP filename based on chat title and source
 */
const generateZipFilename = (): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const source = modalState.batchResult?.source || 'AI';
  const chatTitle = modalState.batchResult?.chatTitle;
  
  if (chatTitle && chatTitle.trim() && !chatTitle.includes('Chat')) {
    const cleanTitle = chatTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    return `${cleanTitle}_Tables_${timestamp}.zip`;
  }
  
  return `${source}_Tables_${timestamp}.zip`;
};

/**
 * Executes batch export
 */
const handleBatchExport = async (): Promise<void> => {
  if (!modalState.batchResult || modalState.config.selectedTables.size === 0) return;
  
  console.log('🚀 Starting batch export...');
  console.log(`📊 Selected ${modalState.config.selectedTables.size} tables out of ${modalState.batchResult.tables.length}`);
  console.log(`📦 Export mode: ${modalState.config.exportMode}`);
  console.log(`📄 Format: ${modalState.config.format}`);
  
  const selectedTables = modalState.batchResult.tables.filter(table => 
    modalState.config.selectedTables.has(table.data.id)
  );
  
  console.log(`✅ Filtered selected tables:`, selectedTables.map(t => t.data.id));
  
  modalState.isExporting = true;
  
  // Handle combined export mode
  if (modalState.config.exportMode === 'combined') {
    try {
      console.log('📊 Starting combined export...');
      
      // Check table limit for combined export
      if (selectedTables.length > COMBINED_EXPORT_LIMITS.maxTables) {
        const errorMessage = `Too many tables selected (${selectedTables.length}/${COMBINED_EXPORT_LIMITS.maxTables}). Please select fewer tables for combined export.`;
        console.error('❌ Combined export error:', errorMessage);
        
        updateProgressWithMessage(0, selectedTables.length, `❌ ${errorMessage}`);
        
        setTimeout(() => {
          modalState.isExporting = false;
          updateModalContent();
        }, 3000);
        return;
      }
      
      updateProgressWithMessage(0, 1, `🔄 Combining ${selectedTables.length} tables into single file...`);
      
      const exportOptions = {
        format: modalState.config.format,
        includeHeaders: modalState.config.includeHeaders,
        combinedFileName: modalState.config.combinedFileName
      };
      
      const result = await exportCombinedTables(
        selectedTables.map(t => t.data), 
        exportOptions
      );
      
      if (result.success && result.downloadUrl) {
        console.log(`✅ Combined export successful: ${result.filename}`);
        
        // Download the combined file
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        updateProgressWithMessage(1, 1, `✅ Combined file downloaded: ${result.filename}`);
        
        // Close modal after delay
        setTimeout(() => {
          hideModal();
        }, 3000);
        
      } else {
        console.error('❌ Combined export failed:', result.error);
        updateProgressWithMessage(0, 1, `❌ Export failed: ${result.error}`);
        
        setTimeout(() => {
          modalState.isExporting = false;
          updateModalContent();
        }, 3000);
      }
      
    } catch (error) {
      console.error('💥 Critical error in combined export:', error);
      updateProgressWithMessage(0, 1, `💥 Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setTimeout(() => {
        modalState.isExporting = false;
        updateModalContent();
      }, 3000);
    }
    
    modalState.isExporting = false;
    return;
  }
  
  // Original separate/zip export logic
  updateProgress(0, modalState.config.selectedTables.size);
  
  let exportedCount = 0;
  let failedCount = 0;
  const exportResults: Array<{ filename: string; data: ArrayBuffer }> = [];
  const errors: string[] = [];
  
  // Export all tables first
  for (let i = 0; i < selectedTables.length; i++) {
    const table = selectedTables[i];
    const tableNumber = i + 1;
    
    try {
      console.log(`🔄 Exporting table ${tableNumber}/${selectedTables.length} (ID: ${table.data.id})`);
      
      const customName = modalState.config.customNames.get(table.data.id);
      console.log(`📝 Custom name for table ${tableNumber}: ${customName || 'none'}`);
      
      const exportOptions: ExportOptions & { tableIndex?: number } = {
        format: modalState.config.format,
        filename: customName,
        includeHeaders: modalState.config.includeHeaders,
        tableIndex: i // Добавляем индекс таблицы для уникальных имен файлов
      };
      
      updateProgressWithMessage(exportedCount, selectedTables.length, `Exporting table ${tableNumber}/${selectedTables.length}...`);
      
      const result = await exportTable(table.data, exportOptions);
      
      if (result.success && result.downloadUrl) {
        console.log(`✅ Table ${tableNumber} exported successfully: ${result.filename}`);
        
        if (modalState.config.exportMode === 'zip') {
          // Для ZIP архива собираем данные
          const arrayBuffer = dataUrlToArrayBuffer(result.downloadUrl);
          exportResults.push({
            filename: result.filename,
            data: arrayBuffer
          });
          console.log(`📦 Added to ZIP: ${result.filename} (${arrayBuffer.byteLength} bytes)`);
        } else {
          // Обычное скачивание
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log(`⬇️ Downloaded: ${result.filename}`);
        }
        
        exportedCount++;
      } else {
        console.error(`❌ Failed to export table ${tableNumber}:`, result.error);
        errors.push(`Table ${tableNumber}: ${result.error || 'Unknown error'}`);
        failedCount++;
      }
      
      updateProgress(exportedCount, selectedTables.length);
      
      // Small delay between exports
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`💥 Critical error exporting table ${tableNumber}:`, error);
      errors.push(`Table ${tableNumber}: ${error instanceof Error ? error.message : 'Critical export error'}`);
      failedCount++;
    }
  }
  
  console.log(`📊 Export summary: ${exportedCount} successful, ${failedCount} failed`);
  if (errors.length > 0) {
    console.log('❌ Errors:', errors);
  }
  
  // Создаем ZIP архив если включена опция
  if (modalState.config.exportMode === 'zip' && exportResults.length > 0) {
    try {
      console.log(`📦 Creating ZIP archive with ${exportResults.length} files...`);
      updateProgressWithMessage(exportedCount, selectedTables.length, '📦 Creating ZIP archive...');
      
      const zip = new JSZip();
      
      // Добавляем файлы в архив
      exportResults.forEach(({ filename, data }, index) => {
        zip.file(filename, data);
        console.log(`📁 Added to ZIP [${index + 1}/${exportResults.length}]: ${filename}`);
      });
      
      console.log('🔄 Generating ZIP file...');
      
      // Генерируем ZIP файл
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      console.log(`📦 ZIP generated: ${zipBlob.size} bytes`);
      
      // Скачиваем ZIP файл
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipFilename = generateZipFilename();
      
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = zipFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Очищаем URL объект
      URL.revokeObjectURL(zipUrl);
      
      console.log(`✅ ZIP archive downloaded: ${zipFilename}`);
    } catch (error) {
      console.error('💥 Error creating ZIP archive:', error);
      errors.push(`ZIP creation failed: ${error instanceof Error ? error.message : 'Unknown ZIP error'}`);
    }
  }
  
  modalState.isExporting = false;
  
  // Show completion message
  const finalMessage = modalState.config.exportMode === 'zip' ? 
    `✅ ZIP archive created with ${exportResults.length} files` :
    `✅ ${exportedCount} files downloaded`;
    
  updateProgressWithMessage(exportedCount, selectedTables.length, finalMessage);
  
  if (errors.length > 0) {
    console.warn(`⚠️ Export completed with ${errors.length} errors:`, errors);
  }
  
  // Close modal after delay
  setTimeout(() => {
    hideModal();
  }, 3000);
};

/**
 * Shows the batch export modal
 */
export const showBatchExportModal = (batchResult: BatchTableDetectionResult): void => {
  modalState.batchResult = batchResult;
  modalState.isVisible = true;
  
  // Initialize with all tables selected
  modalState.config.selectedTables.clear();
  batchResult.tables.forEach(table => {
    modalState.config.selectedTables.add(table.data.id);
  });
  
  addModalStyles();
  
  const overlay = createModalOverlay();
  
  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.innerHTML = createModalContent();
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideModal();
    }
  });
  
  attachEventListeners();
};

/**
 * Hides the batch export modal
 */
export const hideModal = (): void => {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
  
  modalState.isVisible = false;
  modalState.batchResult = null;
  modalState.config.selectedTables.clear();
  modalState.config.customNames.clear();
  modalState.isExporting = false;
  modalState.progress = { current: 0, total: 0 };
};

/**
 * Gets current modal state
 */
export const getModalState = (): BatchModalState => {
  return { ...modalState };
}; 