import type { UserSettings, UserSubscription } from "../types"
import { safeStorageOperation, logExtensionError, createErrorNotification } from "./error-handlers"

// Storage keys for TableXport extension
const STORAGE_KEYS = {
  USER_SETTINGS: "tablexport_user_settings",
  USER_SUBSCRIPTION: "tablexport_user_subscription",
  USER_ID: "tablexport_user_id",
  LAST_EXPORT: "tablexport_last_export",
  // Legacy keys for backward compatibility
  LEGACY_USER_SETTINGS: "tabxport_user_settings",
  LEGACY_USER_SUBSCRIPTION: "tabxport_user_subscription",
  LEGACY_USER_ID: "tabxport_user_id",
  LEGACY_LAST_EXPORT: "tabxport_last_export"
} as const

// Настройки по умолчанию
const DEFAULT_SETTINGS: UserSettings = {
  defaultFormat: "xlsx",
  defaultDestination: "download", // По умолчанию локальное скачивание
  autoExport: false,
  theme: "auto"
}

// Получение настроек пользователя
export const getUserSettings = async (): Promise<UserSettings> => {
  const result = await safeStorageOperation(
    async () => {
      console.log("🔍 Storage: Getting user settings...")
      const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_SETTINGS)
      console.log("🔍 Storage: Raw storage result:", result)
      
      let settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.USER_SETTINGS] }
      console.log("🔍 Storage: Settings after merge with defaults:", settings)
      
      // Миграция старого формата "google-drive" на новый "google_drive"
      if (settings.defaultDestination === "google-drive" as any) {
        console.log("🔄 Storage: Migrating old 'google-drive' format to 'google_drive'")
        settings.defaultDestination = "google_drive"
        
        // Сохраняем исправленные настройки
        await chrome.storage.sync.set({
          [STORAGE_KEYS.USER_SETTINGS]: settings
        })
        console.log("✅ Storage: Migration completed, settings saved:", settings)
      }
      
      console.log("✅ Storage: Final settings returned:", settings)
      return settings
    },
    "getUserSettings",
    DEFAULT_SETTINGS
  )
  
  if (!result.success) {
    if (result.error?.type === 'CONTEXT_INVALIDATED') {
      createErrorNotification(result.error)
    }
    console.log("🔄 Storage: Returning default settings due to error")
    return result.data || DEFAULT_SETTINGS
  }
  
  return result.data!
}

// Сохранение настроек пользователя
export const saveUserSettings = async (
  settings: Partial<UserSettings>
): Promise<void> => {
  const result = await safeStorageOperation(
    async () => {
      const currentSettings = await getUserSettings()
      const updatedSettings = { ...currentSettings, ...settings }
      await chrome.storage.sync.set({
        [STORAGE_KEYS.USER_SETTINGS]: updatedSettings
      })
    },
    "saveUserSettings"
  )
  
  if (!result.success) {
    if (result.error?.type === 'CONTEXT_INVALIDATED') {
      createErrorNotification(result.error)
    }
    throw new Error(result.error?.message || "Failed to save user settings")
  }
}

// Получение подписки пользователя
export const getUserSubscription =
  async (): Promise<UserSubscription | null> => {
    const result = await safeStorageOperation(
      async () => {
        const result = await chrome.storage.local.get(
          STORAGE_KEYS.USER_SUBSCRIPTION
        )
        return result[STORAGE_KEYS.USER_SUBSCRIPTION] || null
      },
      "getUserSubscription",
      null
    )
    
    if (!result.success) {
      if (result.error?.type === 'CONTEXT_INVALIDATED') {
        createErrorNotification(result.error)
      }
      return null
    }
    
    return result.data
  }

// Сохранение подписки пользователя
export const saveUserSubscription = async (
  subscription: UserSubscription
): Promise<void> => {
  const result = await safeStorageOperation(
    async () => {
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_SUBSCRIPTION]: subscription
      })
    },
    "saveUserSubscription"
  )
  
  if (!result.success) {
    if (result.error?.type === 'CONTEXT_INVALIDATED') {
      createErrorNotification(result.error)
    }
    throw new Error(result.error?.message || "Failed to save user subscription")
  }
}

// Получение ID пользователя
export const getUserId = async (): Promise<string | null> => {
  const result = await safeStorageOperation(
    async () => {
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_ID)
      return result[STORAGE_KEYS.USER_ID] || null
    },
    "getUserId",
    null
  )
  
  if (!result.success) {
    if (result.error?.type === 'CONTEXT_INVALIDATED') {
      createErrorNotification(result.error)
    }
    return null
  }
  
  return result.data
}

// Сохранение ID пользователя
export const saveUserId = async (userId: string): Promise<void> => {
  const result = await safeStorageOperation(
    async () => {
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_ID]: userId
      })
    },
    "saveUserId"
  )
  
  if (!result.success) {
    if (result.error?.type === 'CONTEXT_INVALIDATED') {
      createErrorNotification(result.error)
    }
    throw new Error(result.error?.message || "Failed to save user ID")
  }
}

// Очистка всех данных пользователя
export const clearUserData = async (): Promise<void> => {
  const result = await safeStorageOperation(
    async () => {
      await chrome.storage.local.clear()
      await chrome.storage.sync.clear()
    },
    "clearUserData"
  )
  
  if (!result.success) {
    if (result.error?.type === 'CONTEXT_INVALIDATED') {
      createErrorNotification(result.error)
    }
    throw new Error(result.error?.message || "Failed to clear user data")
  }
}

// Сохранение времени последнего экспорта
export const saveLastExportTime = async (): Promise<void> => {
  const result = await safeStorageOperation(
    async () => {
      await chrome.storage.local.set({
        [STORAGE_KEYS.LAST_EXPORT]: Date.now()
      })
    },
    "saveLastExportTime"
  )
  
  if (!result.success) {
    // For last export time, we don't need to throw error or notify user
    // Just log the error
    console.warn("Failed to save last export time:", result.error?.message)
  }
}
