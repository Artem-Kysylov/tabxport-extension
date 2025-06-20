// Основные типы для TabXport расширения

export interface TableData {
  id: string
  headers: string[]
  rows: string[][]
  source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other"
  timestamp: number
  url: string
  chatTitle?: string // Название чата для генерации имени файла
}

export interface ExportOptions {
  format: "xlsx" | "csv" | "docx" | "pdf"
  filename?: string
  includeHeaders: boolean
  destination: "download" | "google_drive"
}

export interface UserSettings {
  defaultFormat: "xlsx" | "csv" | "docx" | "pdf"
  defaultDestination: "download" | "google_drive"
  autoExport: boolean
  theme: "light" | "dark" | "auto"
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

// Типы сообщений Chrome Extension
export enum ChromeMessageType {
  EXPORT_TABLE = "EXPORT_TABLE",
  GET_SETTINGS = "GET_SETTINGS",
  UPDATE_SETTINGS = "UPDATE_SETTINGS",
  CHECK_SUBSCRIPTION = "CHECK_SUBSCRIPTION",
  REFRESH_TABLES = "REFRESH_TABLES",
  CHECK_AUTH_STATUS = "CHECK_AUTH_STATUS",
  GOOGLE_SIGN_IN = "GOOGLE_SIGN_IN",
  SIGN_OUT = "SIGN_OUT"
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
      type: ChromeMessageType.GET_SETTINGS | ChromeMessageType.REFRESH_TABLES | ChromeMessageType.CHECK_AUTH_STATUS | ChromeMessageType.GOOGLE_SIGN_IN | ChromeMessageType.SIGN_OUT
      payload?: undefined
    }

export interface TableDetectionResult {
  element: HTMLElement
  data: TableData
  position: { x: number; y: number }
}
