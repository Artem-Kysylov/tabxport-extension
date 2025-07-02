import type { BatchTableDetectionResult } from "../../../utils/table-detection/types"

/**
 * Export modes for batch processing
 */
export const EXPORT_MODES = {
  separate: {
    key: "separate",
    name: "Separate Files",
    icon: "📄",
    description: "Download each table as individual file"
  },
  zip: {
    key: "zip",
    name: "ZIP Archive",
    icon: "📦",
    description: "Download all files in ZIP archive"
  },
  combined: {
    key: "combined",
    name: "Combined File",
    icon: "📊",
    description: "All tables in one file (XLSX: multiple sheets)"
  }
} as const

export type ExportMode = keyof typeof EXPORT_MODES

/**
 * Supported export formats with icons and descriptions
 */
export const EXPORT_FORMATS = {
  xlsx: {
    name: "Excel",
    icon: "📊",
    description: "Excel spreadsheet with formatting",
    extension: ".xlsx",
    supportsCombined: true
  },
  csv: {
    name: "CSV",
    icon: "📄",
    description: "Comma-separated values",
    extension: ".csv",
    supportsCombined: true
  },
  docx: {
    name: "Word",
    icon: "📝",
    description: "Word document with formatted table",
    extension: ".docx",
    supportsCombined: true
  },
  pdf: {
    name: "PDF",
    icon: "📋",
    description: "PDF document",
    extension: ".pdf",
    supportsCombined: true
  },
  google_sheets: {
    name: "Google Sheets",
    icon: "📊",
    description: "Google Sheets spreadsheet (cloud native)",
    extension: "",
    supportsCombined: true
  }
} as const

export type ExportFormat = keyof typeof EXPORT_FORMATS

/**
 * Export destinations
 */
export type ExportDestination = "download" | "google_drive"

/**
 * Interface for batch export configuration
 */
export interface BatchExportConfig {
  selectedTables: Set<string>
  format: ExportFormat
  exportMode: ExportMode
  customNames: Map<string, string>
  combinedFileName?: string
  includeHeaders: boolean
  zipArchive: boolean // Legacy field for backward compatibility
  destination: ExportDestination
  analytics?: {
    enabled: boolean
    summaryTypes: Array<"sum" | "average" | "count">
  }
}

/**
 * Batch export modal state
 */
export interface BatchModalState {
  isVisible: boolean
  batchResult: BatchTableDetectionResult | null
  config: BatchExportConfig
  isExporting: boolean
  progress: { current: number; total: number }
  rememberFormat: boolean
}

/**
 * Interface for batch export button state
 */
export interface BatchButtonState {
  visible: boolean
  count: number
  button: HTMLElement | null
}
