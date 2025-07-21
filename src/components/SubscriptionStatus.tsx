import React, { useEffect, useState } from "react"

import type { UserSubscription } from "../types"

interface SubscriptionStatusProps {
  onUpgradeClick: () => void
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  onUpgradeClick
}) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "CHECK_SUBSCRIPTION"
        })
        if (response.success) {
          setSubscription(response.subscription)
        }
      } catch (error) {
        console.error("Failed to load subscription:", error)
      } finally {
        setLoading(false)
      }
    }

    loadSubscription()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="text-center">
        <p className="text-gray-600 mb-4">
          Start exporting tables with TabXport Pro
        </p>
        <button
          onClick={onUpgradeClick}
          className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors">
          Upgrade to Pro
        </button>
      </div>
    )
  }

  const isProPlan = subscription.planType === "pro"
  const exportsLeft = subscription.exportsLimit - subscription.exportsUsed

  return (
    <div>
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Current Plan
          </span>
          <span
            className={`text-sm font-semibold ${isProPlan ? "text-emerald-600" : "text-gray-600"}`}>
            {isProPlan ? "Pro 🎉" : "Free"}
          </span>
        </div>

        {!isProPlan && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Exports Left</span>
              <span>
                {exportsLeft} / {subscription.exportsLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full"
                style={{
                  width: `${(subscription.exportsUsed / subscription.exportsLimit) * 100}%`
                }}></div>
            </div>
          </div>
        )}

        {!isProPlan && (
          <button
            onClick={onUpgradeClick}
            className="w-full bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors">
            Upgrade to Pro
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-sm">
          <span className="text-emerald-600 mr-2">✓</span>
          <span>Export to Excel & CSV</span>
        </div>
        <div className="flex items-center text-sm">
          <span className="text-emerald-600 mr-2">✓</span>
          <span>Auto-export tables</span>
        </div>
        {isProPlan ? (
          <>
            <div className="flex items-center text-sm">
              <span className="text-emerald-600 mr-2">✓</span>
              <span>Unlimited exports</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-emerald-600 mr-2">✓</span>
              <span>Google Drive integration</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center text-sm text-gray-400">
              <span className="mr-2">○</span>
              <span>Unlimited exports</span>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <span className="mr-2">○</span>
              <span>Google Drive integration</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SubscriptionStatus
