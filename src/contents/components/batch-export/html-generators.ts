import { COMBINED_EXPORT_LIMITS } from "./constants"
import { FormatPreferences } from "./preferences"
import type { BatchModalState, ExportFormat, ExportMode } from "./types"
import { EXPORT_FORMATS, EXPORT_MODES } from "./types"
import { getUserSubscription } from "../../../lib/storage"

// Импорт SVG-иконок как raw строки
import {
  iconExcel,
  iconCsv,
  iconWord,
  iconPdf,
  iconGoogleSheets,
  iconDevice,
  iconGoogleDrive,
  iconSeparate,
  iconZip,
  iconCombined,
  iconPadlock,
  iconClose
} from "./svg-icons"

// Иконка chevron (inline SVG)
const iconChevron = `<svg width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_99_136)"><path d="M14.826 5.19474L7.99996 12.0208L1.17395 5.19474" stroke="#062013" stroke-width="2.55975" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_99_136"><rect width="16" height="16" fill="white" transform="matrix(1 0 0 -1 0 16.6077)"/></clipPath></defs></svg>`

// Маппинг форматов на SVG
const formatIcons: Record<string, string> = {
  xlsx: iconExcel,
  csv: iconCsv,
  docx: iconWord,
  pdf: iconPdf,
  google_sheets: iconGoogleSheets,
  download: iconDevice,
  google_drive: iconGoogleDrive,
  separate: iconSeparate,
  zip: iconZip,
  combined: iconCombined,
  padlock: iconPadlock
}
// Маппинг дестинейшнов
const destinationIcons: Record<string, string> = {
  download: iconDevice,
  google_drive: iconGoogleDrive
}
// Маппинг режимов экспорта
const modeIcons: Record<string, string> = {
  separate: iconSeparate,
  zip: iconZip,
  combined: iconCombined
}

/**
 * Creates format selector HTML
 */
export const createFormatSelector = (modalState: BatchModalState): string => {
  const options = Object.entries(EXPORT_FORMATS)
    .map(
      ([key, format]) => `
      <option value="${key}" ${modalState.config.format === key ? "selected" : ""}>
        ${formatIcons[key] || ""} ${format.name}
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
          ${hasPreference ? '<button type="button" id="clear-format-preference" class="clear-preference-btn" title="Очистить сохраненный формат">🗑️</button>' : ''}
        </div>
      </div>
    </div>
  `
}

/**
 * Кастомный селектор формата с иконками
 */
export const createCustomFormatSelector = (modalState: BatchModalState): string => {
  const currentKey = modalState.config.format
  const current = EXPORT_FORMATS[currentKey]
  const currentIcon = formatIcons[currentKey]

  // Список форматов
  const options = Object.entries(EXPORT_FORMATS)
    .map(([key, format]) => `
      <div class="custom-format-option${key === currentKey ? ' selected' : ''}" data-format="${key}">
        <span class="format-icon">${formatIcons[key]}</span>
        <span class="format-name">${format.name}</span>
      </div>
    `)
    .join("")

  return `
    <div class="custom-format-selector">
      <div class="custom-format-selected" tabindex="0">
        <span class="format-icon">${currentIcon}</span>
        <span class="format-name">${current.name}</span>
        <span class="chevron-icon">${iconChevron}</span>
      </div>
      <div class="custom-format-dropdown">${options}</div>
    </div>
  `
}

/**
 * Кастомный radio-group для выбора формата с иконками
 */
export const createFormatRadioGroup = async (
  modalState: BatchModalState,
  isGoogleDriveAuthenticated: boolean
): Promise<string> => {
  // Safety: если в настройках сохранён запрещённый формат — тихо переключаем на xlsx
  if (modalState.config.format === "google_sheets") {
    modalState.config.format = "xlsx"
  }
  const hasPreference = FormatPreferences.exists()
  // Короткие тайтлы
  const shortTitles: Record<string, string> = {
    xlsx: "Excel",
    csv: "CSV",
    docx: "Word",
    pdf: "PDF",
    google_sheets: "Google Sheets"
  }

  // ТЕКУЩИЙ ВЫБРАННЫЙ ФОРМАТ (фикс ошибки "Cannot find name 'currentKey'")
  const currentKey: ExportFormat = modalState.config.format

  // Разделяем форматы на основные (сетка 2x2) и Google Sheets (отдельно)
  const mainFormats: ExportFormat[] = ['xlsx', 'csv', 'docx', 'pdf']
  const googleSheetsFormat: ExportFormat = 'google_sheets'

  // Проверка премиум-статуса пользователя
  let isPremium = false
  try {
    const subscription = await getUserSubscription()
    isPremium = subscription?.planType === 'pro'
    console.log('👑 User premium status:', isPremium ? 'Premium' : 'Free')
  } catch (error) {
    console.error('❌ Error checking subscription:', error)
    isPremium = false
  }

  const createFormatOption = (key: ExportFormat, isGridItem: boolean = false) => {
    const format = EXPORT_FORMATS[key]
    const isGoogleSheets = key === 'google_sheets'

    // Google Sheets требует и аутентификации Google Drive, и премиум-подписки
    const isDisabled = isGoogleSheets && (!isGoogleDriveAuthenticated || !isPremium)

    // Определяем причину отключения
    let disabledReason = ''
    if (isGoogleSheets) {
      if (!isGoogleDriveAuthenticated && !isPremium) {
        disabledReason = 'Google Sheets requires Google Drive connection and Premium subscription'
      } else if (!isGoogleDriveAuthenticated) {
        disabledReason = 'Google Sheets requires Google Drive connection'
      } else if (!isPremium) {
        disabledReason = 'Google Sheets requires Premium subscription'
      }
    }
    
    const disabledClass = isDisabled ? ' disabled' : ''
    const gridClass = isGridItem ? ' grid-item' : ' full-width'
    const disabledAttr = isDisabled ? 'disabled' : ''
    
    return `
      <div class="format-radio-wrapper">
        <label class="format-radio-option${currentKey === key ? ' selected' : ''}${disabledClass}${gridClass}" style="${currentKey === key ? 'background: #D2F2E2;' : 'border: 1.5px solid #CDD2D0;'}">
          <input type="radio" name="export-format" value="${key}" ${currentKey === key ? 'checked' : ''} ${disabledAttr} class="format-radio-input">
          <span class="format-radio-content">
            <span class="format-icon">${formatIcons[key]}</span>
            <span class="format-name">${shortTitles[key]}</span>
          </span>
        </label>
        ${isDisabled ? `<div class="format-disabled-notice">${disabledReason}</div>` : ''}
      </div>
    `
  }

  return `
    <div class="format-radio-group">
      <label class="format-label">Export format:</label>
      <div class="format-radio-options">
        <!-- Основные форматы в сетке 2x2 -->
        <div class="format-radio-grid">
          ${mainFormats.map(key => createFormatOption(key, true)).join('')}
        </div>
        <!-- Google Sheets отдельно на всю ширину -->
        ${/* createFormatOption(google_sheets, false) — скрыто */''}
      </div>
      <div class="format-preferences" style="margin-top: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <label class="remember-format-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <div id="remember-format-toggle" style="position: relative; width: 44px; height: 24px; background-color: ${modalState.rememberFormat ? '#1B9358' : 'transparent'}; border: ${modalState.rememberFormat ? '1px solid #1B9358' : '1px solid #d1d5db'}; border-radius: 12px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin: 0; box-sizing: border-box;">
              <div style="position: absolute; top: 1px; left: ${modalState.rememberFormat ? '21px' : '1px'}; width: 20px; height: 20px; background-color: ${modalState.rememberFormat ? 'white' : '#1B9358'}; border-radius: 50%; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"></div>
            </div>
          <span>Remember my format</span>
        </label>
          ${modalState.rememberFormat ? '<span class="memory-tag" style="font-size: 12px; background-color: #d1fae5; color: #047857; padding: 4px 8px; border-radius: 9999px;">Memory ON</span>' : ''}
        </div>
        ${hasPreference ? '<button type="button" id="clear-format-preference" class="clear-preference-btn" title="Clear saved format">🗑️</button>' : ''}
      </div>
    </div>
  `
}

/**
 * Creates analytics options HTML
 */
export const createAnalyticsOptions = (modalState: BatchModalState): string => {
  const analyticsEnabled = modalState.config.analytics?.enabled || false
  const summaryTypes = modalState.config.analytics?.summaryTypes || []
  
  return `
    <div class="analytics-options">
      <div class="analytics-header">
        <label class="analytics-toggle-label">
          <input type="checkbox" id="analytics-enabled-checkbox" 
                 class="analytics-toggle-checkbox" 
                 ${analyticsEnabled ? "checked" : ""}>
          <span class="analytics-toggle-text">
            <span class="analytics-title">Analytics & Summaries</span>
          </span>
        </label>
        <div class="analytics-description">
          Add automatic calculations (sums, averages, counts) to exported tables
        </div>
      </div>
      
      <div class="analytics-controls ${analyticsEnabled ? "enabled" : "disabled"}">
        <div class="analytics-types">
          <label class="analytics-type-label ${analyticsEnabled ? "" : "disabled"}">
            <input type="checkbox" class="analytics-type-checkbox" 
                   value="sum" 
                   ${summaryTypes.includes("sum") && analyticsEnabled ? "checked" : ""}
                   ${analyticsEnabled ? "" : "disabled"}>
            <span class="analytics-type-content">
              <span class="analytics-type-name">Calculate Sums</span>
            </span>
          </label>
          
          <label class="analytics-type-label ${analyticsEnabled ? "" : "disabled"}">
            <input type="checkbox" class="analytics-type-checkbox" 
                   value="average" 
                   ${summaryTypes.includes("average") && analyticsEnabled ? "checked" : ""}
                   ${analyticsEnabled ? "" : "disabled"}>
            <span class="analytics-type-content">
              <span class="analytics-type-name">Calculate Averages</span>
            </span>
          </label>
          
          <label class="analytics-type-label ${analyticsEnabled ? "" : "disabled"}">
            <input type="checkbox" class="analytics-type-checkbox" 
                   value="count" 
                   ${summaryTypes.includes("count") && analyticsEnabled ? "checked" : ""}
                   ${analyticsEnabled ? "" : "disabled"}>
            <span class="analytics-type-content">
              <span class="analytics-type-name">Count Unique Values</span>
            </span>
          </label>
        </div>
        
        <div class="analytics-info ${analyticsEnabled ? "visible" : "hidden"}">
          <div class="analytics-info-item">
            <span class="analytics-info-text">
              Summary rows will be added below each table with calculated values
            </span>
          </div>
          <div class="analytics-info-item">
            <span class="analytics-info-text">
              Works with numeric data, currencies, and percentages
            </span>
          </div>
        </div>
      </div>
    </div>
  `
}

/**
 * Creates export mode selector HTML
 */
export const createExportModeSelector = (modalState: BatchModalState): string => {
  const currentMode = modalState.config.exportMode || "separate"
  const isGoogleSheets = modalState.config.format === 'google_sheets'
  
  // For Google Sheets, force combined mode as default
  const effectiveMode = isGoogleSheets ? 'combined' : currentMode
  
  return `
    <div class="mode-radio-group">
      <h3 class="section-heading">Export mode:</h3>
      <div class="mode-radio-options">
        ${Object.entries(EXPORT_MODES)
          .map(
            ([key, mode]) => {
              // For Google Sheets, only allow combined mode
              const isDisabled = isGoogleSheets && key !== 'combined'
              const disabledClass = isDisabled ? ' disabled' : ''
              const disabledAttr = isDisabled ? 'disabled' : ''
              
              return `
                <label class="mode-radio-option${effectiveMode === key ? ' selected' : ''}${disabledClass}">
                  <input type="radio" name="export-mode" value="${key}" ${effectiveMode === key ? 'checked' : ''} ${disabledAttr} class="mode-radio-input">
                  <div class="mode-radio-content">
                    <div class="mode-icon">${modeIcons[key]}</div>
                    <div class="mode-text">
                      <div class="mode-name">${mode.name}</div>
                      <div class="mode-desc">${mode.description}</div>
                    </div>
                  </div>
                </label>
              `
            }
          )
          .join("")}
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
          ${isOverLimit ? '<span class="warning-text">⚠️ Too many tables! Maximum ' + COMBINED_EXPORT_LIMITS.maxTables + ' allowed.</span>' : ''}
        </div>
        ${modalState.config.format === "xlsx" ? '<div class="format-info">📋 Each table will be on a separate sheet</div>' : '<div class="format-info">📄 All tables will be combined sequentially</div>'}
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
        ${(modalState.isExporting && current === total && modalState.config.zipArchive) ? '📦 Creating ZIP archive...' : 'Exporting tables... (' + current + '/' + total + ')'}
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      ${modalState.isExporting && current === total && modalState.config.zipArchive ? '<div class="zip-spinner">🔄</div>' : ''}
    </div>
  `
}

/**
 * Creates destination selector HTML
 */
export const createDestinationSelector = async (
  modalState: BatchModalState,
  isGoogleDriveAuthenticated: boolean
): Promise<string> => {
  const currentDestination = modalState.config.destination || "download"
  const isGoogleSheets = modalState.config.format === 'google_sheets'

  // Safety: если сохранено google_drive — тихо переключаем на download
  if (modalState.config.destination === "google_drive") {
    modalState.config.destination = "download"
  }
  
  // Проверка премиум-статуса пользователя
  let isPremium = false
  try {
    const subscription = await getUserSubscription()
    isPremium = subscription?.planType === 'pro'
    console.log('👑 User premium status for destination selector:', isPremium ? 'Premium' : 'Free')
  } catch (error) {
    console.error('❌ Error checking subscription for destination selector:', error)
    isPremium = false
  }
  
  // Google Drive требует премиум-подписки
  const isGoogleDriveDisabled = !isGoogleDriveAuthenticated || !isPremium
  
  // Device download должен быть отключен для Google Sheets
  const isDeviceDownloadDisabled = isGoogleSheets
  
  // Определяем причину отключения Google Drive
  let googleDriveDisabledReason = ''
  if (!isGoogleDriveAuthenticated && !isPremium) {
    googleDriveDisabledReason = 'Google Drive requires connection and Premium subscription'
  } else if (!isGoogleDriveAuthenticated) {
    googleDriveDisabledReason = 'Google Drive requires connection'
  } else if (!isPremium) {
    googleDriveDisabledReason = 'Google Drive requires Premium subscription'
  }
  
  return `
    <div class="destination-radio-group">
      <h3 class="section-heading">Export destination:</h3>
      <div class="destination-radio-options">
        <label class="destination-radio-option${currentDestination === 'download' ? ' selected' : ''}${isDeviceDownloadDisabled ? ' disabled' : ''}">
          <input type="radio" name="export-destination" value="download" ${currentDestination === 'download' ? 'checked' : ''} ${isDeviceDownloadDisabled ? 'disabled' : ''} class="destination-radio-input">
          <div class="destination-radio-content">
            <div class="destination-icon">${destinationIcons.download}</div>
            <div class="destination-text">
              <div class="destination-name">Download to Device</div>
              <div class="destination-desc">Save files directly to your computer</div>
              ${isDeviceDownloadDisabled ? '<div class="destination-login-required"><span class="login-required-icon">' + formatIcons.padlock + '</span><span class="login-required-text">Google Sheets requires Google Drive destination</span></div>' : ''}
            </div>
          </div>
        </label>
        <!-- СКРЫТО: Google Drive -->
        <!--
        <label class="tx-radio">
          <input id="destination-google_drive" type="radio" name="destination" value="google_drive" />
          <span class="tx-radio-label">Google Drive</span>
        </label>
        -->
      </div>
    </div>
  `
}

/**
 * Creates the modal content
 */
export const createModalContent = async (modalState: BatchModalState, isGoogleDriveAuthenticated: boolean = false): Promise<string> => {
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

  // Асинхронно получаем HTML для выбора формата
  const formatRadioGroupHtml = await createFormatRadioGroup(modalState, isGoogleDriveAuthenticated)

  // Асинхронно получаем HTML для выбора места назначения
  const destinationSelectorHtml = await createDestinationSelector(modalState, isGoogleDriveAuthenticated)

  return `
    <div id="tablexport-batch-modal">
      <div class="modal-header">
        <h2 class="modal-title">Export All Tables</h2>
        <button class="close-button" id="close-batch-modal" title="Close">${iconClose}</button>
      </div>
      <div class="modal-body">
        ${formatRadioGroupHtml}
        ${createExportModeSelector(modalState)}
        ${createCombinedFilenameInput(modalState)}
        ${createTableList(modalState)}
        ${destinationSelectorHtml}
        ${createAnalyticsOptions(modalState)}
        ${createProgressIndicator(modalState)}
      </div>
      <div class="modal-footer">
        <button class="cancel-button" id="cancel-batch-export">Cancel</button>
        <button class="export-button" id="confirm-batch-export">${buttonText}</button>
      </div>
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
