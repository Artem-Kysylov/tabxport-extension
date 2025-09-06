import React from "react"

export type TabId = "settings" // "proPlan" | "help" закомментированы

interface Tab {
  id: TabId
  label: string
}

interface TabNavigationProps {
  activeTab: TabId
  onTabChange: (tabId: TabId) => void
}

const tabs: Tab[] = [
  { id: "settings", label: "Settings" },
  // { id: "proPlan", label: "Pro Plan" },
  // { id: "help", label: "Help" }
]

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  return (
    <div 
      style={{
        display: "flex",
        backgroundColor: "white"
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 600,
            color: activeTab === tab.id ? "#1B9358" : "#062013",
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            position: "relative",
            transition: "opacity 0.2s ease",
            outline: "none",
            fontFamily: "inherit"
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.opacity = "0.5"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1"
          }}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div 
              style={{
                position: "absolute",
                bottom: "0",
                left: "0",
                right: "0",
                height: "3px",
                backgroundColor: "#1B9358",
                borderRadius: "1.5px 1.5px 0 0"
              }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
