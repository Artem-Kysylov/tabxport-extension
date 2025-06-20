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

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await getUserSettings()
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
  }, [])

  // Handle setting changes
  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    setIsSaving(true)
    try {
      await saveUserSettings({ [key]: value })
      onSettingsChange?.(newSettings)

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

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "xlsx", icon: "📊", name: "Excel", ext: ".xlsx" },
            { key: "csv", icon: "📄", name: "CSV", ext: "" },
            { key: "docx", icon: "📝", name: "Word", ext: ".docx" },
            { key: "pdf", icon: "📋", name: "PDF", ext: "" }
          ].map((format) => (
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
                {format.ext && (
                  <span className="text-xs opacity-70">{format.ext}</span>
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
              handleSettingChange("defaultDestination", "download")
            }
            className={`group px-4 py-3 text-sm rounded-xl border-2 transition-all duration-200 ${
              settings.defaultDestination === "download"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-500 shadow-lg"
                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
            }`}
            disabled={isSaving}>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">💾</span>
              <span className="font-medium">Download to Device</span>
            </div>
          </button>

          <button
            onClick={() =>
              handleSettingChange("defaultDestination", "google_drive")
            }
            className={`group px-4 py-3 text-sm rounded-xl border-2 transition-all duration-200 relative ${
              settings.defaultDestination === "google_drive"
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-500 shadow-lg"
                : "bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50"
            }`}
            disabled={isSaving}>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">☁️</span>
              <span className="font-medium">Google Drive</span>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                PRO
              </span>
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
