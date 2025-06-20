// Скрипт для исправления настроек пользователя
// Выполняется в консоли popup расширения

/**
 * Установить Google Drive как destination по умолчанию
 */
async function fixUserSettings() {
  console.log("🔧 Fixing user settings...")
  
  try {
    // Получаем текущие настройки
    const currentSettings = await chrome.storage.sync.get("tablexport_user_settings")
    console.log("📋 Current settings:", currentSettings)
    
    // Обновляем defaultDestination
    const updatedSettings = {
      ...currentSettings.tablexport_user_settings,
      defaultDestination: "google_drive"
    }
    
    // Сохраняем обновленные настройки
    await chrome.storage.sync.set({
      tablexport_user_settings: updatedSettings
    })
    
    console.log("✅ Settings updated:", updatedSettings)
    
    // Проверяем что настройки сохранились
    const verifySettings = await chrome.storage.sync.get("tablexport_user_settings")
    console.log("🔍 Verified settings:", verifySettings)
    
    return verifySettings
    
  } catch (error) {
    console.error("❌ Failed to fix settings:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Проверить текущие настройки
 */
async function checkSettings() {
  try {
    const settings = await chrome.storage.sync.get("tablexport_user_settings")
    console.log("📋 Current user settings:", settings)
    return settings
  } catch (error) {
    console.error("❌ Failed to check settings:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Сбросить настройки к значениям по умолчанию с Google Drive
 */
async function resetSettingsWithGoogleDrive() {
  console.log("🔄 Resetting settings with Google Drive as default...")
  
  try {
    const defaultSettings = {
      defaultFormat: "xlsx",
      defaultDestination: "google_drive",
      autoExport: false,
      theme: "auto"
    }
    
    await chrome.storage.sync.set({
      tablexport_user_settings: defaultSettings
    })
    
    console.log("✅ Settings reset with Google Drive:", defaultSettings)
    return defaultSettings
    
  } catch (error) {
    console.error("❌ Failed to reset settings:", error)
    return { success: false, error: error.message }
  }
}

// Экспортируем функции для использования в консоли
window.fixUserSettings = fixUserSettings
window.checkSettings = checkSettings
window.resetSettingsWithGoogleDrive = resetSettingsWithGoogleDrive

console.log("🔧 User Settings Fix Suite loaded!")
console.log("Available functions:")
console.log("  - checkSettings() - Check current settings")
console.log("  - fixUserSettings() - Fix defaultDestination to google_drive")
console.log("  - resetSettingsWithGoogleDrive() - Reset all settings with Google Drive") 