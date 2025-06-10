import type { BatchTableDetectionResult } from '../../utils/table-detection/types';

// Import from new modules
import type { BatchModalState, BatchExportConfig, ExportFormat, ExportMode } from './batch-export/types';
import { EXPORT_FORMATS, EXPORT_MODES } from './batch-export/types';
import { MODAL_ID, OVERLAY_ID } from './batch-export/constants';
import { FormatPreferences } from './batch-export/preferences';
import { createModalOverlay, createModalContent } from './batch-export/html-generators';
import { addModalStyles } from './batch-export/styles';
import { 
  handleTableSelection, 
  handleSelectAll, 
  handleCustomNameInput, 
  updateModalContent,
  handleBatchExport 
} from './batch-export/modal-handlers';

// Global state
let modalState: BatchModalState = {
  isVisible: false,
  batchResult: null,
  config: {
    selectedTables: new Set(),
    format: 'xlsx',
    exportMode: 'separate',
    customNames: new Map(),
    combinedFileName: undefined,
    includeHeaders: true,
    zipArchive: false // Legacy field for backward compatibility - not used in UI
  },
  isExporting: false,
  progress: { current: 0, total: 0 },
  rememberFormat: false // Initialize remember format state
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
  exportBtn?.addEventListener('click', () => handleBatchExport(modalState, hideModal));
  
  // Format selector
  const formatSelect = document.getElementById('batch-format-select') as HTMLSelectElement;
  formatSelect?.addEventListener('change', (e) => {
    modalState.config.format = (e.target as HTMLSelectElement).value as ExportFormat;
    // Reset to separate mode if format doesn't support combined
    if (modalState.config.exportMode === 'combined' && !EXPORT_FORMATS[modalState.config.format].supportsCombined) {
      modalState.config.exportMode = 'separate';
    }
    updateModalContent(modalState, attachEventListeners);
  });
  
  // Options checkboxes
  const includeHeadersCheckbox = document.getElementById('include-headers-checkbox') as HTMLInputElement;
  includeHeadersCheckbox?.addEventListener('change', (e) => {
    modalState.config.includeHeaders = (e.target as HTMLInputElement).checked;
  });
  
  // Select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-checkbox') as HTMLInputElement;
  selectAllCheckbox?.addEventListener('change', (e) => {
    handleSelectAll(modalState, (e.target as HTMLInputElement).checked, () => updateModalContent(modalState, attachEventListeners));
  });
  
  // Table checkboxes
  const tableCheckboxes = document.querySelectorAll('.table-checkbox') as NodeListOf<HTMLInputElement>;
  tableCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const tableId = target.dataset.tableId;
      if (tableId) {
        handleTableSelection(modalState, tableId, target.checked, () => updateModalContent(modalState, attachEventListeners));
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
        handleCustomNameInput(modalState, tableId, target.value);
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
      
      updateModalContent(modalState, attachEventListeners);
    });
  });
  
  // Combined filename input
  const combinedFilenameInput = document.getElementById('combined-filename-input') as HTMLInputElement;
  combinedFilenameInput?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    modalState.config.combinedFileName = target.value.trim() || undefined;
  });
  
  // Remember format checkbox
  const rememberFormatCheckbox = document.getElementById('remember-format-checkbox') as HTMLInputElement;
  rememberFormatCheckbox?.addEventListener('change', (e) => {
    const isChecked = (e.target as HTMLInputElement).checked;
    modalState.rememberFormat = isChecked;
    console.log(`📝 Remember format checkbox ${isChecked ? 'checked' : 'unchecked'}`);
  });
  
  // Clear format preference button
  const clearPreferenceBtn = document.getElementById('clear-format-preference');
  clearPreferenceBtn?.addEventListener('click', () => {
    FormatPreferences.clear();
    updateModalContent(modalState, attachEventListeners); // Refresh to hide clear button
  });
};

/**
 * Shows the batch export modal
 */
export const showBatchExportModal = (batchResult: BatchTableDetectionResult): void => {
  modalState.batchResult = batchResult;
  modalState.isVisible = true;
  
  // Load preferred format if available
  const preferredFormat = FormatPreferences.load();
  if (preferredFormat) {
    modalState.config.format = preferredFormat;
    console.log(`🧠 Using remembered format: ${preferredFormat}`);
  }
  
  // Initialize with all tables selected
  modalState.config.selectedTables.clear();
  batchResult.tables.forEach(table => {
    modalState.config.selectedTables.add(table.data.id);
  });
  
  addModalStyles();
  
  const overlay = createModalOverlay();
  
  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.innerHTML = createModalContent(modalState);
  
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
  modalState.config.exportMode = 'separate'; // Reset to default
  modalState.config.combinedFileName = undefined; // Clear combined filename
  modalState.isExporting = false;
  modalState.progress = { current: 0, total: 0 };
  modalState.rememberFormat = false;
};

/**
 * Gets current modal state
 */
export const getModalState = (): BatchModalState => {
  return { ...modalState };
}; 