// Основной клиент и типы
export { supabase } from "../supabase"
export type { Database, ExportLimitCheck } from "./types"
export * from "./types"

// Сервисы
export { authService } from "./auth-service"
export type { AuthUser, AuthState } from "./auth-service"

export { userService } from "./user-service"
export type { UserData } from "./user-service"

export { exportService } from "./export-service"
export type { ExportOptions, ExportResult } from "./export-service"

// Google Drive интеграция
export { googleDriveService } from "../google-drive-api"
export type { DriveUploadOptions, DriveUploadResult } from "../google-drive-api"

// Утилитарные функции
export const formatPlanName = (plan: "free" | "pro"): string => {
  switch (plan) {
    case "free":
      return "Бесплатный"
    case "pro":
      return "Pro"
    default:
      return plan
  }
}

export const formatExportDestination = (
  destination: "download" | "google_drive"
): string => {
  switch (destination) {
    case "download":
      return "Скачивание"
    case "google_drive":
      return "Google Drive"
    default:
      return destination
  }
}

export const formatFileSize = (sizeInMb: number): string => {
  if (sizeInMb < 0.001) {
    return "<1 KB"
  } else if (sizeInMb < 1) {
    return `${Math.round(sizeInMb * 1024)} KB`
  } else {
    return `${sizeInMb.toFixed(1)} MB`
  }
}

export const formatExportFormat = (format: string): string => {
  return format.toUpperCase()
}

// Константы планов
export const PLAN_FEATURES = {
  free: {
    name: "Бесплатный",
    price: 0,
    exports_limit: 10,
    google_drive_access: false,
    features: [
      "До 10 экспортов в месяц",
      "Форматы: XLSX, CSV, DOCX, PDF",
      "Скачивание файлов"
    ],
    limitations: [
      "Нет доступа к Google Drive",
      "Нет batch экспорта",
      "Нет сохраненных шаблонов"
    ]
  },
  pro: {
    name: "Pro",
    price: 5,
    exports_limit: -1, // unlimited
    google_drive_access: true,
    features: [
      "Неограниченные экспорты",
      "Все форматы (XLSX, CSV, DOCX, PDF)",
      "Экспорт в Google Drive",
      "Batch экспорт таблиц",
      "Сохраненные шаблоны",
      "Приоритетная поддержка"
    ],
    limitations: []
  }
} as const
