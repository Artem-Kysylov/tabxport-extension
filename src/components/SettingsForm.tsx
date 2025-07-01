import React, { useEffect, useState } from "react"

import { getUserSettings, saveUserSettings } from "../lib/storage"
import type { UserSettings } from "../types"

interface SettingsFormProps {
  onSettingsChange?: (settings: UserSettings) => void
}

const SettingsForm: React.FC<SettingsFormProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<UserSettings>({
    defaultFormat: "xlsx",
    defaultDestination: "download",
    autoExport: false,
    theme: "auto"
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [rememberFormat, setRememberFormat] = useState(false)
  const [isGoogleDriveAuthenticated, setIsGoogleDriveAuthenticated] = useState(false)

  // Refresh authentication state function
  const refreshAuthState = async () => {
    try {
      const authResult = await chrome.runtime.sendMessage({
        type: "CHECK_AUTH_STATUS"
      })
      
      const isAuthenticated = authResult?.success && 
                             authResult?.authState?.isAuthenticated &&
                             authResult?.authState?.hasGoogleAccess
      
      console.log("🔄 [SettingsForm] Auth state refreshed:", {
        authResult,
        isAuthenticated
      })
      
      setIsGoogleDriveAuthenticated(isAuthenticated)
      return isAuthenticated
    } catch (error) {
      console.warn("Failed to refresh auth state:", error)
      setIsGoogleDriveAuthenticated(false)
      return false
    }
  }

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await getUserSettings()
        
        // Check Google Drive authentication
        const isAuthenticated = await refreshAuthState()
        
        // If user prefers Google Drive but not authenticated, switch to download
        if (userSettings.defaultDestination === "google_drive" && !isAuthenticated) {
          userSettings.defaultDestination = "download"
          console.log("📋 Google Drive not authenticated, defaulting to download in settings")
        }
        
        setSettings(userSettings)

        // Check if format memory is enabled
        const savedFormat = localStorage.getItem(
          "tablexport-remember-format-enabled"
        )
        setRememberFormat(savedFormat === "true")
      } catch (error) {
        console.error("Failed to load settings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()

    // Listen for auth state changes
    const handleMessage = (message: any) => {
      if (message.type === "AUTH_STATE_CHANGED" || message.type === "GOOGLE_AUTH_SUCCESS") {
        console.log("🔄 [SettingsForm] Auth state changed, refreshing...")
        refreshAuthState()
      }
    }

    // Add message listener
    chrome.runtime.onMessage.addListener(handleMessage)

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }, [])

  // Handle setting changes
  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    setIsSaving(true)

    try {
      const newSettings = { ...settings, [key]: value }
      setSettings(newSettings)
      await saveUserSettings(newSettings)

      // Notify parent component immediately
      onSettingsChange?.(newSettings)

      // 🚀 НЕМЕДЛЕННОЕ обновление content script (не ждем сохранения)
      if (key === "defaultDestination") {
        console.log(`🔄 IMMEDIATE: Notifying content script about ${key} change: ${value}`)
        
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
          })
          
          if (tab.id) {
            // Отправляем сообщение сразу при клике
            await chrome.tabs.sendMessage(tab.id, {
              type: "SETTINGS_CHANGED",
              key,
              value,
              settings: newSettings
            })
            console.log(`🚀 IMMEDIATE notification sent to content script: ${key} = ${value}`)
          }
        } catch (error) {
          console.log("Content script not available (expected on non-supported sites)")
        }
      }

      // Notify content script about settings changes (for other keys)
      if (key !== "defaultDestination") {
        try {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
          })
          
          if (tab.id) {
            await chrome.tabs.sendMessage(tab.id, {
              type: "SETTINGS_CHANGED",
              key,
              value,
              settings: newSettings
            })
            console.log(`📤 Notified content script about ${key} change:`, value)
          }
        } catch (error) {
          console.log("Content script not available (expected on non-supported sites)")
        }
      }

      // If Google Sheets format is selected, automatically set destination to google_drive
      if (key === "defaultFormat" && value === "google_sheets" && settings.defaultDestination !== "google_drive") {
        console.log("📊 Google Sheets selected, auto-switching to Google Drive destination")
        const updatedSettings = { ...newSettings, defaultDestination: "google_drive" as const }
        setSettings(updatedSettings)
        await saveUserSettings(updatedSettings)
        onSettingsChange?.(updatedSettings)
      }

      // If format changed and remember is enabled, save it
      if (key === "defaultFormat" && rememberFormat) {
        localStorage.setItem("tablexport-preferred-format", value)
        console.log(`🧠 Auto-saved format preference: ${value}`)
      }
    } catch (error) {
      console.error("Failed to save settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle remember format toggle
  const handleRememberFormatChange = (enabled: boolean) => {
    setRememberFormat(enabled)
    localStorage.setItem(
      "tablexport-remember-format-enabled",
      enabled.toString()
    )

    if (enabled) {
      // Save current format when enabling
      localStorage.setItem(
        "tablexport-preferred-format",
        settings.defaultFormat
      )
      console.log(
        `🧠 Enabled format memory with current format: ${settings.defaultFormat}`
      )
    } else {
      // Clear saved format when disabling
      localStorage.removeItem("tablexport-preferred-format")
      console.log("🗑️ Disabled format memory and cleared saved format")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        <span className="ml-2 text-sm text-gray-600">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Default Format Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-800">
            📄 Default Export Format
          </label>
          {rememberFormat && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              🧠 Memory ON
            </span>
          )}
        </div>

        <div className={`grid gap-3 ${isGoogleDriveAuthenticated ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {(() => {
            const formats = [
              { key: "xlsx", icon: "📊", name: "Excel", ext: ".xlsx", cloudNative: false },
              { key: "csv", icon: "📄", name: "CSV", ext: "", cloudNative: false },
              { key: "docx", icon: "📝", name: "Word", ext: ".docx", cloudNative: false },
              { key: "pdf", icon: "📋", name: "PDF", ext: "", cloudNative: false },
              // Google Sheets - only show if authenticated
              ...(isGoogleDriveAuthenticated ? [{ key: "google_sheets", icon: "📊", name: "Google Sheets", ext: "☁️", cloudNative: true }] : [])
            ] as Array<{ key: string; icon: string; name: string; ext: string; cloudNative: boolean }>
            
            console.log("🔍 [SettingsForm] Rendering formats:", {
              isGoogleDriveAuthenticated,
              totalFormats: formats.length,
              formats: formats.map(f => f.key)
            })
            
            return formats
          })().map((format) => (
            <button
              key={format.key}
              onClick={() => handleSettingChange("defaultFormat", format.key)}
              className={`group relative px-4 py-3 text-sm rounded-xl border-2 transition-all duration-200 ${
                settings.defaultFormat === format.key
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-500 shadow-lg scale-105"
                  : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50"
              }`}
              disabled={isSaving}>
              <div className="flex flex-col items-center space-y-1">
                <span className="text-lg">{format.icon}</span>
                <span className="font-medium">{format.name}</span>
                {format.ext && !format.cloudNative && (
                  <span className="text-xs opacity-70">{format.ext}</span>
                )}
                {format.cloudNative && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {format.ext} Cloud Native
                  </span>
                )}
              </div>
              {settings.defaultFormat === format.key && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Google Sheets Info */}
        {settings.defaultFormat === "google_sheets" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 flex items-center">
              <span className="mr-2">☁️</span>
              Google Sheets creates native cloud spreadsheets with real-time collaboration
            </p>
          </div>
        )}

        {/* Google Sheets Not Available Info */}
        {!isGoogleDriveAuthenticated && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 flex items-center">
              <span className="mr-2">📊</span>
              Google Sheets format requires Google Drive connection
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Connect your Google account below to unlock Google Sheets export
            </p>
          </div>
        )}

        {/* Format Memory Toggle */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                🧠 Remember My Format
              </span>
              <div className="group relative">
                <span className="text-xs text-gray-500 cursor-help">ⓘ</span>
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap">
                  Auto-saves your preferred format
                </div>
              </div>
            </div>
            <button
              onClick={() => handleRememberFormatChange(!rememberFormat)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                rememberFormat ? "bg-emerald-500" : "bg-gray-300"
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  rememberFormat ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {rememberFormat && (
            <p className="text-xs text-emerald-600 mt-2">
              ✅ Format will be automatically saved for future exports
            </p>
          )}
        </div>
      </div>

      {/* Default Destination Section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-800">
          📁 Default Destination
        </label>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() =>
              settings.defaultFormat !== "google_sheets" && handleSettingChange("defaultDestination", "download")
            }
            className={`group px-4 py-3 text-sm rounded-xl border-2 transition-all duration-200 ${
              settings.defaultDestination === "download"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg"
                : settings.defaultFormat === "google_sheets"
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
            }`}
            disabled={isSaving || settings.defaultFormat === "google_sheets"}>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">💾</span>
              <span className="font-medium">Download to Device</span>
              {settings.defaultFormat === "google_sheets" && (
                <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                  ❌ N/A for Sheets
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() =>
              isGoogleDriveAuthenticated && handleSettingChange("defaultDestination", "google_drive")
            }
            className={`group px-4 py-3 text-sm rounded-xl border-2 transition-all duration-200 relative ${
              settings.defaultDestination === "google_drive"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-lg"
                : isGoogleDriveAuthenticated
                ? "bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
            disabled={isSaving || !isGoogleDriveAuthenticated}>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">☁️</span>
              <span className="font-medium">Google Drive</span>
              {!isGoogleDriveAuthenticated && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                  🔒 Login Required
                </span>
              )}
              {isGoogleDriveAuthenticated && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  ✅ Connected
                </span>
              )}
            </div>
          </button>
        </div>

        {settings.defaultDestination === "google_drive" && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 flex items-center">
              <span className="mr-2">⚡</span>
              Google Drive integration is available in Pro version
            </p>
          </div>
        )}
      </div>

      {/* Auto Export Section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-800">
          🚀 Auto Export
        </label>
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  Auto-export when table detected
                </span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  BETA
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Automatically exports tables as soon as they're found
              </p>
            </div>
            <button
              onClick={() =>
                handleSettingChange("autoExport", !settings.autoExport)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                settings.autoExport ? "bg-purple-500" : "bg-gray-300"
              }`}
              disabled={isSaving}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoExport ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-800">
          🎨 Theme
        </label>
        <select
          value={settings.theme}
          onChange={(e) =>
            handleSettingChange(
              "theme",
              e.target.value as "light" | "dark" | "auto"
            )
          }
          className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          disabled={isSaving}>
          <option value="auto">🔄 Auto (System)</option>
          <option value="light">☀️ Light Mode</option>
          <option value="dark">🌙 Dark Mode</option>
        </select>
      </div>

      {/* Save Indicator */}
      {isSaving && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mr-2"></div>
          <span className="text-sm text-emerald-600 font-medium">
            Saving...
          </span>
        </div>
      )}
    </div>
  )
}

export default SettingsForm
