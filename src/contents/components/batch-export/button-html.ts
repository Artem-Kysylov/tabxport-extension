/**
 * Generates the HTML content for the batch export button
 */
export const getButtonHTML = (count: number): string => {
  return `
    <div class="tablexport-batch-container">
      <div class="tablexport-batch-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      </div>
      <div class="tablexport-batch-content">
        <div class="tablexport-batch-title">Export All Tables</div>
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