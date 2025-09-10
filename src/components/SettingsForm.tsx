import React, { useEffect, useState } from "react"

import { getUserSettings, saveUserSettings } from "../lib/storage"
import type { UserSettings, AnalyticsSettings } from "../types"
import {
  iconExcel,
  iconCsv,
  iconWord,
  iconPdf,
  iconDevice,
  iconPadlock
} from "../contents/components/batch-export/svg-icons"

interface SettingsFormProps {
  onSettingsChange?: (settings: UserSettings) => void
}

const SettingsForm: React.FC<SettingsFormProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<UserSettings>({
    defaultFormat: "xlsx",
    defaultDestination: "download",
    autoExport: false,
    theme: "auto",
    analytics: {
      enabled: false,
      calculateSums: true,
      calculateAverages: true,
      countUnique: true
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [rememberFormat, setRememberFormat] = useState(false)
  const [isGoogleDriveAuthenticated, setIsGoogleDriveAuthenticated] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  // Refresh authentication state function
  const refreshAuthState = async (): Promise<boolean> => {
    try {
      const authResult = await chrome.runtime.sendMessage({
        type: "CHECK_AUTH_STATUS"
      })
      
      const isAuthenticated = authResult?.success && 
                             authResult?.authState?.isAuthenticated &&
                             authResult?.authState?.hasGoogleAccess
      
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
    const loadSettings = async (): Promise<void> => {
      try {
        const userSettings = await getUserSettings()
        
        // Check Google Drive authentication
        const isAuthenticated = await refreshAuthState()
        
        // If user prefers Google Drive but not authenticated or not premium, switch to download
        if (userSettings.defaultDestination === "google_drive" && (!isAuthenticated || !isPremium)) {
          userSettings.defaultDestination = "download"
        }
        
        // Check premium status
        try {
          const response = await chrome.runtime.sendMessage({
            type: "CHECK_SUBSCRIPTION"
          })
          if (response.success && response.subscription) {
            const isPremiumUser = response.subscription.planType === 'pro'
            setIsPremium(isPremiumUser)
            // удален лишний console.log о премиум-статусе
            
            // If user prefers Google Sheets but is not premium, switch to Excel
            if (userSettings.defaultFormat === "google_sheets" && !isPremiumUser) {
              userSettings.defaultFormat = "xlsx"
              // удален лишний console.log о переключении на Excel
            }
          }
        } catch (error) {
          console.error("Failed to check subscription:", error)
          setIsPremium(false)
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

    // Add checkbox styles for checked state
    const addCheckboxStyles = (): void => {
      const styleId = "settings-checkbox-styles"
      
      // Remove existing styles if present
      const existingStyles = document.getElementById(styleId)
      if (existingStyles) {
        existingStyles.remove()
      }
      
      // Create style element
      const style = document.createElement("style")
      style.id = styleId
      style.textContent = `
        /* Checkbox styles for all checkboxes */
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
        }
        
        input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background-image: url('data:image/svg+xml;utf8,<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.01208 7.28515L5.00408 11.2771L12.9881 2.72287" stroke="white" stroke-width="1.71424" stroke-linecap="round" stroke-linejoin="round"/></svg>');
          background-repeat: no-repeat;
          background-position: center;
        }
        
        input[type="checkbox"]:hover:not(:disabled) {
          opacity: 0.5;
        }
        
        /* Analytics specific checkbox styles */
        div[style*="Analytics"] input[type="checkbox"] {
          position: relative;
        }
        
        /* Labels for analytics checkboxes */
        label[style*="8px 12px"] {
          transition: all 0.2s ease;
        }
      `
      
      // Add to document head
      document.head.appendChild(style)
    }

    loadSettings()
    addCheckboxStyles()

    // Listen for auth state changes
    const handleMessage = (message: any): void => {
      if (message.type === "AUTH_STATE_CHANGED" || message.type === "GOOGLE_AUTH_SUCCESS") {
        refreshAuthState()
      }
    }

    // Add message listener
    chrome.runtime.onMessage.addListener(handleMessage)

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage)
      
      // Remove checkbox styles on cleanup
      const existingStyles = document.getElementById("settings-checkbox-styles")
      if (existingStyles) {
        existingStyles.remove()
      }
    }
  }, [])

  // Handle setting changes
  const handleSettingChange = async (key: keyof UserSettings, value: any): Promise<void> => {
    // Special case for defaultDestination
    if (key === "defaultDestination" && value === "google_drive" && (!isGoogleDriveAuthenticated || !isPremium)) {
      console.warn("Cannot set Google Drive as destination when not authenticated or not premium")
      return
    }
    
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
            // удален лишний console.log об уведомлении
          }
        } catch (error) {
          // удален лишний console.log об отсутствии content script
        }
      }

      // If Google Sheets format is selected, automatically set destination to google_drive
      if (key === "defaultFormat" && value === "google_sheets") {
        if (settings.defaultDestination !== "google_drive") {
          // удален лишний console.log об автопереключении
          const updatedSettings = { ...newSettings, defaultDestination: "google_drive" as const }
          setSettings(updatedSettings)
          await saveUserSettings(updatedSettings)
          onSettingsChange?.(updatedSettings)
          
          try {
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true
            })
            
            if (tab.id) {
              await chrome.tabs.sendMessage(tab.id, {
                type: "SETTINGS_CHANGED",
                key: "defaultDestination",
                value: "google_drive",
                settings: updatedSettings
              })
              // удален лишний console.log об уведомлении при автопереключении
            }
          } catch (error) {
            // удален лишний console.log об отсутствии content script
          }
        }
      }

      // If format changed and remember is enabled, save it
      if (key === "defaultFormat" && rememberFormat) {
        localStorage.setItem("tablexport-preferred-format", value)
        // удален лишний console.log об автосохранении
      }
    } catch (error) {
      console.error("Failed to save settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle remember format toggle
  const handleRememberFormatChange = (enabled: boolean): void => {
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
      // удален лишний console.log при включении памяти формата
    } else {
      localStorage.removeItem("tablexport-preferred-format")
      // удален лишний console.log при отключении памяти формата
    }
  }

  // Handle analytics setting changes
  const handleAnalyticsSettingChange = async (key: keyof AnalyticsSettings, value: any): Promise<void> => {
    setIsSaving(true)

    try {
      const newAnalyticsSettings = { 
        ...settings.analytics, 
        [key]: value 
      } as AnalyticsSettings
      const newSettings = { ...settings, analytics: newAnalyticsSettings }
      
      setSettings(newSettings)
      await saveUserSettings(newSettings)
      
      // Notify parent component
      onSettingsChange?.(newSettings)
    
      console.log(`📊 Analytics setting changed: ${key} = ${value}`)
    } catch (error) {
      console.error("Failed to save analytics settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mr-3"></div>
        <span className="ml-2 text-sm text-gray-600">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      <form
        className="space-y-6"
        onSubmit={(e) => e.preventDefault()}>
        {/* Default Export Format */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-800">
              Default Export Format
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Excel Button */}
            <button
              key="xlsx"
              onClick={() => handleSettingChange("defaultFormat", "xlsx")}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: settings.defaultFormat === "xlsx" ? "#D2F2E2" : "white",
                border: settings.defaultFormat === "xlsx" ? "none" : "1.5px solid #CDD2D0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "14px",
                fontWeight: 500,
                color: "#062013",
                width: "100%",
                boxSizing: "border-box",
                gap: "12px",
                userSelect: "none"
              }}
              onMouseEnter={(e) => {
                if (settings.defaultFormat !== "xlsx") {
                  e.currentTarget.style.opacity = "0.5"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
              disabled={isSaving}
            >
              <span 
                style={{ 
                  width: "16px", 
                  height: "16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}
                dangerouslySetInnerHTML={{ __html: iconExcel }}
              />
              <span>Excel</span>
            </button>

            {/* CSV Button */}
            <button
              key="csv"
              onClick={() => handleSettingChange("defaultFormat", "csv")}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: settings.defaultFormat === "csv" ? "#D2F2E2" : "white",
                border: settings.defaultFormat === "csv" ? "none" : "1.5px solid #CDD2D0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "14px",
                fontWeight: 500,
                color: "#062013",
                width: "100%",
                boxSizing: "border-box",
                gap: "12px",
                userSelect: "none"
              }}
              onMouseEnter={(e) => {
                if (settings.defaultFormat !== "csv") {
                  e.currentTarget.style.opacity = "0.5"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
              disabled={isSaving}
            >
              <span
                style={{ 
                  width: "16px", 
                  height: "16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}
                dangerouslySetInnerHTML={{ __html: iconCsv }}
              />
              <span>CSV</span>
            </button>

            {/* Word Button */}
            <button
              key="docx"
              onClick={() => handleSettingChange("defaultFormat", "docx")}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: settings.defaultFormat === "docx" ? "#D2F2E2" : "white",
                border: settings.defaultFormat === "docx" ? "none" : "1.5px solid #CDD2D0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "14px",
                fontWeight: 500,
                color: "#062013",
                width: "100%",
                boxSizing: "border-box",
                gap: "12px",
                userSelect: "none"
              }}
              onMouseEnter={(e) => {
                if (settings.defaultFormat !== "docx") {
                  e.currentTarget.style.opacity = "0.5"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
              disabled={isSaving}
            >
              <span 
                style={{ 
                  width: "16px", 
                  height: "16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}
                dangerouslySetInnerHTML={{ __html: iconWord }}
              />
              <span>Word</span>
            </button>

            {/* PDF Button */}
            <button
              key="pdf"
              onClick={() => handleSettingChange("defaultFormat", "pdf")}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: settings.defaultFormat === "pdf" ? "#D2F2E2" : "white",
                border: settings.defaultFormat === "pdf" ? "none" : "1.5px solid #CDD2D0",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "14px",
                fontWeight: 500,
                color: "#062013",
                width: "100%",
                boxSizing: "border-box",
                gap: "12px",
                userSelect: "none"
              }}
              onMouseEnter={(e) => {
                if (settings.defaultFormat !== "pdf") {
                  e.currentTarget.style.opacity = "0.5"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
              disabled={isSaving}
            >
              <span 
                style={{ 
                  width: "16px", 
                  height: "16px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center" 
                }}
                dangerouslySetInnerHTML={{ __html: iconPdf }}
              />
              <span>PDF</span>
            </button>
          </div>

          {/* Google Sheets option - full width, always visible */}
          <div style={{ width: "100%", marginBottom: "8px" }}>
            {/* Format Memory Toggle */}
            <div style={{ marginTop: "4px" }}>
              <label 
                onClick={() => handleRememberFormatChange(!rememberFormat)}
                style={{
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "#062013",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                <div 
                  style={{
                    position: "relative",
                    width: "44px",
                    height: "24px",
                    backgroundColor: rememberFormat ? "#1B9358" : "transparent",
                    border: rememberFormat ? "1px solid #1B9358" : "1px solid #d1d5db",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    margin: "0",
                    boxSizing: "border-box"
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "1px",
                      left: rememberFormat ? "21px" : "1px",
                      width: "20px",
                      height: "20px",
                      backgroundColor: rememberFormat ? "white" : "#1B9358",
                      borderRadius: "50%",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
                    }}
                  />
                </div>
                <span>Remember my format</span>
                {rememberFormat && (
                  <span 
                    style={{
                      fontSize: "10px",
                      backgroundColor: "#d1fae5",
                      color: "#047857",
                      padding: "4px",
                      borderRadius: "9999px",
                      fontWeight: "500"
                    }}
                  >
                    Memory ON
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Google Drive Authentication - removed from here */}
        </div>
        
        {/* Export Destination */}
        <div style={{ marginTop: "24px" }}>
          <h3 style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "#062013",
            margin: "0 0 16px 0"
          }}>
            Export Destination
          </h3>
          
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            {/* Download to Device */}
            <label 
              onClick={() => {
                if (settings.defaultFormat !== "google_sheets") {
                  handleSettingChange("defaultDestination", "download")
                }
              }}
              style={{
                display: "flex",
                padding: "16px",
                borderRadius: "8px",
                border: settings.defaultDestination === "download" ? "none" : "1px solid #CDD2D0",
                background: settings.defaultDestination === "download" ? "#D2F2E2" : 
                          settings.defaultFormat === "google_sheets" ? "#F3F4F3" : "white",
                cursor: settings.defaultFormat === "google_sheets" ? "not-allowed" : "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                fontSize: "14px",
                fontWeight: "400",
                color: "#062013",
                margin: "0",
                opacity: settings.defaultFormat === "google_sheets" ? "0.7" : "1",
                userSelect: "none"
              }}
              onMouseEnter={(e) => {
                if (settings.defaultDestination !== "download" && settings.defaultFormat !== "google_sheets") {
                  e.currentTarget.style.opacity = "0.5"
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = settings.defaultFormat === "google_sheets" ? "0.7" : "1"
              }}
            >
              <input
                type="radio"
                name="destination"
                value="download"
                checked={settings.defaultDestination === "download"}
                onChange={() => handleSettingChange("defaultDestination", "download")}
                disabled={settings.defaultFormat === "google_sheets"}
                style={{ display: "none" }}
              />
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                width: "100%"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  marginTop: "2px"
                }}>
                  <span dangerouslySetInnerHTML={{ __html: iconDevice }} />
                </div>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#062013",
                    lineHeight: "20px"
                  }}>
                    Download to Device
                  </div>
                  <div style={{
                    fontSize: "12px",
                    fontWeight: "400",
                    color: "#062013",
                    lineHeight: "16px",
                    opacity: "0.6"
                  }}>
                    Save files directly to your computer
                  </div>
                  {settings.defaultFormat === "google_sheets" && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginTop: "4px"
                    }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "14px",
                          height: "14px"
                        }}
                        dangerouslySetInnerHTML={{ __html: iconPadlock }}
                      />
                      <span style={{
                        fontSize: "12px",
                        fontWeight: "400",
                        color: "#829089"
                      }}>
                        Google Sheets requires Google Drive destination
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </label>

          </div>
        </div>

        {/* Analytics Section */}
        <div style={{ marginTop: "24px" }}>
          <div style={{
            padding: "20px",
            border: "1px solid #CDD2D0",
            borderRadius: "10px",
            marginBottom: "20px"
          }}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                userSelect: "none"
              }}>
                <input
                  type="checkbox"
                  checked={settings.analytics?.enabled || false}
                  onChange={(e) => handleAnalyticsSettingChange("enabled", e.target.checked)}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    width: "20px",
                    height: "20px",
                    border: "1px solid #1B9358",
                    borderRadius: "2px",
                    margin: "0",
                    cursor: "pointer",
                    position: "relative",
                    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                    background: settings.analytics?.enabled ? "#1B9358" : "white"
                  }}
                />
                <span style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#062013"
                }}>
                  Analytics & Summaries
                </span>
              </label>
              <div style={{
                fontSize: "12px",
                color: "#062013",
                lineHeight: "1.4",
                marginTop: "4px",
                marginBottom: "16px"
              }}>
                Add automatic calculations (sums, averages, counts) to exported tables
              </div>
            </div>
            
            <div style={{
              transition: "all 0.3s ease",
              opacity: settings.analytics?.enabled ? "1" : "0.5",
              pointerEvents: settings.analytics?.enabled ? "auto" : "none"
            }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "12px"
              }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  userSelect: "none"
                }}>
                  <input
                    type="checkbox"
                    checked={settings.analytics?.calculateSums || false}
                    onChange={(e) => handleAnalyticsSettingChange("calculateSums", e.target.checked)}
                    disabled={!settings.analytics?.enabled}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      width: "20px",
                      height: "20px",
                      border: "1px solid #1B9358",
                      borderRadius: "2px",
                      margin: "0",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                      background: settings.analytics?.calculateSums ? "#1B9358" : "white"
                    }}
                  />
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#062013"
                  }}>
                    Calculate Sums
                  </span>
                </label>
                
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  userSelect: "none"
                }}>
                  <input
                    type="checkbox"
                    checked={settings.analytics?.calculateAverages || false}
                    onChange={(e) => handleAnalyticsSettingChange("calculateAverages", e.target.checked)}
                    disabled={!settings.analytics?.enabled}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      width: "20px",
                      height: "20px",
                      border: "1px solid #1B9358",
                      borderRadius: "2px",
                      margin: "0",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                      background: settings.analytics?.calculateAverages ? "#1B9358" : "white"
                    }}
                  />
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#062013"
                  }}>
                    Calculate Averages
                  </span>
                </label>
                
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: "white",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  userSelect: "none"
                }}>
                  <input
                    type="checkbox"
                    checked={settings.analytics?.countUnique || false}
                    onChange={(e) => handleAnalyticsSettingChange("countUnique", e.target.checked)}
                    disabled={!settings.analytics?.enabled}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      width: "20px",
                      height: "20px",
                      border: "1px solid #1B9358",
                      borderRadius: "2px",
                      margin: "0",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                      background: settings.analytics?.countUnique ? "#1B9358" : "white"
                    }}
                  />
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#062013"
                  }}>
                    Count Unique Values
                  </span>
                </label>
              </div>

              <div style={{
                padding: "12px",
                background: "#f8fdf9",
                border: "1px solid #d1e7dd",
                borderRadius: "6px",
                transition: "all 0.3s ease",
                display: settings.analytics?.enabled ? "block" : "none"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "8px"
                }}>
                  <span style={{
                    fontSize: "12px",
                    color: "#062013",
                    lineHeight: "1.4"
                  }}>
                    Summary rows will be added below each table with calculated values
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px"
                }}>
                  <span style={{
                    fontSize: "12px",
                    color: "#062013",
                    lineHeight: "1.4"
                  }}>
                    Works with numeric data, currencies, and percentages
                  </span>
                </div>
              </div>
            </div>
          </div>
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
      </form>
    </div>
  )
}

export default SettingsForm
