import React from "react"

interface HeaderProps {
  isSupported: boolean
}

export const Header: React.FC<HeaderProps> = ({ isSupported }) => {
  return (
    <div className="text-white p-4 relative overflow-hidden" style={{ backgroundColor: '#1B9358' }}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white bg-opacity-5 rounded-full -ml-8 -mb-8"></div>

      {/* Logo and title */}
      <div className="flex items-center space-x-3 relative z-10">
        <div>
          <h1 className="font-bold text-xl tracking-tight">TableXport</h1>
          <p className="text-sm text-emerald-100 font-medium">
            Smart AI Table Exporter
          </p>
        </div>
      </div>

      {/* Site support status */}
      {isSupported ? (
        <div className="mt-3 flex items-center space-x-3 relative z-10">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500 bg-opacity-30 text-green-100 border border-green-400 border-opacity-40">
            <div className="w-2 h-2 rounded-full bg-green-300"></div>
            <span>Supported site detected</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 relative z-10">
          <div className="text-xs text-emerald-200 font-medium">
            Navigate to supported AI chat
          </div>
        </div>
      )}

      {/* Supported platforms indicator */}
      {!isSupported && (
        <div className="mt-1 text-xs text-emerald-200 relative z-10">
          <span className="font-medium">
            ChatGPT • Claude • Gemini • DeepSeek
          </span>
        </div>
      )}
    </div>
  )
}
