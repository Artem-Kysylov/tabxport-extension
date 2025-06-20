import JSZip from "jszip"

import { exportTable } from "../../../lib/export"
import { exportCombinedTables } from "../../../lib/exporters/combined-exporter"
import type { ExportOptions } from "../../../types"
import type {
  BatchTableDetectionResult,
  TableDetectionResult
} from "../../../utils/table-detection/types"
import { COMBINED_EXPORT_LIMITS, MODAL_ID } from "./constants"
import { createModalContent, createProgressIndicator } from "./html-generators"
import { FormatPreferences } from "./preferences"
import type { BatchModalState, ExportFormat, ExportMode } from "./types"
import { EXPORT_FORMATS } from "./types"

/**
 * Updates progress with specific message
 */
export const updateProgressWithMessage = (
  modalState: BatchModalState,
  current: number,
  total: number,
  message?: string
): void => {
  modalState.progress = { current, total }

  const progressLabel = document.getElementById("progress-label")
  if (progressLabel && message) {
    progressLabel.textContent = message
  }

  const progressContainer = document.querySelector(".progress-container")
  if (progressContainer) {
    const progressHTML = createProgressIndicator(modalState)
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = progressHTML
    const newContent = tempDiv.querySelector(".progress-container")
    if (newContent) {
      progressContainer.innerHTML = newContent.innerHTML
    }
  }
}

/**
 * Updates progress indicator (simple version)
 */
export const updateProgress = (
  modalState: BatchModalState,
  current: number,
  total: number
): void => {
  updateProgressWithMessage(modalState, current, total)
}

/**
 * Handles table selection change
 */
export const handleTableSelection = (
  modalState: BatchModalState,
  tableId: string,
  selected: boolean,
  updateModalContentFn: () => void
): void => {
  if (selected) {
    modalState.config.selectedTables.add(tableId)
  } else {
    modalState.config.selectedTables.delete(tableId)
  }

  // Update UI
  updateModalContentFn()
}

/**
 * Handles select all toggle
 */
export const handleSelectAll = (
  modalState: BatchModalState,
  selectAll: boolean,
  updateModalContentFn: () => void
): void => {
  if (!modalState.batchResult) return

  if (selectAll) {
    modalState.batchResult.tables.forEach((table) => {
      modalState.config.selectedTables.add(table.data.id)
    })
  } else {
    modalState.config.selectedTables.clear()
  }

  updateModalContentFn()
}

/**
 * Handles custom name input
 */
export const handleCustomNameInput = (
  modalState: BatchModalState,
  tableId: string,
  customName: string
): void => {
  if (customName.trim()) {
    modalState.config.customNames.set(tableId, customName.trim())
  } else {
    modalState.config.customNames.delete(tableId)
  }
}

/**
 * Updates modal content
 */
export const updateModalContent = (
  modalState: BatchModalState,
  attachEventListenersFn: () => void
): void => {
  const modal = document.getElementById(MODAL_ID)
  if (!modal) return

  modal.innerHTML = createModalContent(modalState)
  attachEventListenersFn()
}

/**
 * Converts data URL to ArrayBuffer for ZIP
 */
const dataUrlToArrayBuffer = (dataUrl: string): ArrayBuffer => {
  const base64 = dataUrl.split(",")[1]
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Generates ZIP filename based on chat title and source
 */
const generateZipFilename = (modalState: BatchModalState): string => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  const source = modalState.batchResult?.source || "AI"
  const chatTitle = modalState.batchResult?.chatTitle

  if (chatTitle && chatTitle.trim() && !chatTitle.includes("Chat")) {
    const cleanTitle = chatTitle
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 30)
    return `${cleanTitle}_Tables_${timestamp}.zip`
  }

  return `${source}_Tables_${timestamp}.zip`
}

/**
 * Executes batch export
 */
export const handleBatchExport = async (
  modalState: BatchModalState,
  hideModalFn: () => void
): Promise<void> => {
  if (!modalState.batchResult || modalState.config.selectedTables.size === 0)
    return

  console.log("🚀 Starting batch export...")
  console.log(
    `📊 Selected ${modalState.config.selectedTables.size} tables out of ${modalState.batchResult.tables.length}`
  )
  console.log(`📦 Export mode: ${modalState.config.exportMode}`)
  console.log(`📄 Format: ${modalState.config.format}`)

  const selectedTables = modalState.batchResult.tables.filter((table) =>
    modalState.config.selectedTables.has(table.data.id)
  )

  console.log(
    `✅ Filtered selected tables:`,
    selectedTables.map((t) => t.data.id)
  )

  modalState.isExporting = true

  // Handle combined export mode
  if (modalState.config.exportMode === "combined") {
    try {
      console.log("📊 Starting combined export...")

      // Check table limit for combined export
      if (selectedTables.length > COMBINED_EXPORT_LIMITS.maxTables) {
        const errorMessage = `Too many tables selected (${selectedTables.length}/${COMBINED_EXPORT_LIMITS.maxTables}). Please select fewer tables for combined export.`
        console.error("❌ Combined export error:", errorMessage)

        updateProgressWithMessage(
          modalState,
          0,
          selectedTables.length,
          `❌ ${errorMessage}`
        )

        setTimeout(() => {
          modalState.isExporting = false
          updateModalContent(modalState, () => {}) // Empty callback since we don't have access to attachEventListeners here
        }, 3000)
        return
      }

      updateProgressWithMessage(
        modalState,
        0,
        1,
        `🔄 Combining ${selectedTables.length} tables into single file...`
      )

      const exportOptions = {
        format: modalState.config.format,
        includeHeaders: modalState.config.includeHeaders,
        combinedFileName:
          modalState.config.combinedFileName || `Combined_Export_${Date.now()}`,
        destination: "download" as const
      }

      const result = await exportCombinedTables(
        selectedTables.map((t) => t.data),
        exportOptions
      )

      if (result.success && result.downloadUrl) {
        console.log(`✅ Combined export successful: ${result.filename}`)

        // Download the combined file
        const link = document.createElement("a")
        link.href = result.downloadUrl
        link.download = result.filename || "combined_export.xlsx"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        updateProgressWithMessage(
          modalState,
          1,
          1,
          `✅ Combined file downloaded: ${result.filename}`
        )

        // Save format preference if remember checkbox is checked
        if (modalState.rememberFormat) {
          FormatPreferences.save(modalState.config.format)
          console.log(`🧠 Saved format preference: ${modalState.config.format}`)
        }

        // Close modal after delay
        setTimeout(() => {
          hideModalFn()
        }, 3000)
      } else {
        console.error("❌ Combined export failed:", result.error)
        updateProgressWithMessage(
          modalState,
          0,
          1,
          `❌ Export failed: ${result.error}`
        )

        setTimeout(() => {
          modalState.isExporting = false
          updateModalContent(modalState, () => {}) // Empty callback
        }, 3000)
      }
    } catch (error) {
      console.error("💥 Critical error in combined export:", error)
      updateProgressWithMessage(
        modalState,
        0,
        1,
        `💥 Critical error: ${error instanceof Error ? error.message : "Unknown error"}`
      )

      setTimeout(() => {
        modalState.isExporting = false
        updateModalContent(modalState, () => {}) // Empty callback
      }, 3000)
    }

    modalState.isExporting = false
    return
  }

  // Original separate/zip export logic
  updateProgress(modalState, 0, modalState.config.selectedTables.size)

  let exportedCount = 0
  let failedCount = 0
  const exportResults: Array<{ filename: string; data: ArrayBuffer }> = []
  const errors: string[] = []

  // Export all tables first
  for (let i = 0; i < selectedTables.length; i++) {
    const table = selectedTables[i]
    const tableNumber = i + 1

    try {
      console.log(
        `🔄 Exporting table ${tableNumber}/${selectedTables.length} (ID: ${table.data.id})`
      )

      const customName = modalState.config.customNames.get(table.data.id)
      console.log(
        `📝 Custom name for table ${tableNumber}: ${customName || "none"}`
      )

      const exportOptions: ExportOptions & { tableIndex?: number } = {
        format: modalState.config.format as "xlsx" | "csv" | "docx" | "pdf",
        filename: customName,
        includeHeaders: modalState.config.includeHeaders,
        destination: "download" as const,
        tableIndex: i // Add table index for unique filenames
      }

      updateProgressWithMessage(
        modalState,
        exportedCount,
        selectedTables.length,
        `Exporting table ${tableNumber}/${selectedTables.length}...`
      )

      const result = await exportTable(table.data, exportOptions)

      if (result.success && result.downloadUrl) {
        console.log(
          `✅ Table ${tableNumber} exported successfully: ${result.filename}`
        )

        if (modalState.config.exportMode === "zip") {
          // For ZIP archive collect data
          const arrayBuffer = dataUrlToArrayBuffer(result.downloadUrl)
          exportResults.push({
            filename: result.filename || `table_${tableNumber}.xlsx`,
            data: arrayBuffer
          })
          console.log(
            `📦 Added to ZIP: ${result.filename || `table_${tableNumber}`} (${arrayBuffer.byteLength} bytes)`
          )
        } else {
          // Regular download
          const link = document.createElement("a")
          link.href = result.downloadUrl
          link.download = result.filename || `table_${tableNumber}.xlsx`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          console.log(
            `⬇️ Downloaded: ${result.filename || `table_${tableNumber}`}`
          )
        }

        exportedCount++
      } else {
        console.error(`❌ Failed to export table ${tableNumber}:`, result.error)
        errors.push(`Table ${tableNumber}: ${result.error || "Unknown error"}`)
        failedCount++
      }

      updateProgress(modalState, exportedCount, selectedTables.length)

      // Small delay between exports
      await new Promise((resolve) => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`💥 Critical error exporting table ${tableNumber}:`, error)
      errors.push(
        `Table ${tableNumber}: ${error instanceof Error ? error.message : "Critical export error"}`
      )
      failedCount++
    }
  }

  console.log(
    `📊 Export summary: ${exportedCount} successful, ${failedCount} failed`
  )
  if (errors.length > 0) {
    console.log("❌ Errors:", errors)
  }

  // Create ZIP archive if enabled
  if (modalState.config.exportMode === "zip" && exportResults.length > 0) {
    try {
      console.log(
        `📦 Creating ZIP archive with ${exportResults.length} files...`
      )
      updateProgressWithMessage(
        modalState,
        exportedCount,
        selectedTables.length,
        "📦 Creating ZIP archive..."
      )

      const zip = new JSZip()

      // Add files to archive
      exportResults.forEach(({ filename, data }, index) => {
        zip.file(filename, data)
        console.log(
          `📁 Added to ZIP [${index + 1}/${exportResults.length}]: ${filename}`
        )
      })

      console.log("🔄 Generating ZIP file...")

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
      })

      console.log(`📦 ZIP generated: ${zipBlob.size} bytes`)

      // Download ZIP file
      const zipUrl = URL.createObjectURL(zipBlob)
      const zipFilename = generateZipFilename(modalState)

      const link = document.createElement("a")
      link.href = zipUrl
      link.download = zipFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up URL object
      URL.revokeObjectURL(zipUrl)

      console.log(`✅ ZIP archive downloaded: ${zipFilename}`)
    } catch (error) {
      console.error("💥 Error creating ZIP archive:", error)
      errors.push(
        `ZIP creation failed: ${error instanceof Error ? error.message : "Unknown ZIP error"}`
      )
    }
  }

  modalState.isExporting = false

  // Show completion message
  const finalMessage =
    modalState.config.exportMode === "zip"
      ? `✅ ZIP archive created with ${exportResults.length} files`
      : `✅ ${exportedCount} files downloaded`

  updateProgressWithMessage(
    modalState,
    exportedCount,
    selectedTables.length,
    finalMessage
  )

  if (errors.length > 0) {
    console.warn(`⚠️ Export completed with ${errors.length} errors:`, errors)
  }

  // Save format preference if remember checkbox is checked
  if (modalState.rememberFormat && exportedCount > 0) {
    FormatPreferences.save(modalState.config.format)
    console.log(`🧠 Saved format preference: ${modalState.config.format}`)
  }

  // Close modal after delay
  setTimeout(() => {
    hideModalFn()
  }, 3000)
}
