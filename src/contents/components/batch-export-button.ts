import { logger } from "../../utils/table-detection/common/logging"
import type { BatchTableDetectionResult } from "../../utils/table-detection/types"
import { getUserSettings } from "../../lib/storage"
import type { UserSettings } from "../../types"
import { showBatchExportModal } from "./batch-export-modal"
import { getButtonHTML } from "./batch-export/button-html"
import { BUTTON_ID, MIN_TABLES_FOR_BATCH } from "./batch-export/constants"
import { addButtonStyles, removeButtonStyles } from "./batch-export/styles"
// Import from new modules
import type { BatchButtonState } from "./batch-export/types"

/**
 * Private state for batch export button management
 */
const createBatchButtonState = (): BatchButtonState => ({
  visible: false,
  count: 0,
  button: null
})

// Global state
const buttonState = createBatchButtonState()
let currentBatchResult: BatchTableDetectionResult | null = null
let currentSettings: UserSettings | null = null

/**
 * Shows a notification (placeholder for now)
 */
const showNotification = (
  message: string,
  type: "info" | "success" | "error"
): void => {
  // TODO: Implement proper notification system in Phase 2
  console.log(`[${type.toUpperCase()}] ${message}`)
}

/**
 * Loads user settings from storage
 */
const loadUserSettings = async (): Promise<UserSettings> => {
  try {
    const settings = await getUserSettings()
    
    // Check Google Drive authentication if user prefers Google Drive
    if (settings.defaultDestination === "google_drive") {
      try {
        const authResult = await chrome.runtime.sendMessage({
          type: "CHECK_AUTH_STATUS"
        })
        
        if (!authResult?.success || !authResult?.authState?.isAuthenticated || !authResult?.authState?.hasGoogleAccess) {
          console.log("📋 Google Drive not authenticated for batch button, defaulting to download")
          settings.defaultDestination = "download"
        }
      } catch (error) {
        console.warn("Failed to check auth status for batch button, defaulting to download:", error)
        settings.defaultDestination = "download"
      }
    }
    
    currentSettings = settings
    logger.debug("Loaded user settings for batch export:", settings)
    return settings
  } catch (error) {
    logger.error("Failed to load user settings:", error)
    // Return default settings as fallback
    const defaultSettings: UserSettings = {
      defaultFormat: "xlsx",
      defaultDestination: "download",
      autoExport: false,
      theme: "auto"
    }
    currentSettings = defaultSettings
    return defaultSettings
  }
}

/**
 * Handles the batch export button click
 */
const handleBatchExport = (): void => {
  logger.debug(`Batch export clicked for ${buttonState.count} tables`)

  if (currentBatchResult && currentBatchResult.tables.length > 0) {
    showBatchExportModal(currentBatchResult)
  } else {
    showNotification("No tables available for batch export", "error")
  }
}

/**
 * Appends the button to the page
 */
const appendToPage = (button: HTMLElement): void => {
  // Try to append to body, with fallback
  const targetContainer = document.body || document.documentElement
  targetContainer.appendChild(button)
}

/**
 * Applies styles to the button
 */
const applyButtonStyles = (button: HTMLElement): void => {
  // Main button styles
  Object.assign(button.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#1B9358",
    color: "white",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 8px 32px rgba(27, 147, 88, 0.3)",
    cursor: "pointer",
    zIndex: "999980",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    minWidth: "220px",
    userSelect: "none"
  })

  // Add hover styles
  button.addEventListener("mouseenter", () => {
    Object.assign(button.style, {
      transform: "translateY(-2px)",
      boxShadow: "0 12px 40px rgba(27, 147, 88, 0.4)"
    })
  })

  button.addEventListener("mouseleave", () => {
    Object.assign(button.style, {
      transform: "translateY(0)",
      boxShadow: "0 8px 32px rgba(27, 147, 88, 0.3)"
    })
  })

  // Add internal styles
  addButtonStyles()
}

/**
 * Removes the button from the DOM
 */
const removeButton = (): void => {
  if (buttonState.button) {
    buttonState.button.remove()
  }

  buttonState.visible = false
  buttonState.count = 0
  buttonState.button = null
}

/**
 * Updates the button content with new count and settings
 */
const updateButtonContent = async (count: number): Promise<void> => {
  if (!buttonState.button) return

  try {
    const settings = await loadUserSettings()
    const destination = settings.defaultDestination
    
    // Update the entire button content with new settings
    buttonState.button.innerHTML = getButtonHTML(count, destination)
    buttonState.count = count
    
    logger.debug(`Updated button content: ${count} tables, destination: ${destination}`)
  } catch (error) {
    logger.error("Failed to update button content:", error)
    // Fallback to simple text update
    const countElement = buttonState.button.querySelector(".tablexport-batch-count")
    if (countElement) {
      countElement.textContent = `${count} tables found`
      buttonState.count = count
    }
  }
}

/**
 * Creates the batch export button
 */
const createButton = async (count: number): Promise<void> => {
  logger.debug(`Creating batch export button for ${count} tables`)

  // Remove existing button if any
  removeButton()

  try {
    const settings = await loadUserSettings()
    const destination = settings.defaultDestination

    const button = document.createElement("div")
    button.id = BUTTON_ID
    button.innerHTML = getButtonHTML(count, destination)

    // Add styles
    applyButtonStyles(button)

    // Add click handler
    button.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      handleBatchExport()
    })

    // Add to page
    appendToPage(button)

    buttonState.visible = true
    buttonState.count = count
    buttonState.button = button

    logger.debug(`Batch export button created with destination: ${destination}`)
  } catch (error) {
    logger.error("Failed to create button with settings, using fallback:", error)
    
    // Fallback to default button
    const button = document.createElement("div")
    button.id = BUTTON_ID
    button.innerHTML = getButtonHTML(count, "download")

    applyButtonStyles(button)
    button.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      handleBatchExport()
    })

    appendToPage(button)

    buttonState.visible = true
    buttonState.count = count
    buttonState.button = button
  }
}

/**
 * Shows or updates the batch export button
 */
const showButton = async (count: number): Promise<void> => {
  console.log(`TableXport Batch: showButton called with count: ${count}`)
  console.log(
    `TableXport Batch: Current button state - visible: ${buttonState.visible}, button exists: ${!!buttonState.button}`
  )

  if (buttonState.button && buttonState.visible) {
    // Update existing button
    console.log(`TableXport Batch: Updating existing button content`)
    await updateButtonContent(count)
    return
  }

  // Create new button
  console.log(`TableXport Batch: Creating new button`)
  await createButton(count)
}

/**
 * Hides the batch export button
 */
const hideButton = (): void => {
  console.log(`TableXport Batch: hideButton called`)
  console.log(
    `TableXport Batch: Current button state - visible: ${buttonState.visible}, button exists: ${!!buttonState.button}`
  )

  if (buttonState.button && buttonState.visible) {
    logger.debug("Hiding batch export button")
    console.log(`TableXport Batch: Removing button from DOM`)
    removeButton()
  } else {
    console.log(`TableXport Batch: No button to hide`)
  }
}

/**
 * Main function to update batch button based on detection results
 */
export const updateBatchButton = async (
  batchResult: BatchTableDetectionResult
): Promise<void> => {
  const tableCount = batchResult.tables.length
  currentBatchResult = batchResult

  console.log(`TableXport Batch: updateBatchButton called with ${tableCount} tables`)

  if (tableCount >= MIN_TABLES_FOR_BATCH) {
    console.log(`TableXport Batch: Showing button for ${tableCount} tables`)
    await showButton(tableCount)
  } else {
    console.log(`TableXport Batch: Hiding button (${tableCount} < ${MIN_TABLES_FOR_BATCH})`)
    hideButton()
  }
}

/**
 * Forces refresh of button based on current user settings
 */
export const refreshButtonWithSettings = async (): Promise<void> => {
  if (!buttonState.button || !buttonState.visible || !currentBatchResult) {
    return
  }

  logger.debug("Refreshing button with latest settings")
  await updateButtonContent(buttonState.count)
}

/**
 * Returns current button state for debugging
 */
export const getBatchButtonState = (): BatchButtonState => {
  return { ...buttonState }
}

/**
 * Refreshes all batch export buttons on the page after settings change
 */
export const refreshAllBatchExportButtons = async (): Promise<void> => {
  console.log("🔄 refreshAllBatchExportButtons started")
  
  try {
    // Получаем текущие настройки
    const settings = await chrome.storage.sync.get(["defaultDestination"])
    const currentDestination = settings.defaultDestination || "download"
    console.log("📥 Current destination setting:", currentDestination)
    
    // 1. Обновляем текущую кнопку batch export если она существует
    if (buttonState.visible && buttonState.button && currentBatchResult) {
      console.log("🔧 Refreshing current batch export button")
      await updateButtonContent(buttonState.count)
      console.log("✅ Current batch button updated")
    }
    
    // 2. Ищем и обновляем все остальные кнопки batch export на странице
    const batchButtons = document.querySelectorAll('[id*="batch"], [class*="batch"], [class*="export-all"], button')
    console.log(`🔍 Found ${batchButtons.length} potential batch export buttons`)
    
    let updatedButtons = 0
    
    batchButtons.forEach((button, index) => {
      if (button instanceof HTMLElement) {
        const buttonText = button.textContent || ""
        const isExportButton = buttonText.includes("Export") && (buttonText.includes("tables") || buttonText.includes("All"))
        
        if (isExportButton) {
          console.log(`🔧 Processing export button ${index + 1}:`, buttonText.substring(0, 50))
          
          // Обновляем текст кнопки в зависимости от destination
          let newText: string
          if (currentDestination === "google_drive") {
            newText = buttonText.replace(/to Device|Download/gi, "to Google Drive")
            if (!newText.includes("Google Drive") && !newText.includes("to Device")) {
              newText += " to Google Drive"
            }
          } else {
            newText = buttonText.replace(/to Google Drive/gi, "to Device")
            if (!newText.includes("Device") && !newText.includes("Google Drive")) {
              newText += " to Device"
            }
          }
          
          if (newText !== buttonText) {
            button.textContent = newText
            console.log(`✅ Updated button text: "${buttonText}" → "${newText}"`)
            updatedButtons++
          } else {
            console.log(`ℹ️  Button text already correct: "${buttonText}"`)
          }
        }
      }
    })
    
    console.log(`🎉 refreshAllBatchExportButtons completed: ${updatedButtons} buttons updated`)
  } catch (error) {
    console.error("❌ Error in refreshAllBatchExportButtons:", error)
  }
}

/**
 * Cleanup function for component unmounting
 */
export const cleanupBatchButton = (): void => {
  hideButton()
  currentBatchResult = null
  currentSettings = null
}
