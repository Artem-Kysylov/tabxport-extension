import React from "react"

import { version } from "../../../../package.json"

export const Footer: React.FC = () => {
  const handleLinkClick = (url: string) => {
    chrome.tabs.create({ url })
  }

  return (
    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>v{version}</span>
        <div className="flex space-x-3">
          <button
            onClick={() =>
              handleLinkClick("https://github.com/tabxport/extension")
            }
            className="hover:text-gray-700 transition-colors">
            GitHub
          </button>
          <button
            onClick={() => handleLinkClick("https://tabxport.com/support")}
            className="hover:text-gray-700 transition-colors">
            Support
          </button>
        </div>
      </div>
    </div>
  )
}
