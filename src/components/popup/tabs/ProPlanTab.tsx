import React, { useState } from "react"

import { AuthStatus } from "../../AuthStatus"
import SubscriptionStatus from "../../SubscriptionStatus"

interface AuthState {
  user: any | null
  isLoading: boolean
  isAuthenticated: boolean
  hasGoogleAccess: boolean
}

interface ProPlanTabProps {
  onUpgradeClick: () => void
}

export const ProPlanTab: React.FC<ProPlanTabProps> = ({
  onUpgradeClick
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    hasGoogleAccess: false
  })

  const handleUpgradeClick = () => {
    // Вызываем переданный коллбек
    onUpgradeClick()
    // Открываем страницу подписки
    chrome.tabs.create({ url: "https://tabxport.com/pricing" })
  }

  const handleAuthChange = (newAuthState: AuthState) => {
    setAuthState(newAuthState)
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Pro Plan</h2>
      
      {/* Authentication Status */}
      <AuthStatus onAuthChange={handleAuthChange} />
      
      {/* Subscription Status - only show if authenticated */}
      {authState.isAuthenticated && (
      <SubscriptionStatus onUpgradeClick={handleUpgradeClick} />
      )}
      
      {/* Info for unauthenticated users */}
      {!authState.isAuthenticated && !authState.isLoading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-center">
            <span className="text-3xl mb-3 block">🚀</span>
            <h3 className="font-semibold text-gray-900 mb-2">Welcome to TabXport</h3>
            <p className="text-sm text-gray-600 mb-4">
              Export tables from AI chat platforms to Excel, CSV, PDF and Google Drive
            </p>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center justify-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Works with ChatGPT, Claude, Gemini, DeepSeek
              </div>
              <div className="flex items-center justify-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Multiple export formats supported
              </div>
              <div className="flex items-center justify-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Direct export to Google Drive
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 