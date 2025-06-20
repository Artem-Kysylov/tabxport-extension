import React, { useState } from "react"

import type { TableData } from "../types"

interface ExportButtonProps {
  tableData: TableData
  onExport: (tableData: TableData) => void
  position: { x: number; y: number }
}

const ExportButton: React.FC<ExportButtonProps> = ({
  tableData,
  onExport,
  position
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isExporting) return

    setIsExporting(true)
    try {
      await onExport(tableData)
    } finally {
      setIsExporting(false)
    }
  }

  const buttonStyle: React.CSSProperties = {
    position: "absolute",
    top: `${position.y}px`,
    left: `${position.x}px`,
    zIndex: 10000,
    backgroundColor: isHovered ? "#059669" : "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: isExporting ? "not-allowed" : "pointer",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    opacity: isExporting ? 0.7 : 1,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }

  return (
    <button
      style={buttonStyle}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isExporting}
      title={`Export ${tableData.source} table to Excel/CSV`}>
      {isExporting ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          Exporting...
        </>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </>
      )}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  )
}

export default ExportButton
