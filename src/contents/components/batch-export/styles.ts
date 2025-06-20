// Import CSS files as text - this will need to be handled by the build system
// For now, we'll include the styles as strings until we can properly import CSS

const MODAL_STYLES = `
/* Batch Export Modal Styles */

#tablexport-batch-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 20px;
}

.format-selector {
  margin-bottom: 20px;
}

.format-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.format-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #1f2937;
  cursor: pointer;
}

.format-select:focus {
  outline: none;
  border-color: #1B9358;
  box-shadow: 0 0 0 1px #1B9358;
}

.format-preferences {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
}

.remember-format-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  user-select: none;
}

.remember-format-checkbox {
  cursor: pointer;
}

.clear-preference-btn {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 12px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.clear-preference-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

.options-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.table-list-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.table-items {
  max-height: 300px;
  overflow-y: auto;
}

.table-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  transition: all 0.2s ease;
}

.table-item:hover {
  border-color: #1B9358;
  background: #f8fdf9;
}

.table-item.selected {
  border-color: #1B9358;
  background: #f0fdf4;
}

.table-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.table-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.table-title {
  font-weight: 500;
  color: #1f2937;
}

.table-stats {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.table-preview {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  font-family: monospace;
  background: #f9fafb;
  padding: 4px 6px;
  border-radius: 4px;
}

.custom-name-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
}

.custom-name-input:focus {
  outline: none;
  border-color: #1B9358;
  box-shadow: 0 0 0 1px #1B9358;
}

.progress-container {
  margin-top: 16px;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 6px;
  border: 1px solid #22c55e;
}

.progress-container.hidden {
  display: none;
}

.progress-label {
  font-size: 14px;
  color: #15803d;
  margin-bottom: 8px;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #dcfce7;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  transition: width 0.3s ease;
}

.zip-spinner {
  text-align: center;
  margin-top: 8px;
  font-size: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button, .export-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
}

.cancel-button:hover {
  background: #e5e7eb;
}

.export-button {
  background: linear-gradient(135deg, #1B9358, #16a085);
  border: 1px solid #1B9358;
  color: white;
}

.export-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #166d42, #138b74);
}

.export-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-mode-selector {
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.mode-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
}

.mode-option:hover:not(.disabled) {
  border-color: #1B9358;
  background: #f8fdf9;
}

.mode-option.selected {
  border-color: #1B9358;
  background: #f0fdf4;
  box-shadow: 0 0 0 1px #1B9358;
}

.mode-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
}

.mode-radio {
  margin-top: 2px;
}

.mode-content {
  flex: 1;
}

.mode-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.mode-icon {
  font-size: 16px;
}

.mode-name {
  font-weight: 500;
  color: #1f2937;
}

.mode-description {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.combined-filename-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fdf9;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
}

.combined-filename-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.combined-filename-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 12px;
}

.combined-filename-input:focus {
  outline: none;
  border-color: #1B9358;
  box-shadow: 0 0 0 1px #1B9358;
}

.combined-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-count-info {
  font-size: 14px;
  color: #374151;
}

.table-count-info.warning {
  color: #dc2626;
}

.warning-text {
  display: block;
  font-size: 12px;
  color: #dc2626;
  margin-top: 4px;
}

.format-info {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}
`

const BUTTON_STYLES = `
/* Batch Export Button Styles */

.tablexport-batch-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tablexport-batch-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.tablexport-batch-content {
  flex: 1;
}

.tablexport-batch-title {
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 2px;
}

.tablexport-batch-count {
  opacity: 0.8;
  font-size: 12px;
  line-height: 1.2;
}

.tablexport-batch-arrow {
  flex-shrink: 0;
  opacity: 0.7;
  transition: transform 0.2s ease;
}

#tablexport-batch-export-button:hover .tablexport-batch-arrow {
  transform: translateX(2px);
}
`

/**
 * Adds CSS styles for the modal
 */
export const addModalStyles = (): void => {
  const styleId = "tablexport-modal-styles"

  if (document.getElementById(styleId)) {
    return
  }

  const style = document.createElement("style")
  style.id = styleId
  style.textContent = MODAL_STYLES

  document.head.appendChild(style)
}

/**
 * Adds CSS styles for the button
 */
export const addButtonStyles = (): void => {
  const styleId = "tablexport-batch-styles"

  if (document.getElementById(styleId)) {
    return // Styles already added
  }

  const style = document.createElement("style")
  style.id = styleId
  style.textContent = BUTTON_STYLES

  document.head.appendChild(style)
}

/**
 * Removes button styles from the document
 */
export const removeButtonStyles = (): void => {
  const styleElement = document.getElementById("tablexport-batch-styles")
  if (styleElement) {
    styleElement.remove()
  }
}
