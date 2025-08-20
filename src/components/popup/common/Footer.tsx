import React from "react"

export const Footer: React.FC = () => {
  const handleLinkClick = (url: string) => {
    chrome.tabs.create({ url })
  }

  return (
    <div 
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      {/* Email link */}
      <div 
        onClick={() => handleLinkClick('mailto:hello@tablexport.com')}
        style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#1B9358',
          textAlign: 'center',
          width: '100%',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          textDecoration: 'underline',
        }}
      >
        hello@tablexport.com
      </div>
    </div>
  )
}
