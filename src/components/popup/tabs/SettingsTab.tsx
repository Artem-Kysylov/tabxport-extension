import React from "react"

import type { UserSettings } from "../../../types"
import { AuthStatus } from "../../AuthStatus"
import SettingsForm from "../../SettingsForm"

interface SettingsTabProps {
  onSettingsChange: (settings: UserSettings) => void
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  onSettingsChange
}) => {
  return (
    <div className="p-4">
      <h2 style={{
        fontSize: "16px",
        fontWeight: 600,
        color: "#062013",
        marginBottom: "16px"
      }}>
        Settings
      </h2>
      
      {/* Google Drive Authentication */}
      <AuthStatus />
      
      <SettingsForm onSettingsChange={onSettingsChange} />
    </div>
  )
}
