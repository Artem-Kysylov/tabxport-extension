import type { UserSettings, UserSubscription, AnalyticsSettings } from "../types"
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
  theme: "auto",
  // Analytics settings (feature flag pattern - disabled by default)
  analytics: {
    enabled: false,
    calculateSums: true,
    calculateAverages: true,
    countUnique: true
  }
}

// Получение настроек пользователя
// function getUserSettings()
export const getUserSettings = async (): Promise<UserSettings> => {
  const result = await safeStorageOperation(
    async () => {
      // удалены подробные console.log по чтению/слиянию настроек
      const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_SETTINGS)
      
      let settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.USER_SETTINGS] }
      
      // Миграция старого формата "google-drive" на новый "google_drive"
      if (settings.defaultDestination === "google-drive" as any) {
        // удалены console.log о миграции
        settings.defaultDestination = "google_drive"
        await chrome.storage.sync.set({
          [STORAGE_KEYS.USER_SETTINGS]: settings
        })
      }
      
      // Миграция: добавление настроек аналитики для существующих пользователей
      if (!settings.analytics) {
        // удалены console.log о миграции аналитики
        settings.analytics = DEFAULT_SETTINGS.analytics
        await chrome.storage.sync.set({
          [STORAGE_KEYS.USER_SETTINGS]: settings
        })
      }
      
      // удален итоговый console.log
      return settings
    },
    "getUserSettings",
    DEFAULT_SETTINGS
  )
  
  if (!result.success) {
    if (result.error?.type === 'CONTEXT_INVALIDATED') {
      createErrorNotification(result.error)
    }
    // удален лишний console.log о возврате значений по умолчанию
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

// Analytics-specific helper functions

// Получение настроек аналитики
export const getAnalyticsSettings = async () => {
  const settings = await getUserSettings()
  return settings.analytics || DEFAULT_SETTINGS.analytics!
}

// Сохранение настроек аналитики
// function saveAnalyticsSettings(analyticsSettings)
export const saveAnalyticsSettings = async (analyticsSettings: Partial<AnalyticsSettings>) => {
  const currentSettings = await getUserSettings()
  const updatedAnalytics = { 
    ...currentSettings.analytics || DEFAULT_SETTINGS.analytics!, 
    ...analyticsSettings 
  }
  
  await saveUserSettings({
    analytics: updatedAnalytics
  })
  
  // удален лишний console.log о сохранении настроек аналитики
}

// Проверка включена ли аналитика
export const isAnalyticsEnabled = async (): Promise<boolean> => {
  const analyticsSettings = await getAnalyticsSettings()
  return analyticsSettings.enabled
}
