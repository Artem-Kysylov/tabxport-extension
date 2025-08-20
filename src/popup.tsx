import React, { useEffect, useState } from "react"

// Remove the problematic import since debug-env doesn't exist
// import "./debug-env"
import "./style.css"

import { Footer } from "./components/popup/common/Footer"
import { Header } from "./components/popup/common/Header"
import { TabId, TabNavigation } from "./components/popup/common/TabNavigation"
import { HelpTab } from "./components/popup/tabs/HelpTab"
import { ProPlanTab } from "./components/popup/tabs/ProPlanTab"
import { SettingsTab } from "./components/popup/tabs/SettingsTab"
import type { UserSettings } from "./types"
import { AuthStatus } from "./components/AuthStatus"
import AuthDetails from "./components/AuthDetails"

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("settings")
  const [isSupported, setIsSupported] = useState<boolean>(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [authUser, setAuthUser] = useState<any>(null)

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        if (tab.url) {
          const supportedSites = [
            "chat.openai.com",
            "claude.ai",
            "gemini.google.com",
            "chat.deepseek.com",
            "deepseek.com"
          ]

          const isSupported = supportedSites.some((site) =>
            tab.url!.includes(site)
          )
          setIsSupported(isSupported)
        }
      } catch (error) {
        console.error("Failed to get current tab:", error)
      }
    }

    getCurrentTab()
  }, [])

  const handleSettingsChange = (settings: UserSettings) => {
    console.log("Settings updated:", settings)
    // TODO: Implement settings update through messaging service
  }

  const handleUpgradeClick = () => {
    const baseUrl = "https://www.tablexport.com/payment"
    const params = new URLSearchParams({
      source: "extension",
      ...(authUser?.id ? { user: authUser.id } : {}),
      ...(authUser?.email ? { email: authUser.email } : {})
    })

    chrome.tabs.create({
      url: `${baseUrl}?${params.toString()}`
    })
  }

  const handleAuthChange = (authState: any) => {
    console.log("Auth state changed:", authState); // Добавим логирование для отладки
    setIsAuthenticated(authState.isAuthenticated);
    setAuthUser(authState.user); // Сохраняем данные пользователя
  }

  const handleSignOut = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SIGN_OUT"
      })

      if (response?.success) {
        setIsAuthenticated(false);
        setAuthUser(null);
      }
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  return (
    <div className="w-80 bg-white">
      <Header isSupported={isSupported} />

      {isAuthenticated ? (
        <>
          {authUser && <AuthDetails user={authUser} onSignOut={handleSignOut} />}
          
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "settings" && (
            <SettingsTab onSettingsChange={handleSettingsChange} />
          )}

          {activeTab === "proPlan" && (
            <ProPlanTab onUpgradeClick={handleUpgradeClick} />
          )}

          {activeTab === "help" && <HelpTab />}
        </>
      ) : (
        <AuthStatus onAuthChange={handleAuthChange} />
      )}

      <Footer />
    </div>
  )
}

export default Popup
