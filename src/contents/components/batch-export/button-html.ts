/**
 * Generates the HTML content for the batch export button
 */

interface ButtonConfig {
  count: number;
  destination: 'download' | 'google_drive';
}

export const getButtonHTML = (count: number, destination: 'download' | 'google_drive' = 'download'): string => {
  const destinationText = destination === 'google_drive' ? 'to Google Drive' : 'to Device';
  const icon = destination === 'google_drive' ? getGoogleDriveIcon() : getDefaultIcon();
  
  return `
    <div class="tablexport-batch-container">
      <div class="tablexport-batch-icon">
        ${icon}
      </div>
      <div class="tablexport-batch-content">
        <div class="tablexport-batch-title">Export ${count} tables ${destinationText}</div>
        <div class="tablexport-batch-count">${count} tables found</div>
      </div>
      <div class="tablexport-batch-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </div>
    </div>
  `;
};

const getDefaultIcon = (): string => {
  return `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </svg>
  `;
};

const getGoogleDriveIcon = (): string => {
  return `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12.012 2.25c-3.85 0-6.71 2.42-6.71 6.03l3.76 6.52 9.45-6.52c-.45-3.61-3.31-6.03-6.5-6.03z" fill="#4285F4"/>
      <path d="M9.75 8.28L6 14.8l6.012 6.52h12.738L21 14.8 17.25 8.28H9.75z" fill="#34A853"/>
      <path d="M15.75 14.8H9L6 21.32h9.75l3.75-6.52z" fill="#EA4335"/>
      <path d="M21 14.8l-3.75 6.52H24L21 14.8z" fill="#FBBC04"/>
    </svg>
  `;
};

// Backward compatibility
export const getButtonHTMLCompat = (count: number): string => {
  return getButtonHTML(count, 'download');
};
