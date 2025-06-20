/**
 * Batch export specific types
 */

export type ExportFormat = "xlsx" | "csv" | "docx" | "pdf"

export interface BatchExportResult {
  success: boolean
  exportedCount: number
  failedCount: number
  errors: string[]
  downloadUrls: string[]
}

export interface BatchExportProgress {
  current: number
  total: number
  currentFileName?: string
  percentage: number
}

export interface FormatOption {
  key: ExportFormat
  name: string
  icon: string
  description: string
  extension: string
}

export interface BatchExportSettings {
  defaultFormat: ExportFormat
  includeHeaders: boolean
  enableZipArchive: boolean
  maxConcurrentExports: number
  exportDelay: number // ms between exports
}
