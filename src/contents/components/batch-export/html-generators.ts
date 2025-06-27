import { COMBINED_EXPORT_LIMITS } from "./constants"
import { FormatPreferences } from "./preferences"
import type { BatchModalState, ExportFormat, ExportMode } from "./types"
import { EXPORT_FORMATS, EXPORT_MODES } from "./types"

/**
 * Creates format selector HTML
 */
export const createFormatSelector = (modalState: BatchModalState): string => {
  const options = Object.entries(EXPORT_FORMATS)
    .map(
      ([key, format]) => `
      <option value="${key}" ${modalState.config.format === key ? "selected" : ""}>
        ${format.icon} ${format.name}
      </option>
    `
    )
    .join("")

  const hasPreference = FormatPreferences.exists()

  return `
    <div class="format-selector">
      <label class="format-label">Export Format:</label>
      <div class="format-select-container">
        <select id="batch-format-select" class="format-select" title="Choose export format - Excel, CSV, Word, or PDF">
          ${options}
        </select>
        <div class="format-preferences">
          <label class="remember-format-label">
            <input type="checkbox" id="remember-format-checkbox" class="remember-format-checkbox" ${modalState.rememberFormat ? "checked" : ""}>
            <span>🧠 Запомнить мой формат</span>
          </label>
          ${
            hasPreference
              ? `
            <button type="button" id="clear-format-preference" class="clear-preference-btn" title="Очистить сохраненный формат">
              🗑️
            </button>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `
}

/**
 * Creates export mode selector HTML
 */
export const createExportModeSelector = (
  modalState: BatchModalState
): string => {
  const currentFormat = modalState.config.format
  const formatSupportsCombin = EXPORT_FORMATS[currentFormat].supportsCombined

  const modeOptions = Object.entries(EXPORT_MODES)
    .map(([key, mode]) => {
      const isDisabled = key === "combined" && !formatSupportsCombin
      const isSelected = modalState.config.exportMode === key

      return `
        <label class="mode-option ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}">
          <input type="radio" name="export-mode" value="${key}" 
                 ${isSelected ? "checked" : ""} 
                 ${isDisabled ? "disabled" : ""}
                 class="mode-radio">
          <div class="mode-content">
            <div class="mode-header">
              <span class="mode-icon">${mode.icon}</span>
              <span class="mode-name">${mode.name}</span>
            </div>
            <div class="mode-description">${mode.description}</div>
          </div>
        </label>
      `
    })
    .join("")

  return `
    <div class="export-mode-selector">
      <label class="section-label">Export Mode:</label>
      <div class="mode-options">
        ${modeOptions}
      </div>
    </div>
  `
}

/**
 * Creates combined filename input HTML
 */
export const createCombinedFilenameInput = (
  modalState: BatchModalState
): string => {
  const isVisible = modalState.config.exportMode === "combined"
  const selectedCount = modalState.config.selectedTables.size
  const isOverLimit = selectedCount > COMBINED_EXPORT_LIMITS.maxTables

  if (!isVisible) return ""

  return `
    <div class="combined-filename-section">
      <label class="combined-filename-label">
        Combined File Name (optional):
      </label>
      <input type="text" 
             id="combined-filename-input" 
             class="combined-filename-input" 
             placeholder="Monthly_Report, Data_Analysis, etc."
             value="${modalState.config.combinedFileName || ""}"
             maxlength="50">
      
      <div class="combined-info">
        <div class="table-count-info ${isOverLimit ? "warning" : ""}">
          📊 Tables to combine: <strong>${selectedCount}/${COMBINED_EXPORT_LIMITS.maxTables}</strong>
          ${isOverLimit ? `<span class="warning-text">⚠️ Too many tables! Maximum ${COMBINED_EXPORT_LIMITS.maxTables} allowed.</span>` : ""}
        </div>
        ${
          modalState.config.format === "xlsx"
            ? '<div class="format-info">📋 Each table will be on a separate sheet</div>'
            : '<div class="format-info">📄 All tables will be combined sequentially</div>'
        }
      </div>
    </div>
  `
}

/**
 * Creates table list HTML
 */
export const createTableList = (modalState: BatchModalState): string => {
  if (!modalState.batchResult) return ""

  const tableItems = modalState.batchResult.tables
    .map((table, index) => {
      const isSelected = modalState.config.selectedTables.has(table.data.id)
      const customName = modalState.config.customNames.get(table.data.id) || ""

      const previewText =
        table.data.headers.length > 0
          ? table.data.headers.join(" | ").substring(0, 80)
          : table.data.rows[0]?.join(" | ").substring(0, 80) || "No data"

      return `
      <div class="table-item ${isSelected ? "selected" : ""}" data-table-id="${table.data.id}">
        <div class="table-item-header">
          <label class="table-checkbox-label">
            <input type="checkbox" class="table-checkbox" ${isSelected ? "checked" : ""} 
                   data-table-id="${table.data.id}">
            <span class="table-title">Table ${index + 1}</span>
          </label>
          <span class="table-stats">${table.data.headers.length} cols × ${table.data.rows.length} rows</span>
        </div>
        <div class="table-preview">${previewText}${previewText.length >= 80 ? "..." : ""}</div>
        <div class="table-name-input">
          <input type="text" class="custom-name-input" placeholder="Custom filename (optional)" 
                 value="${customName}" data-table-id="${table.data.id}">
        </div>
      </div>
    `
    })
    .join("")

  return `
    <div class="table-list">
      <div class="table-list-header">
        <label class="select-all-label">
          <input type="checkbox" id="select-all-checkbox" ${modalState.config.selectedTables.size === modalState.batchResult.tables.length ? "checked" : ""}>
          <span>Select All Tables (${modalState.batchResult.tables.length})</span>
        </label>
      </div>
      <div class="table-items">
        ${tableItems}
      </div>
    </div>
  `
}

/**
 * Creates progress indicator HTML
 */
export const createProgressIndicator = (
  modalState: BatchModalState
): string => {
  const { current, total } = modalState.progress
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return `
    <div class="progress-container ${modalState.isExporting ? "visible" : "hidden"}">
      <div class="progress-label" id="progress-label">
        ${
          modalState.isExporting &&
          current === total &&
          modalState.config.zipArchive
            ? "📦 Creating ZIP archive..."
            : `Exporting tables... (${current}/${total})`
        }
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      ${
        modalState.isExporting &&
        current === total &&
        modalState.config.zipArchive
          ? '<div class="zip-spinner">🔄</div>'
          : ""
      }
    </div>
  `
}

/**
 * Creates destination selector HTML
 */
export const createDestinationSelector = (modalState: BatchModalState, isGoogleDriveAuthenticated: boolean = false): string => {
  return `
    <div class="destination-selector">
      <label class="section-label">Export Destination:</label>
      <div class="destination-options">
        <label class="destination-option ${modalState.config.destination === "download" ? "selected" : ""}">
          <input type="radio" name="export-destination" value="download" 
                 ${modalState.config.destination === "download" ? "checked" : ""} 
                 class="destination-radio">
          <div class="destination-content">
            <div class="destination-header">
              <span class="destination-icon">💾</span>
              <span class="destination-name">Download to Device</span>
            </div>
            <div class="destination-description">Save files directly to your computer</div>
          </div>
        </label>
        
        <label class="destination-option ${modalState.config.destination === "google_drive" ? "selected" : ""} ${!isGoogleDriveAuthenticated ? "disabled" : ""}">
          <input type="radio" name="export-destination" value="google_drive" 
                 ${modalState.config.destination === "google_drive" ? "checked" : ""} 
                 ${!isGoogleDriveAuthenticated ? "disabled" : ""}
                 class="destination-radio">
          <div class="destination-content">
            <div class="destination-header">
              <span class="destination-icon">☁️</span>
              <span class="destination-name">Google Drive</span>
              ${!isGoogleDriveAuthenticated ? '<span class="auth-required">🔒 Login Required</span>' : ''}
            </div>
            <div class="destination-description">
              ${isGoogleDriveAuthenticated 
                ? "Upload files directly to your Google Drive" 
                : "Sign in to your Google account to enable this option"}
            </div>
          </div>
        </label>
      </div>
    </div>
  `
}

/**
 * Creates the modal content
 */
export const createModalContent = (modalState: BatchModalState, isGoogleDriveAuthenticated: boolean = false): string => {
  const selectedCount = modalState.config.selectedTables.size
  const totalCount = modalState.batchResult?.tables.length || 0
  const isOverLimit =
    modalState.config.exportMode === "combined" &&
    selectedCount > COMBINED_EXPORT_LIMITS.maxTables

  // Determine button text based on export mode
  let buttonText = ""
  switch (modalState.config.exportMode) {
    case "separate":
      buttonText = `Export Separately (${selectedCount})`
      break
    case "zip":
      buttonText = `Export as ZIP (${selectedCount})`
      break
    case "combined":
      buttonText = `Export Combined (${selectedCount})`
      break
    default:
      buttonText = `Export Selected (${selectedCount})`
  }

  return `
    <div class="modal-header">
      <h2 class="modal-title">📊 Export All Tables</h2>
      <button class="close-button" id="close-modal-btn">×</button>
    </div>
    
    <div class="modal-body">
      ${createFormatSelector(modalState)}
      
      <div class="options-row">
        <label class="option-label">
          <input type="checkbox" id="include-headers-checkbox" ${modalState.config.includeHeaders ? "checked" : ""}>
          Include Headers
        </label>
      </div>
      
      ${createDestinationSelector(modalState, isGoogleDriveAuthenticated)}
      ${createExportModeSelector(modalState)}
      ${createCombinedFilenameInput(modalState)}
      ${createTableList(modalState)}
      ${createProgressIndicator(modalState)}
    </div>
    
    <div class="modal-footer">
      <button class="cancel-button" id="cancel-btn">Cancel</button>
      <button class="export-button" id="export-btn" ${selectedCount === 0 || isOverLimit ? "disabled" : ""}>
        ${buttonText}
      </button>
    </div>
  `
}

/**
 * Creates the modal overlay
 */
export const createModalOverlay = (): HTMLElement => {
  const overlay = document.createElement("div")
  overlay.id = "tablexport-modal-overlay"

  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    zIndex: "999999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, sans-serif"
  })

  return overlay
}
