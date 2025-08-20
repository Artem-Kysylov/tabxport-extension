import React from "react"

import { version } from "../../../../package.json"

export const HelpTab: React.FC = () => {
  const handleLinkClick = (url: string) => {
    chrome.tabs.create({ url })
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#062013',
          margin: '0 0 24px 0'
        }}
      >
        Help & Support
      </h2>
      
      {/* Documentation */}
      <div style={{ marginBottom: '24px' }}>
        <h3 
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#062013',
            margin: '0 0 8px 0'
          }}
        >
          Documentation
        </h3>
        <p 
          style={{
            fontSize: '12px',
            fontWeight: 'normal',
            color: '#062013',
            margin: '0 0 16px 0'
          }}
        >
          Learn how to export tables and which formats are supported
        </p>
        <button
          onClick={() => handleLinkClick("https://tabxport.com/docs")}
          style={{
            width: '100%',
            background: 'white',
            border: '1.5px solid #CDD2D0',
            color: '#062013',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          <div 
            style={{ width: '16px', height: '16px' }}
            dangerouslySetInnerHTML={{
              __html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M14.6225 0.927136C14.6225 0.849853 14.5918 0.775736 14.5372 0.721089C14.4825 0.666443 14.4084 0.635742 14.3311 0.635742H6.17213C5.32202 0.635742 4.50673 0.973446 3.90562 1.57456C3.3045 2.17568 2.9668 2.99097 2.9668 3.84107V20.1591C2.9668 21.0092 3.3045 21.8245 3.90562 22.4256C4.50673 23.0267 5.32202 23.3644 6.17213 23.3644H17.8279C18.678 23.3644 19.4933 23.0267 20.0944 22.4256C20.6955 21.8245 21.0332 21.0092 21.0332 20.1591V8.67471C21.0332 8.59743 21.0025 8.52331 20.9479 8.46866C20.8932 8.41402 20.8191 8.38332 20.7418 8.38332H15.4967C15.2649 8.38332 15.0425 8.29122 14.8786 8.12728C14.7146 7.96333 14.6225 7.74098 14.6225 7.50914V0.927136ZM15.4967 12.2915C15.7286 12.2915 15.9509 12.3836 16.1149 12.5475C16.2788 12.7115 16.3709 12.9338 16.3709 13.1657C16.3709 13.3975 16.2788 13.6199 16.1149 13.7838C15.9509 13.9477 15.7286 14.0399 15.4967 14.0399H8.50328C8.27143 14.0399 8.04908 13.9477 7.88514 13.7838C7.7212 13.6199 7.6291 13.3975 7.6291 13.1657C7.6291 12.9338 7.7212 12.7115 7.88514 12.5475C8.04908 12.3836 8.27143 12.2915 8.50328 12.2915H15.4967ZM15.4967 16.9538C15.7286 16.9538 15.9509 17.0459 16.1149 17.2098C16.2788 17.3738 16.3709 17.5961 16.3709 17.828C16.3709 18.0598 16.2788 18.2822 16.1149 18.4461C15.9509 18.61 15.7286 18.7021 15.4967 18.7021H8.50328C8.27143 18.7021 8.04908 18.61 7.88514 18.4461C7.7212 18.2822 7.6291 18.0598 7.6291 17.828C7.6291 17.5961 7.7212 17.3738 7.88514 17.2098C8.04908 17.0459 8.27143 16.9538 8.50328 16.9538H15.4967Z" fill="#1B9358"/>
<path d="M16.3711 1.30519C16.3711 1.09072 16.5961 0.954349 16.7627 1.08839C16.9042 1.20262 17.0296 1.33549 17.1392 1.48702L20.6511 6.37893C20.7303 6.49083 20.6441 6.63536 20.5066 6.63536H16.6625C16.5852 6.63536 16.5111 6.60466 16.4564 6.55001C16.4018 6.49537 16.3711 6.42125 16.3711 6.34397V1.30519Z" fill="#1B9358"/>
</svg>`
            }}
          />
          <span>Open docs</span>
        </button>
      </div>

      {/* Support */}
      <div style={{ marginBottom: '24px' }}>
        <h3 
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#062013',
            margin: '0 0 8px 0'
          }}
        >
          Support
        </h3>
        <p 
          style={{
            fontSize: '12px',
            fontWeight: 'normal',
            color: '#062013',
            margin: '0 0 8px 0'
          }}
        >
          Need help? Found a bug? Contact us here:
        </p>
        <p 
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1B9358',
            margin: '0',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            textDecoration: 'underline',
          }}
          onClick={() => handleLinkClick('mailto:hello@tablexport.com')}
        >
          hello@tablexport.com
        </p>
      </div>

      {/* Version */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-center text-sm" style={{ color: '#062013' }}>
          <span>Version: </span>
          <span className="font-mono font-medium">v{version}</span>
        </div>
      </div>
    </div>
  )
} 