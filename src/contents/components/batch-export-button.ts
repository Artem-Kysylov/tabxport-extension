import { logger } from "../../utils/table-detection/common/logging"
import type { BatchTableDetectionResult } from "../../utils/table-detection/types"
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
    background: "linear-gradient(135deg, #1B9358 0%, #16a085 100%)",
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
    minWidth: "280px",
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
 * Updates the button text with new count
 */
const updateButtonText = (count: number): void => {
  if (!buttonState.button) return

  const countElement = buttonState.button.querySelector(
    ".tablexport-batch-count"
  )
  if (countElement) {
    countElement.textContent = `${count} tables found`
    buttonState.count = count
  }
}

/**
 * Creates the batch export button
 */
const createButton = (count: number): void => {
  logger.debug(`Creating batch export button for ${count} tables`)

  // Remove existing button if any
  removeButton()

  const button = document.createElement("div")
  button.id = BUTTON_ID
  button.innerHTML = getButtonHTML(count)

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

  logger.debug("Batch export button created and added to page")
}

/**
 * Shows or updates the batch export button
 */
const showButton = (count: number): void => {
  console.log(`TableXport Batch: showButton called with count: ${count}`)
  console.log(
    `TableXport Batch: Current button state - visible: ${buttonState.visible}, button exists: ${!!buttonState.button}`
  )

  if (buttonState.button && buttonState.visible) {
    // Update existing button
    console.log(`TableXport Batch: Updating existing button text`)
    updateButtonText(count)
    return
  }

  // Create new button
  console.log(`TableXport Batch: Creating new button`)
  createButton(count)
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
 * Updates the batch button based on detection results
 */
export const updateBatchButton = (
  batchResult: BatchTableDetectionResult
): void => {
  const shouldShow = batchResult.count >= MIN_TABLES_FOR_BATCH

  logger.debug(
    `Batch button update: ${batchResult.count} tables, should show: ${shouldShow}`
  )
  console.log(
    `TableXport Batch: Detected ${batchResult.count} tables on ${batchResult.source}, min required: ${MIN_TABLES_FOR_BATCH}, should show: ${shouldShow}`
  )
  console.log(
    `TableXport Batch: Button currently visible: ${buttonState.visible}, current count: ${buttonState.count}`
  )

  if (shouldShow) {
    console.log(
      `TableXport Batch: Showing button for ${batchResult.count} tables`
    )
    showButton(batchResult.count)
  } else {
    console.log(
      `TableXport Batch: Hiding button (insufficient tables: ${batchResult.count} < ${MIN_TABLES_FOR_BATCH})`
    )
    hideButton()
  }

  currentBatchResult = batchResult
}

/**
 * Gets the current state of the batch button
 */
export const getBatchButtonState = (): BatchButtonState => {
  return { ...buttonState }
}

/**
 * Cleanup method
 */
export const cleanupBatchButton = (): void => {
  removeButton()
  removeButtonStyles()
}
