import JSZip from "jszip"

import { cleanTableData, validateTableData } from "../../../lib/export"
import { ExportService } from "../../../services/export"
import { googleDriveService } from "../../../lib/google-drive-api"
import { safeStorageOperation, logExtensionError, createErrorNotification } from "../../../lib/error-handlers"
import type { ExportOptions, ChromeMessage, ChromeMessageType } from "../../../types"
import type {
  BatchTableDetectionResult,
  TableDetectionResult
} from "../../../utils/table-detection/types"
import { COMBINED_EXPORT_LIMITS, MODAL_ID } from "./constants"
import { createModalContent, createProgressIndicator } from "./html-generators"
import { FormatPreferences } from "./preferences"
import type { BatchModalState, ExportFormat, ExportMode } from "./types"
import { EXPORT_FORMATS } from "./types"
import { showNotification } from "../export-button"

// Google Drive service is imported as a singleton instance
// Create ExportService instance for analytics support
const exportService = new ExportService()

// Global flag to prevent multiple simultaneous exports across all instances
let globalExportInProgress = false
let globalExportId: string | null = null

/**
 * Converts data URL to array buffer for ZIP processing
 */

/**
 * Enhanced authentication check using background script
 */
export const checkGoogleDriveAuthentication = async (): Promise<{
  success: boolean
  error?: string
  needsAuth?: boolean
}> => {
  try {
    console.log("🔍 Checking Google Drive authentication via background script...")
    
    // Отправляем запрос на проверку аутентификации в background script
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_AUTH_STATUS"
    })
    
    console.log("🔍 Auth check response:", response)
    
    if (!response.success) {
      return {
        success: false,
        error: response.error || "Authentication check failed",
        needsAuth: true
      }
    }
    
    const authData = response.authState // ← Исправлено: используем authState вместо data
    if (!authData || !authData.isAuthenticated) {
      return {
        success: false,
        error: "User is not authenticated. Please sign in first.",
        needsAuth: true
      }
    }
    
    if (!authData.hasGoogleAccess) {
      return {
        success: false,
        error: "Google Drive access not available. Please reconnect your Google account.",
        needsAuth: true
      }
    }
    
    console.log("✅ Google Drive authentication verified via background script")
    return { success: true }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("❌ Authentication check failed:", errorMessage)
    
    // Check if it's a context invalidation error
    if (errorMessage.toLowerCase().includes('extension context') || 
        errorMessage.toLowerCase().includes('chrome.runtime')) {
      return {
        success: false,
        error: "Extension context was invalidated. Please reload the extension or refresh the page.",
        needsAuth: false
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      needsAuth: false
    }
  }
}

/**
 * Upload file to Google Drive via background script
 */
export const uploadToGoogleDriveViaBackground = async (
  filename: string,
  dataUrl: string,
  format: ExportFormat | 'zip'
): Promise<{ success: boolean; error?: string; webViewLink?: string }> => {
  try {
    console.log(`🔍 [FIXED] Uploading ready file to Google Drive via background: ${filename}`)
    console.log(`🔍 DataURL preview: ${dataUrl.substring(0, 100)}...`)
    
    // FIXED: Send ready file for direct upload instead of empty table
    const message = {
      type: "EXPORT_TABLE" as ChromeMessageType,
      payload: {
        tableData: {
          source: "batch-export-ready-file",
          headers: [],
          rows: [],
          id: `batch-${Date.now()}`
        },
        options: {
          format: format === 'zip' ? 'xlsx' : format,
          includeHeaders: true,
          destination: 'google_drive',
          filename: filename,
          // NEW: Add ready file data for direct upload
          isBatchUpload: true,
          dataUrl: dataUrl
        } as any
      }
    }
    
    console.log(`📤 [FIXED] Sending ready file upload request for: ${filename}`)
    
    const response = await chrome.runtime.sendMessage(message)
    console.log(`📤 Background upload response:`, response)
    
    if (response.success) {
      console.log(`✅ [FIXED] Ready file uploaded successfully: ${filename}`)
      return {
        success: true,
        webViewLink: response.googleDriveLink
      }
    } else {
      console.error(`❌ [FIXED] Ready file upload failed: ${response.error}`)
      return {
        success: false,
        error: response.error || 'Upload failed'
      }
    }
  } catch (error) {
    console.error('💥 Error uploading ready file via background:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

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
export const updateModalContent = async (
  modalState: BatchModalState,
  attachEventListenersFn: () => void
): Promise<void> => {
  const modal = document.getElementById(MODAL_ID)
  if (!modal) return

  // Check Google Drive authentication status
  const authResult = await checkGoogleDriveAuthentication()
  const isGoogleDriveAuthenticated = authResult.success
  
  // Set default destination to download if not authenticated
  if (!isGoogleDriveAuthenticated && modalState.config.destination === "google_drive") {
    modalState.config.destination = "download"
  }

  modal.innerHTML = createModalContent(modalState, isGoogleDriveAuthenticated)
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
 * Enhanced batch export handler with improved error handling
 */
export const handleBatchExport = async (
  modalState: BatchModalState,
  hideModalFn: () => void
): Promise<void> => {
  const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`🚀 BATCH EXPORT START [${exportId}]: mode=${modalState.config.exportMode}, destination=${modalState.config.destination}`)
  console.log(`📊 Selected tables count: ${modalState.config.selectedTables.size}`)
  console.log(`🔍 Export function called at:`, new Date().toISOString())
  console.log(`🆔 Export ID: ${exportId}`)
  
  // Check global export flag first
  if (globalExportInProgress) {
    console.warn(`❌ GLOBAL EXPORT IN PROGRESS (ID: ${globalExportId}), ignoring duplicate call [${exportId}]`)
    return
  }
  
  if (modalState.isExporting) {
    console.warn("❌ Export already in progress, ignoring duplicate call")
    return
  }
  
  // Set global flags
  globalExportInProgress = true
  globalExportId = exportId
  
  // Set exporting flag immediately to prevent double calls
  modalState.isExporting = true

  // Reset any previous state to prevent contamination from previous calls
  console.log(`🧹 [${exportId}] Resetting export state...`)
  
  console.log(`🚀 Starting batch export with ${modalState.config.selectedTables.size} tables`)
  console.log("Export configuration:", {
    format: modalState.config.format,
    mode: modalState.config.mode,
    destination: modalState.config.destination,
    selectedTables: Array.from(modalState.config.selectedTables)
  })

  // Enhanced Google Drive authentication check
  if (modalState.config.destination === "google_drive") {
    const authCheck = await checkGoogleDriveAuthentication()
    
    if (!authCheck.success) {
      console.error("❌ Google Drive authentication failed:", authCheck.error)
      
      updateProgressWithMessage(
        modalState,
        0,
        1,
        authCheck.needsAuth 
          ? `🔐 ${authCheck.error}`
          : `❌ ${authCheck.error}`
      )
      
      if (authCheck.needsAuth) {
        // Show additional instruction for authentication
        setTimeout(() => {
          updateProgressWithMessage(
            modalState,
            0,
            1,
            `📝 To connect: Open extension popup → Settings → Connect Google Drive`
          )
        }, 2000)
        
        setTimeout(() => {
          modalState.isExporting = false
          globalExportInProgress = false
          globalExportId = null
          updateModalContent(modalState, () => {}).catch(console.error)
        }, 6000)
      } else {
        // For context invalidation errors, show reload instruction
        setTimeout(() => {
          updateProgressWithMessage(
            modalState,
            0,
            1,
            `🔄 Please reload the extension or refresh the page to continue`
          )
        }, 2000)
        
        setTimeout(() => {
          modalState.isExporting = false
          globalExportInProgress = false
          globalExportId = null
          updateModalContent(modalState, () => {}).catch(console.error)
        }, 6000)
      }
      
      return
    }
  }

  if (!modalState.batchResult || modalState.config.selectedTables.size === 0) {
    globalExportInProgress = false
    globalExportId = null
    modalState.isExporting = false
    return
  }

  console.log("🚀 Starting batch export...")
  console.log(
    `📊 Selected ${modalState.config.selectedTables.size} tables out of ${modalState.batchResult.tables.length}`
  )
  console.log(`📦 Export mode: ${modalState.config.exportMode}`)
  console.log(`📄 Format: ${modalState.config.format}`)
  console.log(`📁 Destination: ${modalState.config.destination}`)

  const selectedTables = modalState.batchResult.tables.filter((table) =>
    modalState.config.selectedTables.has(table.data.id)
  )

  console.log(
    `✅ Filtered selected tables:`,
    selectedTables.map((t) => t.data.id)
  )

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
          globalExportInProgress = false
          globalExportId = null
          updateModalContent(modalState, () => {}).catch(console.error) // Empty callback since we don't have access to attachEventListeners here
        }, 3000)
        return
      }

      const destinationText = modalState.config.destination === 'google_drive' ? 'to Google Drive' : ''
      updateProgressWithMessage(
        modalState,
        0,
        1,
        `🔄 Combining ${selectedTables.length} tables into single file ${destinationText}...`
      )

      const exportOptions = {
        format: modalState.config.format,
        includeHeaders: modalState.config.includeHeaders,
        combinedFileName:
          modalState.config.combinedFileName || `Combined_Export_${Date.now()}`,
        destination: modalState.config.destination,
        analytics: modalState.config.analytics,
        mergeSimilarColumns: modalState.config.mergeSimilarColumns
      }

      const result = await exportService.combineTables(
        selectedTables.map((t) => t.data),
        exportOptions
      )

      if (result.success && result.downloadUrl) {
        console.log(`✅ Combined export successful: ${result.filename}`)

        if (modalState.config.destination === 'google_drive') {
          // Upload to Google Drive
          updateProgressWithMessage(
            modalState,
            0,
            1,
            `☁️ Uploading to Google Drive: ${result.filename}...`
          )
          
          const uploadResult = await uploadToGoogleDriveViaBackground(
            result.filename || 'combined_export.xlsx',
            result.downloadUrl,
            modalState.config.format
          )
          
          if (uploadResult.success) {
            updateProgressWithMessage(
              modalState,
              1,
              1,
              `✅ Uploaded to Google Drive: ${result.filename}`
            )
            
            // Show success toast and close modal
            setTimeout(() => {
              showNotification("Combined file exported to Google Drive successfully!", "success")
              hideModalFn()
            }, 1500)
          } else {
            updateProgressWithMessage(
              modalState,
              0,
              1,
              `❌ Upload failed: ${uploadResult.error}`
            )
          }
        } else {
          // Regular download
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
          
          // Show success toast and close modal for local download
          setTimeout(() => {
            showNotification("Combined file downloaded successfully!", "success")
            hideModalFn()
          }, 1500)
        }

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
          globalExportInProgress = false
          globalExportId = null
          updateModalContent(modalState, () => {}).catch(console.error) // Empty callback
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
        globalExportInProgress = false
        globalExportId = null
        updateModalContent(modalState, () => {}).catch(console.error) // Empty callback
      }, 3000)
    }

    modalState.isExporting = false
    globalExportInProgress = false
    globalExportId = null
    return
  }

  // Original separate/zip export logic with Google Drive support
  updateProgress(modalState, 0, modalState.config.selectedTables.size)

  let exportedCount = 0
  let failedCount = 0
  const exportResults: Array<{ filename: string; data: ArrayBuffer }> = []
  const errors: string[] = []
  const googleDriveLinks: string[] = []

  // Export all tables first
  console.log(`🔄 [${exportId}] Starting export loop for ${selectedTables.length} tables`)
  for (let i = 0; i < selectedTables.length; i++) {
    const table = selectedTables[i]
    const tableNumber = i + 1

    console.log(`🔄 LOOP ITERATION ${i + 1}/${selectedTables.length} - Starting table export`)
    
    try {
      console.log(
        `🔄 Exporting table ${tableNumber}/${selectedTables.length} (ID: ${table.data.id})`
      )

      const customName = modalState.config.customNames.get(table.data.id)
      console.log(
        `📝 Custom name for table ${tableNumber}: ${customName || "none"}`
      )

      const exportOptions: ExportOptions & { tableIndex?: number } = {
        format: modalState.config.format as "xlsx" | "csv" | "docx" | "pdf" | "google_sheets",
        filename: customName,
        includeHeaders: modalState.config.includeHeaders,
        destination: modalState.config.destination,
        analytics: modalState.config.analytics,
        tableIndex: i // Add table index for unique filenames
      }

      const destinationText = modalState.config.destination === 'google_drive' ? ' to Google Drive' : ''
      updateProgressWithMessage(
        modalState,
        exportedCount,
        selectedTables.length,
        `Exporting table ${tableNumber}/${selectedTables.length}${destinationText}...`
      )

      // For Google Drive destination (but NOT ZIP mode), use background script
      if (modalState.config.destination === 'google_drive' && modalState.config.exportMode !== 'zip') {
        console.log(`🔄 Exporting table ${tableNumber} to Google Drive via background...`)
        
        const message: ChromeMessage = {
          type: "EXPORT_TABLE" as ChromeMessageType,
          payload: {
            tableData: table.data,
            options: {
              format: modalState.config.format,
              includeHeaders: modalState.config.includeHeaders,
              destination: 'google_drive',
              filename: customName || `table_${tableNumber}`,
              analytics: modalState.config.analytics
            }
          }
        }
        
        try {
          const result = await chrome.runtime.sendMessage(message)
          console.log(`📤 Background export result for table ${tableNumber}:`, result)
          console.log(`🔧 FIXED GOOGLE SHEETS BATCH EXPORT - VERSION 2025-07-01-14:30`)
          
          if (result.success) {
            // Handle different result types based on format
            if (modalState.config.format === 'google_sheets') {
              if (result.googleSheetsUrl) {
                googleDriveLinks.push(result.googleSheetsUrl)
                console.log(`✅ Table ${tableNumber} exported to Google Sheets successfully`)
                console.log(`🔗 Google Sheets link: ${result.googleSheetsUrl}`)
                exportedCount++
              } else {
                console.error(`❌ Table ${tableNumber}: No Google Sheets URL returned`)
                console.error(`🔍 Result details:`, result)
                errors.push(`Table ${tableNumber}: No Google Sheets URL returned`)
                failedCount++
              }
            } else {
              if (result.googleDriveLink) {
                googleDriveLinks.push(result.googleDriveLink)
                console.log(`✅ Table ${tableNumber} exported to Google Drive successfully`)
                console.log(`🔗 Google Drive link: ${result.googleDriveLink}`)
                exportedCount++
              } else {
                console.error(`❌ Table ${tableNumber}: No Google Drive link returned`)
                console.error(`🔍 Result details:`, result)
                errors.push(`Table ${tableNumber}: No Google Drive link returned`)
                failedCount++
              }
            }
          } else {
            console.error(`❌ Table ${tableNumber} export failed:`, result.error)
            errors.push(`Table ${tableNumber}: ${result.error}`)
            failedCount++
          }
        } catch (error) {
          console.error(`💥 Table ${tableNumber} export error:`, error)
          errors.push(`Table ${tableNumber}: ${error instanceof Error ? error.message : 'Export failed'}`)
          failedCount++
        }

        updateProgress(modalState, exportedCount, selectedTables.length)

        // Small delay between exports
        await new Promise((resolve) => setTimeout(resolve, 200))
      } else {
        // For local download or ZIP archive, use exportTable method
        try {
          // Временно изменяем destination для корректного экспорта через exportTable
          const localExportOptions = {
            ...exportOptions,
            destination: 'download' as const // Принудительно устанавливаем локальный экспорт
          }
          
          const result = await exportService.exportTable(table.data, localExportOptions)

          if (result.success && result.downloadUrl) {
            console.log(
              `✅ Table ${tableNumber} exported successfully: ${result.filename}`
            )

            if (modalState.config.exportMode === "zip") {
              // For ZIP archive collect data - DO NOT download files individually
              const arrayBuffer = dataUrlToArrayBuffer(result.downloadUrl)
              exportResults.push({
                filename: result.filename || `table_${tableNumber}.xlsx`,
                data: arrayBuffer
              })
              console.log(
                `📦 Added to ZIP: ${result.filename || `table_${tableNumber}`} (${arrayBuffer.byteLength} bytes)`
              )
            } else if (modalState.config.exportMode === "separate") {
              // Regular separate download (only for separate mode, NOT ZIP mode)
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
      
      console.log(`✅ LOOP ITERATION ${i + 1}/${selectedTables.length} - Completed table export`)
    } catch (outerError) {
      console.error(`💥 CRITICAL ERROR in main try block for table ${tableNumber}:`, outerError)
      errors.push(`Table ${tableNumber}: ${outerError instanceof Error ? outerError.message : "Critical export error"}`)
      failedCount++
    }
  }
  
  console.log(`🔄 Export loop completed. Processed ${selectedTables.length} tables total.`)

  console.log(
    `📊 [${exportId}] Export summary: ${exportedCount} successful, ${failedCount} failed`
  )
  if (errors.length > 0) {
    console.log("❌ Errors:", errors)
  }

  // Create ZIP archive if enabled
  if (modalState.config.exportMode === "zip" && exportResults.length > 0) {
    try {
      console.log(
        `📦 [${exportId}] Creating ZIP archive with ${exportResults.length} files...`
      )
      console.log(`🔍 [${exportId}] ZIP Debug: destination=${modalState.config.destination}, exportMode=${modalState.config.exportMode}`)
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

      const zipFilename = generateZipFilename(modalState)

      if (modalState.config.destination === 'google_drive') {
        // Upload ZIP to Google Drive
        updateProgressWithMessage(
          modalState,
          exportedCount,
          selectedTables.length,
          `☁️ Uploading ZIP archive to Google Drive: ${zipFilename}...`
        )
        
        // Convert blob to data URL for upload
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(zipBlob)
        })
        
        const uploadResult = await uploadToGoogleDriveViaBackground(
          zipFilename,
          dataUrl,
          'zip' as ExportFormat  // ZIP is not in our ExportFormat type, but we handle it in getMimeType
        )
        
        if (uploadResult.success) {
          console.log(`✅ ZIP archive uploaded to Google Drive: ${zipFilename}`)
          
          // Show success toast for ZIP uploaded to Google Drive
          setTimeout(() => {
            showNotification("ZIP archive exported to Google Drive successfully!", "success")
            hideModalFn()
          }, 1500)
          
          // Save format preference if remember checkbox is checked
          if (modalState.rememberFormat) {
            FormatPreferences.save(modalState.config.format)
            console.log(`🧠 Saved format preference: ${modalState.config.format}`)
          }
          
          modalState.isExporting = false
          globalExportInProgress = false
          globalExportId = null
          return // IMPORTANT: Exit here to prevent further processing
        } else {
          console.error(`❌ Failed to upload ZIP to Google Drive:`, uploadResult.error)
          errors.push(`ZIP upload failed: ${uploadResult.error}`)
          modalState.isExporting = false
          globalExportInProgress = false
          globalExportId = null
          return // Exit on error too
        }
      } else {
        // Download ZIP file locally
        console.log(`🔍 Downloading ZIP locally: ${zipFilename}`)
        const zipUrl = URL.createObjectURL(zipBlob)

        const link = document.createElement("a")
        link.href = zipUrl
        link.download = zipFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up URL object
        URL.revokeObjectURL(zipUrl)

        console.log(`✅ ZIP archive downloaded: ${zipFilename}`)
        
        // Show success toast for local ZIP download
        setTimeout(() => {
          showNotification("ZIP archive downloaded successfully!", "success")
          hideModalFn()
        }, 1500)
        
        // Save format preference if remember checkbox is checked
        if (modalState.rememberFormat) {
          FormatPreferences.save(modalState.config.format)
          console.log(`🧠 Saved format preference: ${modalState.config.format}`)
        }
        
        modalState.isExporting = false
        globalExportInProgress = false
        globalExportId = null
        return // IMPORTANT: Exit here to prevent further processing
      }
    } catch (error) {
      console.error("💥 Error creating ZIP archive:", error)
      errors.push(
        `ZIP creation failed: ${error instanceof Error ? error.message : "Unknown ZIP error"}`
      )
      modalState.isExporting = false
      globalExportInProgress = false
      globalExportId = null
      return // Exit on ZIP creation error
    }
  }

  // Show completion message and handle closure for separate files mode
  if (modalState.config.exportMode === "separate") {
    // For separate files, show success message only if there were successful exports
    if (exportedCount > 0) {
      const isGoogleDrive = modalState.config.destination === 'google_drive'
      const message = isGoogleDrive 
        ? `${exportedCount} files exported to Google Drive successfully!`
        : `${exportedCount} files downloaded successfully!`
      
      updateProgressWithMessage(
        modalState,
        exportedCount,
        selectedTables.length,
        `✅ ${message}`
      )
      
      // Show success toast and close modal
      setTimeout(() => {
        showNotification(message, "success")
        hideModalFn()
      }, 1500)
    } else {
      // Show error message if no files were exported
      updateProgressWithMessage(
        modalState,
        0,
        selectedTables.length,
        `❌ Export failed - no files were exported`
      )
      
      setTimeout(() => {
        showNotification("Export failed - please try again", "error")
      }, 1000)
    }
  } else {
    // For ZIP mode, completion is handled above in ZIP creation section
    const finalMessage = `✅ ZIP archive created with ${exportResults.length} files`
    
    updateProgressWithMessage(
      modalState,
      exportedCount,
      selectedTables.length,
      finalMessage
    )
  }

  if (errors.length > 0) {
    console.warn(`⚠️ Export completed with ${errors.length} errors:`, errors)
  }

  // Save format preference if remember checkbox is checked
  if (modalState.rememberFormat && exportedCount > 0) {
    FormatPreferences.save(modalState.config.format)
    console.log(`🧠 Saved format preference: ${modalState.config.format}`)
  }
  
  modalState.isExporting = false
  globalExportInProgress = false
  globalExportId = null
  console.log(`🏁 [${exportId}] Export function completed and cleaned up`)
}
