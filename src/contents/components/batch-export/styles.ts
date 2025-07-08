// Import CSS files as text - this will need to be handled by the build system
// For now, we'll include the styles as strings until we can properly import CSS

const MODAL_STYLES = `
/* Batch Export Modal Styles */

/* Custom checkbox styles */
input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border: 1px solid #1B9358;
  border-radius: 2px;
  margin: 0;
  cursor: pointer;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
  background: white;
}

input[type="checkbox"]:checked {
  background: #1B9358;
  border-color: #1B9358;
}

input[type="checkbox"]:hover {
  opacity: 0.5;
}

input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background-image: url('data:image/svg+xml;utf8,<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.01208 7.28515L5.00408 11.2771L12.9881 2.72287" stroke="white" stroke-width="1.71424" stroke-linecap="round" stroke-linejoin="round"/></svg>');
  background-repeat: no-repeat;
  background-position: center;
}

/* Section Heading */
.section-heading {
  font-size: 18px;
  font-weight: 600;
  color: #062013;
  margin: 0 0 16px 0;
}

/* Table Preview Styles */
.table-item {
  border: 1px solid #CDD2D0;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.table-item:hover {
  border-color: #CDD2D0;
}

.table-item.selected {
  border-color: #CDD2D0;
  background: white;
}

.table-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #062013;
}

.table-stats {
  font-size: 14px;
  font-weight: normal;
  color: #829089;
}

.table-preview {
  font-size: 14px;
  font-weight: normal;
  color: #062013;
  margin-bottom: 12px;
  font-family: monospace;
}

.custom-name-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #1B9358;
  border-radius: 4px;
  font-size: 14px;
  color: #062013;
  background: white !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-name-input::placeholder {
  color: #CDD2D0;
  font-size: 14px;
  font-weight: normal;
}

.custom-name-input:focus {
  outline: none;
  border-color: #1B9358;
  border-radius: 4px;
}

/* Mode Radio Group Styles */
.mode-radio-group {
  margin-bottom: 20px;
}

.mode-radio-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-radio-option {
  display: flex;
  padding: 16px;
  border: 1px solid #CDD2D0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
}

.mode-radio-option:hover:not(.disabled) {
  border-color: #1B9358;
  opacity: 0.5;
}

.mode-radio-option.selected {
  border-color: #1B9358;
}

.mode-radio-input {
  display: none;
}

.mode-radio-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.mode-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.mode-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-name {
  font-size: 16px;
  font-weight: 600;
  color: #062013;
}

.mode-desc {
  font-size: 14px;
  color: #829089;
}

/* Destination Radio Group Styles */
.destination-radio-group {
  margin-top: 20px;
}

.destination-radio-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.destination-radio-option {
  display: flex;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.destination-radio-option:hover:not(.disabled) {
  border-color: #1B9358 !important;
  opacity: 0.5;
}

.destination-radio-option.disabled {
  cursor: not-allowed;
}

.destination-radio-input {
  display: none;
}

.destination-radio-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.destination-icon {
  display: flex;
  align-items: center;
}

.destination-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.destination-name {
  font-size: 16px;
  font-weight: 600;
  color: #062013;
}

.destination-desc {
  font-size: 14px;
  color: #829089;
}

.destination-login-required {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.login-required-text {
  font-size: 14px;
  color: #829089;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  gap: 30px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
}

.cancel-button,
.export-button {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cancel-button {
  background: white;
  border: 1.5px solid #CDD2D0;
  color: #062013;
}

.cancel-button:hover {
  opacity: 0.5;
}

.export-button {
  background: #1B9358;
  border: none;
  color: white;
}

.export-button:hover:not(:disabled) {
  opacity: 0.5;
}

.export-button:disabled {
  background: #CDD2D0;
  cursor: not-allowed;
}

/* Checkbox label styles */
.remember-format-label {
  font-size: 14px;
  font-weight: 400;
  color: #062013;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.remember-format-label span,
.table-checkbox-label span,
.analytics-type-label span,
.table-merger-toggle-label span,
.select-all-label span {
  color: #062013;
}

/* Update specific checkbox containers */
.format-preferences {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 4px;
}

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
  color: var(--color-text-main);
}

/* Only fix text visibility for main content areas, not buttons */
#tablexport-batch-modal .modal-body label span:not(.analytics-title),
#tablexport-batch-modal .section-label,
#tablexport-batch-modal .mode-name,
#tablexport-batch-modal .mode-description,
#tablexport-batch-modal .option-label,
#tablexport-batch-modal .format-label {
  color: var(--color-text-main) !important;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.modal-title {
  margin: 0;
  font-size: 25px;
  font-weight: 700;
  color: #062013;
  text-align: center;
}

.close-button {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 0;
  width: 25px;
  height: 25px;
  cursor: pointer;
  color: #062013;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1);
}

.close-button:hover {
  opacity: 0.5;
}

.close-button svg {
  width: 25px;
  height: 25px;
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
  font-size: 14px;
  font-weight: 400;
  color: #062013;
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
  border: 1px solid #1B9358;
  border-radius: 4px;
  font-size: 12px;
  background: white !important;
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
  background: white !important;
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

/* Destination Selector Styles */
.destination-selector {
  margin-bottom: 20px;
}

.destination-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.destination-option {
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

.destination-option:hover:not(.disabled) {
  border-color: #1B9358;
  background: #f8fdf9;
}

.destination-option.selected {
  border-color: #1B9358;
  background: #f0fdf4;
  box-shadow: 0 0 0 1px #1B9358;
}

.destination-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f9fafb;
}

.destination-radio {
  margin-top: 2px;
}

.destination-content {
  flex: 1;
}

.destination-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.destination-icon {
  font-size: 16px;
}

.destination-name {
  font-weight: 500;
  color: #1f2937;
}

.auth-required {
  font-size: 11px;
  color: #dc2626;
  background: #fef2f2;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}

.destination-description {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

  /* Destination radio group */
  .destination-radio-group {
    margin-bottom: 20px;
  }
  .destination-radio-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .destination-radio-option {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    background: white;
    border-radius: 12px;
    border: 1.5px solid #CDD2D0;
    padding: 20px 24px;
    cursor: pointer;
    transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), background 0.2s, border 0.2s;
    font-size: 14px;
    font-weight: 400;
    color: #062013;
    position: relative;
    margin: 0;
    min-width: 0;
    flex: none;
    user-select: none;
  }
  .destination-radio-option.selected {
    background: #D2F2E2;
    border: none;
  }
  .destination-radio-option.disabled {
    background: #F3F4F3;
    border: 1.5px solid #CDD2D0;
    cursor: not-allowed;
    opacity: 0.7;
  }
  .destination-radio-option:hover:not(.disabled) {
    opacity: 0.5;
  }
  .destination-radio-input {
    display: none;
  }
  .destination-radio-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .destination-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  .destination-name {
    font-size: 14px;
    font-weight: 400;
    color: #062013;
  }
  .destination-login-required {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    font-size: 16px;
    color: #062013;
    font-weight: 500;
  }
  .login-required-text {
    font-size: 16px;
    font-weight: 500;
    color: #062013;
    margin-left: 2px;
  }
  .destination-desc {
    display: block;
    font-size: 14px;
    font-weight: 400;
    color: #062013;
    margin-top: 8px;
    opacity: 0.6;
  }

  /* Mode radio group */
  .mode-radio-group {
    margin-bottom: 20px;
  }
  .mode-radio-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .mode-radio-option {
    display: flex;
    align-items: flex-start;
    background: white;
    border-radius: 12px;
    border: 1.5px solid #CDD2D0;
    padding: 20px 24px;
    cursor: pointer;
    transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), background 0.2s, border 0.2s;
    font-size: 14px;
    font-weight: 400;
    color: #062013;
    position: relative;
    margin: 0;
    min-width: 0;
    flex: none;
    user-select: none;
  }
  .mode-radio-option.selected {
    background: #D2F2E2;
    border: none;
  }
  .mode-radio-option:hover:not(.disabled) {
    opacity: 0.5;
  }
  .mode-radio-input {
    display: none;
  }
  .mode-radio-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }
  .mode-name {
    font-size: 14px;
    font-weight: 400;
    color: #062013;
  }
  .mode-desc {
    font-size: 14px;
    font-weight: 400;
    color: #062013;
    opacity: 0.85;
  }

  /* Tabs */
  .tab {
    font-size: 16px;
    font-weight: 600;
    color: #062013;
  }
`

const SPINNER_STYLES = `
/* Export Spinner Styles */

#tablexport-export-spinner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.spinner-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.spinner-content {
  background: white;
  border-radius: 16px;
  padding: 40px 48px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
  max-width: 320px;
  width: 90vw;
}

.spinner-icon {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner-circle {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner-text {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
  line-height: 1.4;
}

.spinner-subtext {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
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

// Стили для inline SVG-иконок
const iconStyles = `
  .format-icon svg,
  .destination-icon svg,
  .mode-icon svg {
    width: 24px;
    height: 24px;
    fill: #062013;
    transition: fill 0.2s;
    vertical-align: middle;
    display: inline-block;
  }
  .selected .format-icon svg,
  .selected .destination-icon svg,
  .selected .mode-icon svg {
    fill: #fff;
  }
  /* Исправление: текст внутри выбранного варианта всегда основной */
  .format-radio-option.selected .format-name,
  .format-radio-option.selected .format-radio-content,
  .format-radio-option.selected {
    color: #062013 !important;
  }
`

// Кастомный селектор формата
const customFormatSelectorStyles = `
  .custom-format-selector {
    position: relative;
    width: 100%;
    margin-bottom: 20px;
  }
  .custom-format-selected {
    display: flex;
    align-items: center;
    background: #F3F4F3;
    border-radius: 10px;
    padding: 20px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
    transition: box-shadow 0.2s;
    outline: none;
  }
  .custom-format-selected:focus {
    box-shadow: 0 0 0 2px #1B9358;
  }
  .custom-format-selected .format-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
  }
  .custom-format-selected .chevron-icon {
    margin-left: auto;
    display: flex;
    align-items: center;
  }
  .custom-format-dropdown {
    display: none;
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    background: #F3F4F3;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    z-index: 10;
    margin-top: 4px;
    overflow: hidden;
  }
  .custom-format-selector.open .custom-format-dropdown {
    display: block;
  }
  .custom-format-option {
    display: flex;
    align-items: center;
    padding: 20px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .custom-format-option .format-icon {
    margin-right: 8px;
    display: flex;
    align-items: center;
  }
  .custom-format-option.selected {
    background: #e0e2e0;
  }
  .custom-format-option:hover {
    background: #e8eae8;
  }
  .custom-format-selected,
  .custom-format-option {
    color: #062013;
  }
`

const formatRadioGroupStyles = `
  .format-radio-group {
    margin-bottom: 20px;
  }
  .format-radio-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  .format-radio-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }
  .format-radio-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .format-radio-option {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 8px;
    border: 1.5px solid #CDD2D0;
    padding: 12px 16px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    font-weight: 500;
    font-size: 16px;
    color: #062013;
    box-sizing: border-box;
    position: relative;
    user-select: none;
  }
  .format-radio-option.grid-item {
    width: 100%;
  }
  .format-radio-option.full-width {
    width: 100%;
  }
  .format-radio-option.selected {
    background: #D2F2E2;
    border: none;
  }
  .format-radio-option:hover:not(.disabled) {
    opacity: 0.5;
  }
  .format-radio-option.disabled {
    cursor: not-allowed;
    opacity: 0.5 !important;
    background-color: #f8f9fa !important;
  }
  .format-radio-option.disabled:hover {
    border-color: #CDD2D0 !important;
  }
  .format-radio-option.disabled .format-name {
    color: #9ca3af !important;
  }
  .format-radio-input {
    display: none;
  }
  .format-radio-content {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
  .format-icon {
    display: flex;
    align-items: center;
  }
  .format-name {
    font-size: 16px;
    font-weight: 500;
    color: #062013;
  }
  .format-disabled-notice {
    font-size: 14px !important;
    color: #829089 !important;
    margin-top: 4px;
    margin-left: 16px;
    opacity: 1 !important;
  }
`

/**
 * Adds CSS styles for the modal
 */
export const addModalStyles = (): void => {
  const styleId = "tablexport-modal-styles"
  
  // Remove existing styles if present
  const existingStyles = document.getElementById(styleId)
  if (existingStyles) {
    existingStyles.remove()
  }
  
  // Create style element
  const style = document.createElement("style")
  style.id = styleId
  style.textContent = `
    ${MODAL_STYLES}
    ${iconStyles}
    ${customFormatSelectorStyles}
    ${formatRadioGroupStyles}
    
    /* Common Radio Group Styles */
    .mode-radio-group,
    .destination-radio-group {
      margin-bottom: 24px;
      width: 100%;
    }
    
    /* Export Mode Radio Options - Vertical */
    .mode-radio-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }
    
    .mode-radio-option {
      flex: 1;
      display: flex;
      padding: 16px;
      border: 1px solid #CDD2D0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      background: white;
      width: 100%;
    }
    
    /* Destination Radio Options - Vertical */
    .destination-radio-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .destination-radio-option {
      display: flex;
      padding: 16px;
      border: 1px solid #CDD2D0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      background: white;
    }
    
    .mode-radio-option:hover:not(.disabled),
    .destination-radio-option:hover:not(.disabled) {
      border-color: #1B9358;
    }
    
    .mode-radio-option.selected,
    .destination-radio-option.selected {
      border: none;
      background: #D2F2E2;
    }
    
    /* Disabled mode options */
    .mode-radio-option.disabled {
      opacity: 0.5 !important;
      cursor: not-allowed !important;
      pointer-events: none !important;
      background: #f9fafb !important;
    }
    
    .mode-radio-option.disabled:hover {
      border-color: #CDD2D0 !important;
      background: #f9fafb !important;
    }
    
    .mode-radio-input,
    .destination-radio-input {
      display: none;
    }
    
    /* Mode radio content - horizontal layout */
    .mode-radio-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      width: 100%;
    }
    
    /* Destination radio content - without width 100% */
    .destination-radio-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: auto;
    }
    
    .mode-icon,
    .destination-icon {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .mode-icon svg,
    .destination-icon svg {
      width: 24px;
      height: 24px;
    }
    
    .mode-text,
    .destination-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .mode-name,
    .destination-name {
      font-size: 16px;
      font-weight: 600;
      color: #062013;
      line-height: 24px;
    }
    
    .mode-desc,
    .destination-desc {
      font-size: 14px;
      font-weight: 400;
      color: #062013;
      line-height: 20px;
    }
    
    /* Destination Specific Styles */
    .destination-radio-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .destination-login-required {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      margin-left: 0px;
      opacity: 1 !important;
    }
    
    .login-required-icon {
      display: flex;
      align-items: center;
      opacity: 1 !important;
    }
    
    .login-required-icon svg {
      width: 14px;
      height: 14px;
      opacity: 1 !important;
    }
    
    .login-required-text {
      font-size: 14px;
      font-weight: 400;
      color: #829089;
      opacity: 1 !important;
    }
    
    /* Section Heading */
    .section-heading {
      font-size: 18px;
      font-weight: 600;
      color: #062013;
      margin: 0 0 16px 0;
      line-height: 24px;
    }
    
    /* Checkbox Styles */
    .table-checkbox-label,
    .select-all-label,
    .analytics-type-label,
    .analytics-toggle-label,
    .table-merger-toggle-label,
    .remember-format-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      color: #062013;
    }
    
    /* Table Preview Styles */
    .table-item {
      border: 1px solid #CDD2D0;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .table-item:hover {
      border-color: #CDD2D0;
    }
    
    .table-item.selected {
      border-color: #CDD2D0;
      background: white;
    }
    
    .table-title {
      font-size: 16px;
      font-weight: 600;
      color: #062013;
    }
    
    .table-stats {
      font-size: 14px;
      color: #829089;
    }
    
    /* Analytics Specific Override Styles */
    .analytics-options {
      padding: 20px !important;
      border: 1px solid #CDD2D0 !important;
      border-radius: 10px !important;
      margin-bottom: 20px !important;
    }
    
    .analytics-title {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #062013 !important;
      background: transparent !important;
    }
    
    #tablexport-batch-modal .analytics-title {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #062013 !important;
      background: transparent !important;
    }
    
    .analytics-types {
      display: flex !important;
      flex-direction: column !important;
      gap: 16px !important;
      margin-bottom: 12px !important;
    }
    
    .analytics-type-label {
      margin-bottom: 0 !important;
      align-items: center !important;
      line-height: 1.2 !important;
    }
    
    .analytics-type-label input[type="checkbox"] {
      margin-top: 0 !important;
    }
    
    .analytics-type-name {
      line-height: 1.2 !important;
    }
  `
  
  // Add styles to document
  document.head.appendChild(style)
  
  // Add additional override styles with highest priority
  const overrideStyle = document.createElement("style")
  overrideStyle.id = "tablexport-analytics-override"
  overrideStyle.textContent = `
    /* Analytics Override Styles - Highest Priority */
    span.analytics-title,
    #tablexport-batch-modal span.analytics-title,
    #tablexport-batch-modal .analytics-toggle-text span.analytics-title,
    .analytics-toggle-text span.analytics-title,
    .analytics-title {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #062013 !important;
      background: transparent !important;
    }
    
    #tablexport-batch-modal .analytics-options,
    .analytics-options {
      padding: 20px !important;
      border: 1px solid #CDD2D0 !important;
      border-radius: 10px !important;
      margin-bottom: 20px !important;
    }
    
    #tablexport-batch-modal .analytics-types,
    .analytics-types {
      display: flex !important;
      flex-direction: column !important;
      gap: 16px !important;
      margin-bottom: 12px !important;
      grid-template-columns: none !important;
    }
    
    #tablexport-batch-modal .analytics-type-label,
    .analytics-type-label {
      margin-bottom: 0 !important;
      margin-top: 0 !important;
      align-items: center !important;
      line-height: 1.2 !important;
    }
    
    .analytics-type-label input[type="checkbox"] {
      margin-top: 0 !important;
    }
    
    .analytics-type-name {
      line-height: 1.2 !important;
    }
    
    #tablexport-batch-modal .analytics-info-text,
    .analytics-info-text {
      font-size: 12px !important;
      color: #062013 !important;
      line-height: 1.4 !important;
    }
    
    #tablexport-batch-modal .analytics-description,
    .analytics-description {
      font-size: 12px !important;
      color: #062013 !important;
      line-height: 1.4 !important;
      margin-bottom: 16px !important;
    }
  `
  document.head.appendChild(overrideStyle)
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
