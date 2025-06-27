import type { BatchTableDetectionResult } from "../../utils/table-detection/types"
import { getUserSettings } from "../../lib/storage"
import type { UserSettings } from "../../types"
import { MODAL_ID, OVERLAY_ID } from "./batch-export/constants"
import {
  createModalContent,
  createModalOverlay
} from "./batch-export/html-generators"
import {
  handleBatchExport,
  handleCustomNameInput,
  handleSelectAll,
  handleTableSelection,
  updateModalContent
} from "./batch-export/modal-handlers"
import { FormatPreferences } from "./batch-export/preferences"
import { addModalStyles } from "./batch-export/styles"
// Import from new modules
import type {
  BatchExportConfig,
  BatchModalState,
  ExportFormat,
  ExportMode
} from "./batch-export/types"
import { EXPORT_FORMATS, EXPORT_MODES } from "./batch-export/types"

// Global state
let modalState: BatchModalState = {
  isVisible: false,
  batchResult: null,
  config: {
    selectedTables: new Set(),
    format: "xlsx",
    exportMode: "separate",
    customNames: new Map(),
    combinedFileName: undefined,
    includeHeaders: true,
    zipArchive: false, // Legacy field for backward compatibility - not used in UI
    destination: "download" // Add destination field
  },
  isExporting: false,
  progress: { current: 0, total: 0 },
  rememberFormat: false // Initialize remember format state
}

/**
 * Loads user settings and updates modal state
 */
const loadUserSettingsForModal = async (): Promise<UserSettings> => {
  try {
    const settings = await getUserSettings()
    
    // Check Google Drive authentication before setting destination
    const { checkGoogleDriveAuthentication } = await import("./batch-export/modal-handlers")
    const authResult = await checkGoogleDriveAuthentication()
    const isGoogleDriveAuthenticated = authResult.success
    
    // Update modal state with user settings
    modalState.config.format = settings.defaultFormat as ExportFormat
    
    // Set destination based on authentication and user preferences
    if (settings.defaultDestination === "google_drive" && !isGoogleDriveAuthenticated) {
      // If user prefers Google Drive but not authenticated, default to download
      modalState.config.destination = "download"
      console.log("📋 Google Drive not authenticated, defaulting to download")
    } else {
      modalState.config.destination = settings.defaultDestination
    }
    
    console.log("📋 Loaded user settings for batch export:", settings)
    console.log("📋 Set destination to:", modalState.config.destination)
    return settings
  } catch (error) {
    console.error("❌ Failed to load user settings for modal:", error)
    
    // Fallback to defaults
    const defaultSettings: UserSettings = {
      defaultFormat: "xlsx",
      defaultDestination: "download",
      autoExport: false,
      theme: "auto"
    }
    
    modalState.config.format = defaultSettings.defaultFormat as ExportFormat
    modalState.config.destination = defaultSettings.defaultDestination
    
    return defaultSettings
  }
}

/**
 * Attaches event listeners to modal elements
 */
const attachEventListeners = (): void => {
  console.log('🔧 Attaching event listeners...')
  
  // Close button - remove old listeners first
  const closeBtn = document.getElementById("close-modal-btn")
  if (closeBtn) {
    closeBtn.replaceWith(closeBtn.cloneNode(true))
    const newCloseBtn = document.getElementById("close-modal-btn")
    newCloseBtn?.addEventListener("click", hideModal)
  }

  // Cancel button - remove old listeners first
  const cancelBtn = document.getElementById("cancel-btn")
  if (cancelBtn) {
    cancelBtn.replaceWith(cancelBtn.cloneNode(true))
    const newCancelBtn = document.getElementById("cancel-btn")
    newCancelBtn?.addEventListener("click", hideModal)
  }

  // Export button - remove old listeners first to prevent multiple calls
  const exportBtn = document.getElementById("export-btn")
  if (exportBtn) {
    console.log('🔧 Replacing export button to remove old listeners')
    exportBtn.replaceWith(exportBtn.cloneNode(true))
    const newExportBtn = document.getElementById("export-btn")
    newExportBtn?.addEventListener("click", () => {
      console.log('🎯 Export button clicked - calling handleBatchExport')
      handleBatchExport(modalState, hideModal)
    })
  }

  // Format selector
  const formatSelect = document.getElementById(
    "batch-format-select"
  ) as HTMLSelectElement
  formatSelect?.addEventListener("change", (e) => {
    modalState.config.format = (e.target as HTMLSelectElement)
      .value as ExportFormat
    // Reset to separate mode if format doesn't support combined
    if (
      modalState.config.exportMode === "combined" &&
      !EXPORT_FORMATS[modalState.config.format].supportsCombined
    ) {
      modalState.config.exportMode = "separate"
    }
    updateModalContent(modalState, attachEventListeners).catch(console.error)
  })

  // Options checkboxes
  const includeHeadersCheckbox = document.getElementById(
    "include-headers-checkbox"
  ) as HTMLInputElement
  includeHeadersCheckbox?.addEventListener("change", (e) => {
    modalState.config.includeHeaders = (e.target as HTMLInputElement).checked
  })

  // Select all checkbox
  const selectAllCheckbox = document.getElementById(
    "select-all-checkbox"
  ) as HTMLInputElement
  selectAllCheckbox?.addEventListener("change", (e) => {
    handleSelectAll(modalState, (e.target as HTMLInputElement).checked, () =>
      updateModalContent(modalState, attachEventListeners).catch(console.error)
    )
  })

  // Table checkboxes
  const tableCheckboxes = document.querySelectorAll(
    ".table-checkbox"
  ) as NodeListOf<HTMLInputElement>
  tableCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement
      const tableId = target.dataset.tableId
      if (tableId) {
        handleTableSelection(modalState, tableId, target.checked, () =>
          updateModalContent(modalState, attachEventListeners).catch(console.error)
        )
      }
    })
  })

  // Custom name inputs
  const nameInputs = document.querySelectorAll(
    ".custom-name-input"
  ) as NodeListOf<HTMLInputElement>
  nameInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement
      const tableId = target.dataset.tableId
      if (tableId) {
        handleCustomNameInput(modalState, tableId, target.value)
      }
    })
  })

  // Export mode selector
  const modeRadios = document.querySelectorAll(
    'input[name="export-mode"]'
  ) as NodeListOf<HTMLInputElement>
  modeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement
      modalState.config.exportMode = target.value as ExportMode

      // Update legacy zipArchive field for backward compatibility
      modalState.config.zipArchive = target.value === "zip"

      updateModalContent(modalState, attachEventListeners).catch(console.error)
    })
  })

  // Combined filename input
  const combinedFilenameInput = document.getElementById(
    "combined-filename-input"
  ) as HTMLInputElement
  combinedFilenameInput?.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement
    modalState.config.combinedFileName = target.value.trim() || undefined
  })

  // Destination selector
  const destinationRadios = document.querySelectorAll(
    'input[name="export-destination"]'
  ) as NodeListOf<HTMLInputElement>
  destinationRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement
      modalState.config.destination = target.value as "download" | "google_drive"
      console.log(`🎯 Destination changed to: ${modalState.config.destination}`)
      updateModalContent(modalState, attachEventListeners).catch(console.error)
    })
  })

  // Remember format checkbox
  const rememberFormatCheckbox = document.getElementById(
    "remember-format-checkbox"
  ) as HTMLInputElement
  rememberFormatCheckbox?.addEventListener("change", (e) => {
    const isChecked = (e.target as HTMLInputElement).checked
    modalState.rememberFormat = isChecked
    console.log(
      `📝 Remember format checkbox ${isChecked ? "checked" : "unchecked"}`
    )
  })

  // Clear format preference button
  const clearPreferenceBtn = document.getElementById("clear-format-preference")
  clearPreferenceBtn?.addEventListener("click", () => {
    FormatPreferences.clear()
    updateModalContent(modalState, attachEventListeners).catch(console.error) // Refresh to hide clear button
  })
}

/**
 * Shows the batch export modal
 */
export const showBatchExportModal = async (
  batchResult: BatchTableDetectionResult
): Promise<void> => {
  modalState.batchResult = batchResult
  modalState.isVisible = true

  // Load user settings first
  await loadUserSettingsForModal()

  // Load preferred format if available (overrides user settings)
  const preferredFormat = FormatPreferences.load()
  if (preferredFormat) {
    modalState.config.format = preferredFormat
    console.log(`🧠 Using remembered format: ${preferredFormat}`)
  }

  // Initialize with all tables selected
  modalState.config.selectedTables.clear()
  batchResult.tables.forEach((table) => {
    modalState.config.selectedTables.add(table.data.id)
  })

  addModalStyles()

  const overlay = createModalOverlay()

  const modal = document.createElement("div")
  modal.id = MODAL_ID
  
  // Check Google Drive authentication status before creating modal content
  const { checkGoogleDriveAuthentication } = await import("./batch-export/modal-handlers")
  const authResult = await checkGoogleDriveAuthentication()
  const isGoogleDriveAuthenticated = authResult.success
  
  // Set default destination to download if not authenticated
  if (!isGoogleDriveAuthenticated && modalState.config.destination === "google_drive") {
    modalState.config.destination = "download"
  }
  
  modal.innerHTML = createModalContent(modalState, isGoogleDriveAuthenticated)

  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      hideModal()
    }
  })

  attachEventListeners()
  
  console.log(`📋 Batch export modal opened with destination: ${modalState.config.destination}`)
}

/**
 * Hides the batch export modal
 */
export const hideModal = (): void => {
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) {
    overlay.remove()
  }

  modalState.isVisible = false
  modalState.batchResult = null
  modalState.config.selectedTables.clear()
  modalState.config.customNames.clear()
  modalState.config.exportMode = "separate" // Reset to default
  modalState.config.combinedFileName = undefined // Clear combined filename
  modalState.isExporting = false
  modalState.progress = { current: 0, total: 0 }
  modalState.rememberFormat = false
}

/**
 * Gets current modal state
 */
export const getModalState = (): BatchModalState => {
  return { ...modalState }
}
