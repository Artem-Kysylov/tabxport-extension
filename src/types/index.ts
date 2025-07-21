// Основные типы для TabXport расширения

export interface TableData {
  id: string
  headers: string[]
  rows: string[][]
  source: "chatgpt" | "claude" | "gemini" | "deepseek" | "batch-export" | "other"
  timestamp: number
  url: string
  chatTitle?: string // Название чата для генерации имени файла
  // Analytics metadata (optional)
  analytics?: {
    summaryRows?: string[][]
    columnTypes?: Record<string, ColumnDataType>
    errors?: AnalysisError[]
  }
}

export interface ExportOptions {
  format: "xlsx" | "csv" | "docx" | "pdf" | "google_sheets"
  filename?: string
  includeHeaders: boolean
  destination: "download" | "google_drive"
  // Analytics options (optional)
  analytics?: {
    enabled: boolean
    summaryTypes: SummaryType[]
  }
  // Table merger options (optional)
  mergeSimilarColumns?: boolean
}

// Analytics-specific types
export type ColumnDataType = 
  | 'number' 
  | 'currency' 
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'text'
  | 'boolean'
  | 'mixed'

export type SummaryType = 'sum' | 'average' | 'count' | 'unique' | 'min' | 'max'

export interface AnalysisError {
  type: 'mixed_data' | 'invalid_format' | 'empty_column' | 'calculation_error'
  columnName: string
  message: string
  affectedRows?: number[]
  severity: 'low' | 'medium' | 'high'
}

export interface ColumnMetadata {
  name: string
  dataType: ColumnDataType
  hasErrors: boolean
  errorCount?: number
  sampleValues?: string[]
}

export interface SummaryRow {
  type: SummaryType
  label: string
  values: string[]
}

export interface AnalyticsSettings {
  enabled: boolean
  calculateSums: boolean
  calculateAverages: boolean
  countUnique: boolean
}

export interface UserSettings {
  defaultFormat: "xlsx" | "csv" | "docx" | "pdf" | "google_sheets"
  defaultDestination: "download" | "google_drive"
  autoExport: boolean
  theme: "light" | "dark" | "auto"
  // Analytics settings (optional, feature flag pattern)
  analytics?: AnalyticsSettings
}

export interface UserSubscription {
  id: string
  email: string
  planType: "free" | "pro"
  exportsUsed: number
  exportsLimit: number
  validUntil?: string
}

export interface ExportResult {
  success: boolean
  filename?: string
  error?: string
  downloadUrl?: string
  googleSheetsId?: string
  googleSheetsUrl?: string
  // Google Drive specific properties
  googleDriveLink?: string
  exportId?: string
  // Analytics results (optional)
  analyticsApplied?: boolean
  analyticsErrors?: AnalysisError[]
}

// Типы для различных сообщений
export interface ExportTablePayload {
  tableData: TableData
  options: ExportOptions
}

export interface UpdateSettingsPayload {
  settings: UserSettings
}

export interface CheckSubscriptionPayload {
  userId: string
}

// OAuth related payloads
export interface OAuthSuccessPayload {
  sessionData: any
}

export interface OAuthErrorPayload {
  error: string
  errorDescription: string
}

export interface OAuthCodePayload {
  code: string
}

// Типы сообщений Chrome Extension
export enum ChromeMessageType {
  EXPORT_TABLE = "EXPORT_TABLE",
  GET_SETTINGS = "GET_SETTINGS",
  UPDATE_SETTINGS = "UPDATE_SETTINGS",
  CHECK_SUBSCRIPTION = "CHECK_SUBSCRIPTION",
  REFRESH_TABLES = "REFRESH_TABLES",
  CHECK_AUTH_STATUS = "CHECK_AUTH_STATUS",
  GOOGLE_SIGN_IN = "GOOGLE_SIGN_IN",
  SIGN_OUT = "SIGN_OUT",
  OAUTH_SUCCESS = "OAUTH_SUCCESS",
  OAUTH_ERROR = "OAUTH_ERROR",
  OAUTH_CODE = "OAUTH_CODE",
  CHROMIUMAPP_OAUTH_DATA = "CHROMIUMAPP_OAUTH_DATA",
  CREATE_TABLEXPORT_FOLDER = "CREATE_TABLEXPORT_FOLDER",
  GET_GOOGLE_TOKEN = "GET_GOOGLE_TOKEN",
  GET_EXPORT_HISTORY = "GET_EXPORT_HISTORY",
  GET_USAGE_QUOTAS = "GET_USAGE_QUOTAS",
  GET_USAGE_STATS = "GET_USAGE_STATS"
}

// Сообщения между content script и background с дискриминированными типами
export type ChromeMessage =
  | {
      type: ChromeMessageType.EXPORT_TABLE
      payload: ExportTablePayload
    }
  | {
      type: ChromeMessageType.UPDATE_SETTINGS
      payload: UpdateSettingsPayload
    }
  | {
      type: ChromeMessageType.CHECK_SUBSCRIPTION
      payload: CheckSubscriptionPayload
    }
  | {
      type: ChromeMessageType.OAUTH_SUCCESS
      sessionData: any
    }
  | {
      type: ChromeMessageType.OAUTH_ERROR
      error: string
      errorDescription: string
    }
  | {
      type: ChromeMessageType.OAUTH_CODE
      code: string
    }
  | {
      type: ChromeMessageType.CHROMIUMAPP_OAUTH_DATA
      [key: string]: any
    }
  | {
      type: ChromeMessageType.GET_SETTINGS | 
           ChromeMessageType.REFRESH_TABLES | 
           ChromeMessageType.CHECK_AUTH_STATUS | 
           ChromeMessageType.GOOGLE_SIGN_IN | 
           ChromeMessageType.SIGN_OUT |
           ChromeMessageType.CREATE_TABLEXPORT_FOLDER |
           ChromeMessageType.GET_GOOGLE_TOKEN |
           ChromeMessageType.GET_EXPORT_HISTORY |
           ChromeMessageType.GET_USAGE_QUOTAS |
           ChromeMessageType.GET_USAGE_STATS
      payload?: undefined
    }

export interface TableDetectionResult {
  element: HTMLElement
  data: TableData
  position: { x: number; y: number }
}
