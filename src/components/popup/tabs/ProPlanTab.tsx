import React, { useEffect, useMemo, useState } from "react"
import type { UserSubscription } from "../../../types"

interface ProPlanTabProps {
  onUpgradeClick: () => void
}

export const ProPlanTab: React.FC<ProPlanTabProps> = ({ onUpgradeClick }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // UI состояния для отмены подписки
  const [cancelState, setCancelState] = useState<{
    showConfirm: boolean
    isLoading: boolean
    error: string | null
  }>({
    showConfirm: false,
    isLoading: false,
    error: null
  })

  const isPro = useMemo(() => subscription?.planType === "pro", [subscription])
  const exportsLeft = useMemo(() => {
    if (!subscription) return 0
    return Math.max(0, subscription.exportsLimit - subscription.exportsUsed)
  }, [subscription])

  // Тихая проверка подписки (без глобального лоадера) — обновляем состояние только при изменениях
  const refreshSubscription = async (withLoader = false) => {
    if (withLoader) setInitialLoading(true)
    try {
      const response = await chrome.runtime.sendMessage({ type: "CHECK_SUBSCRIPTION" })
      if (response?.success) {
        const next: UserSubscription | null = response.subscription || null
        setSubscription((prev) => {
          const changed =
            (!prev && !!next) ||
            (!!prev &&
              !!next &&
              (prev.planType !== next.planType ||
                prev.exportsUsed !== next.exportsUsed ||
                prev.exportsLimit !== next.exportsLimit)) ||
            (!!prev && !next)

          return changed ? next : prev
        })
      }
    } catch (e) {
      console.error("Failed to refresh subscription:", e)
      // Не меняем текущее состояние при ошибке — сохраняем стабильный UI
    } finally {
      if (withLoader) setInitialLoading(false)
    }
  }

  useEffect(() => {
    // Первичная загрузка с лоадером
    refreshSubscription(true)
  }, [])

  useEffect(() => {
    // Периодическое тихое обновление без лоадера (без “мигания”)
    const interval = setInterval(() => {
      refreshSubscription(false)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleCancelSubscription = async () => {
    try {
      setCancelState((s) => ({ ...s, isLoading: true, error: null }))
      const response = await chrome.runtime.sendMessage({ type: "CANCEL_SUBSCRIPTION" })
      if (response?.success) {
        // после отмены обновим статус
        await refreshSubscription(false)
        setCancelState({ showConfirm: false, isLoading: false, error: null })
      } else {
        setCancelState((s) => ({
          ...s,
          isLoading: false,
          error: response?.error || "Failed to cancel subscription"
        }))
      }
    } catch (e) {
      console.error("Cancel subscription error:", e)
      setCancelState((s) => ({
        ...s,
        isLoading: false,
        error: "Something went wrong. Please try again."
      }))
    }
  }

  // ====== Рендер блоков ======

  const renderHeader = () => (
    <h2
      style={{
        fontSize: "16px",
        fontWeight: 600,
        color: "#062013",
        margin: "0 0 24px 0"
      }}
    >
      Pro Plan
    </h2>
  )

  const renderCurrentPlanCard = () => {
    return (
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            padding: "16px",
            backgroundColor: isPro ? "#f0f9ff" : "#f8fdf9",
            border: `1px solid ${isPro ? "#bfdbfe" : "#d1e7dd"}`,
            borderRadius: "10px"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px"
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#062013"
              }}
            >
              Your current plan: {isPro ? "Pro" : "Free"}
            </span>
          </div>

          {isPro ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#062013",
                  fontSize: "12px"
                }}
              >
                <span>Full access unlocked. Thank you!</span>
              </div>

              {/* Cancel subscription link for Pro users */}
              <div style={{ marginTop: "12px" }}>
                {!cancelState.showConfirm ? (
                  <button
                    onClick={() =>
                      setCancelState((s) => ({ ...s, showConfirm: true, error: null }))
                    }
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      fontSize: "12px",
                      padding: 0,
                      cursor: "pointer",
                      textDecoration: "underline"
                    }}
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "8px"
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#062013" }}>
                      Cancel now? You’ll keep access until the end of the paid period.
                    </span>
                    <button
                      disabled={cancelState.isLoading}
                      onClick={handleCancelSubscription}
                      style={{
                        backgroundColor: "#dc2626",
                        color: "#fff",
                        border: "1px solid #b91c1c",
                        borderRadius: "6px",
                        fontSize: "12px",
                        padding: "6px 10px",
                        cursor: cancelState.isLoading ? "default" : "pointer",
                        opacity: cancelState.isLoading ? 0.8 : 1
                      }}
                    >
                      {cancelState.isLoading ? "Canceling..." : "Yes, cancel"}
                    </button>
                    <button
                      disabled={cancelState.isLoading}
                      onClick={() =>
                        setCancelState((s) => ({ ...s, showConfirm: false, error: null }))
                      }
                      style={{
                        background: "none",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "12px",
                        padding: "6px 10px",
                        cursor: cancelState.isLoading ? "default" : "pointer"
                      }}
                    >
                      No
                    </button>
                  </div>
                )}

                {cancelState.error && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "#b91c1c"
                    }}
                  >
                    {cancelState.error}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Для Free показываем прогресс и CTA */}
              {subscription && (
                <div style={{ marginBottom: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "#062013",
                      marginBottom: "6px"
                    }}
                  >
                    <span>Exports Left</span>
                    <span>
                      {exportsLeft} / {subscription.exportsLimit}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      backgroundColor: "#e5e7eb",
                      borderRadius: "999px",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${
                          subscription.exportsLimit > 0
                            ? Math.min(
                                100,
                                (subscription.exportsUsed / subscription.exportsLimit) * 100
                              )
                            : 0
                        }%`,
                        backgroundColor: "#1B9358"
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={onUpgradeClick}
                style={{
                  backgroundColor: "#1B9358",
                  color: "white",
                  border: "1px solid #157347",
                  borderRadius: "8px",
                  fontSize: "12px",
                  padding: "10px 12px",
                  cursor: "pointer"
                }}
              >
                Upgrade to Pro
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderComparisonTable = () => {
    const features: Array<{ name: string; free: boolean; pro: boolean }> = [
      { name: "Export to Excel / CSV", free: true, pro: true },
      { name: "Export to Google Drive", free: false, pro: true },
      { name: "Export to Google Sheets", free: false, pro: true },
      { name: "Batch export up to 10 tables", free: false, pro: true },
      { name: "Formula support (Sum, etc)", free: false, pro: true },
      { name: '"Remember format" toggle', free: true, pro: true },
      { name: "Priority support", free: false, pro: true }
    ]

    const mark = (ok: boolean) => (
      <span style={{ fontWeight: 600, color: ok ? "#1B9358" : "#9CA3AF" }}>
        {ok ? "✓" : "–"}
      </span>
    )

    return (
      <div style={{ marginBottom: "24px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#062013",
            margin: "0 0 16px 0"
          }}
        >
          Free vs Pro Comparison
        </h3>

        <div
          style={{
            border: "1px solid #CDD2D0",
            borderRadius: "10px",
            overflow: "hidden"
          }}
        >
          {/* header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 60px",
              backgroundColor: "#f8f9fa",
              borderBottom: "1px solid #CDD2D0"
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#062013",
                borderRight: "1px solid #CDD2D0"
              }}
            >
              Feature
            </div>
            <div
              style={{
                padding: "12px 8px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#062013",
                textAlign: "center",
                borderRight: "1px solid #CDD2D0"
              }}
            >
              Free
            </div>
            <div
              style={{
                padding: "12px 8px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#062013",
                textAlign: "center"
              }}
            >
              Pro
            </div>
          </div>

          {/* rows */}
          {features.map((f, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px 60px",
                borderBottom: idx < features.length - 1 ? "1px solid #e5e7eb" : "none"
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  fontSize: "12px",
                  color: "#062013",
                  borderRight: "1px solid #e5e7eb"
                }}
              >
                {f.name}
              </div>
              <div
                style={{
                  padding: "12px 8px",
                  textAlign: "center",
                  borderRight: "1px solid #e5e7eb"
                }}
              >
                {mark(f.free)}
              </div>
              <div style={{ padding: "12px 8px", textAlign: "center" }}>{mark(f.pro)}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderWhyUpgrade = () => {
    if (isPro) return null
    return (
      <div
        style={{
          padding: "16px",
          backgroundColor: "#f8fdf9",
          border: "1px solid #d1e7dd",
          borderRadius: "10px",
          marginBottom: "24px"
        }}
      >
        <h4
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#062013",
            margin: "0 0 12px 0"
          }}
        >
          Why upgrade?
        </h4>
        <div style={{ fontSize: "11px", color: "#062013", lineHeight: 1.5 }}>
          <div style={{ marginBottom: "4px" }}>• Export multiple tables at once</div>
          <div style={{ marginBottom: "4px" }}>• Enable Google Drive and Sheets integration</div>
          <div style={{ marginBottom: "4px" }}>• Unlock formulas for summaries</div>
          <div>• Get faster priority support</div>
        </div>
      </div>
    )
  }

  const renderSupport = () => {
    return (
      <div
        style={{
          textAlign: "center",
          paddingTop: "16px",
          borderTop: "1px solid #e5e7eb"
        }}
      >
        <div
          style={{
            fontSize: "12px",
            color: "#6b7280"
          }}
        >
          Questions about billing?{" "}
          <span
            style={{
              color: "#1B9358",
              cursor: "pointer",
              textDecoration: "underline"
            }}
            onClick={() =>
              chrome.tabs.create({ url: "mailto:hello@tablexport.com" })
            }
          >
            Contact hello@tablexport.com
          </span>
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div style={{ padding: "20px" }}>
        {renderHeader()}
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "#6b7280"
          }}
        >
          <div style={{ fontSize: "14px" }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px" }}>
      {renderHeader()}
      {renderCurrentPlanCard()}
      {!isPro && (
        <button
          onClick={onUpgradeClick}
          style={{
            backgroundColor: "#1B9358",
            color: "white",
            border: "1px solid #157347",
            borderRadius: "8px",
            fontSize: "12px",
            padding: "10px 12px",
            cursor: "pointer",
            marginBottom: "16px"
          }}
        >
          Upgrade to Pro
        </button>
      )}
      {renderComparisonTable()}
      {renderWhyUpgrade()}
      {renderSupport()}
    </div>
  )
}