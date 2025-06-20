import React from "react"

interface HeaderProps {
  isSupported: boolean
}

export const Header: React.FC<HeaderProps> = ({ isSupported }) => {
  const extensionId = chrome.runtime.id
  return (
    <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white bg-opacity-5 rounded-full -ml-8 -mb-8"></div>

      {/* Logo and title */}
      <div className="flex items-center space-x-3 relative z-10">
        <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white border-opacity-20">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight">TableXport</h1>
          <p className="text-sm text-emerald-100 font-medium">
            AI Table Exporter
          </p>
        </div>
      </div>

      {/* Site support status */}
      <div className="mt-4 flex items-center space-x-3 relative z-10">
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            isSupported
              ? "bg-green-500 bg-opacity-30 text-green-100 border border-green-400 border-opacity-40"
              : "bg-yellow-500 bg-opacity-30 text-yellow-100 border border-yellow-400 border-opacity-40"
          }`}>
          <div
            className={`w-2 h-2 rounded-full ${isSupported ? "bg-green-300" : "bg-yellow-300"}`}></div>
          <span>
            {isSupported
              ? "Supported site detected"
              : "Navigate to supported AI chat"}
          </span>
        </div>
      </div>

      {/* Supported platforms indicator */}
      {!isSupported && (
        <div className="mt-3 flex items-center space-x-1 text-xs text-emerald-200 relative z-10">
          <span>Supports:</span>
          <span className="font-medium">
            ChatGPT • Claude • Gemini • DeepSeek
          </span>
        </div>
      )}

      {/* Extension ID for debugging */}
      <div className="mt-2 text-xs text-emerald-200 opacity-75 relative z-10">
        <span>Extension ID: </span>
        <span className="font-mono text-emerald-100 select-all">{extensionId}</span>
      </div>
    </div>
  )
}
