import type { UserSettings, UserSubscription } from "../types"

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
  defaultDestination: "google_drive", // Изменено для тестирования Google Drive
  autoExport: false,
  theme: "auto"
}

// Получение настроек пользователя
export const getUserSettings = async (): Promise<UserSettings> => {
  try {
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
  } catch (error) {
    console.error("❌ Storage: Error getting user settings:", error)
    console.log("🔄 Storage: Returning default settings:", DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
}

// Сохранение настроек пользователя
export const saveUserSettings = async (
  settings: Partial<UserSettings>
): Promise<void> => {
  try {
    const currentSettings = await getUserSettings()
    const updatedSettings = { ...currentSettings, ...settings }
    await chrome.storage.sync.set({
      [STORAGE_KEYS.USER_SETTINGS]: updatedSettings
    })
  } catch (error) {
    console.error("Error saving user settings:", error)
    throw error
  }
}

// Получение подписки пользователя
export const getUserSubscription =
  async (): Promise<UserSubscription | null> => {
    try {
      const result = await chrome.storage.local.get(
        STORAGE_KEYS.USER_SUBSCRIPTION
      )
      return result[STORAGE_KEYS.USER_SUBSCRIPTION] || null
    } catch (error) {
      console.error("Error getting user subscription:", error)
      return null
    }
  }

// Сохранение подписки пользователя
export const saveUserSubscription = async (
  subscription: UserSubscription
): Promise<void> => {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.USER_SUBSCRIPTION]: subscription
    })
  } catch (error) {
    console.error("Error saving user subscription:", error)
    throw error
  }
}

// Получение ID пользователя
export const getUserId = async (): Promise<string | null> => {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_ID)
    return result[STORAGE_KEYS.USER_ID] || null
  } catch (error) {
    console.error("Error getting user ID:", error)
    return null
  }
}

// Сохранение ID пользователя
export const saveUserId = async (userId: string): Promise<void> => {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.USER_ID]: userId
    })
  } catch (error) {
    console.error("Error saving user ID:", error)
    throw error
  }
}

// Очистка всех данных пользователя
export const clearUserData = async (): Promise<void> => {
  try {
    await chrome.storage.local.clear()
    await chrome.storage.sync.clear()
  } catch (error) {
    console.error("Error clearing user data:", error)
    throw error
  }
}

// Сохранение времени последнего экспорта
export const saveLastExportTime = async (): Promise<void> => {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_EXPORT]: Date.now()
    })
  } catch (error) {
    console.error("Error saving last export time:", error)
  }
}
