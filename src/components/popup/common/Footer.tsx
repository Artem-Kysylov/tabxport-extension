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
        style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#1B9358'
        }}
      >
        support@yourdomain.com
      </div>

      {/* GitHub button */}
      <button
        onClick={() => handleLinkClick("https://github.com/tabxport/extension")}
        style={{
          background: 'white',
          border: '1.5px solid #CDD2D0',
          color: '#062013',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.5'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
      >
        <div 
          style={{ width: '12px', height: '12px' }}
          dangerouslySetInnerHTML={{
            __html: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_195_161)">
<path d="M8.00036 0.358398C3.67359 0.358398 0.165039 3.86633 0.165039 8.19371C0.165039 11.6556 2.41009 14.5926 5.52333 15.6287C5.91489 15.7012 6.05869 15.4587 6.05869 15.2517C6.05869 15.0649 6.05137 14.4476 6.04806 13.7929C3.8682 14.2669 3.40824 12.8685 3.40824 12.8685C3.05183 11.9628 2.53828 11.722 2.53828 11.722C1.82741 11.2357 2.59186 11.2457 2.59186 11.2457C3.37868 11.301 3.79299 12.0531 3.79299 12.0531C4.49181 13.251 5.62595 12.9047 6.07307 12.7045C6.14337 12.198 6.34646 11.8524 6.57051 11.6568C4.83022 11.4586 3.0007 10.7868 3.0007 7.78451C3.0007 6.92911 3.30679 6.23011 3.80804 5.68141C3.72668 5.48403 3.45851 4.68713 3.88393 3.60787C3.88393 3.60787 4.54189 3.39728 6.03921 4.41103C6.66416 4.23737 7.33447 4.15036 8.00036 4.14741C8.66624 4.15036 9.33704 4.23737 9.96323 4.41103C11.4588 3.39728 12.1158 3.60787 12.1158 3.60787C12.5423 4.68713 12.274 5.48403 12.1926 5.68141C12.695 6.23011 12.999 6.92905 12.999 7.78451C12.999 10.7939 11.166 11.4566 9.42129 11.6505C9.70231 11.8937 9.95272 12.3705 9.95272 13.1015C9.95272 14.1499 9.94362 14.9936 9.94362 15.2517C9.94362 15.4602 10.0847 15.7046 10.4819 15.6276C13.5934 14.5904 15.8356 11.6545 15.8356 8.19371C15.8356 3.86633 12.3276 0.358398 8.00036 0.358398Z" fill="#161614"/>
</g>
<defs>
<clipPath id="clip0_195_161">
<rect width="16" height="16" fill="white"/>
</clipPath>
</defs>
</svg>`
          }}
        />
        <span>GitHub</span>
      </button>
    </div>
  )
}
