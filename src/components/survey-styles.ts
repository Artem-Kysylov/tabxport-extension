export const SURVEY_STYLES = `
/* Post Export Survey Styles */

.tablexport-survey-container {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10000;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: none;
}

.tablexport-survey-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 24px;
  width: 320px;
  max-width: calc(100vw - 40px);
  pointer-events: auto;
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.tablexport-survey-modal.visible {
  transform: translateY(0);
  opacity: 1;
}

.tablexport-survey-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.tablexport-survey-title {
  font-size: 16px;
  font-weight: 600;
  color: #062013;
  margin: 0;
  line-height: 1.3;
  flex: 1;
  padding-right: 12px;
}

.tablexport-survey-close {
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.tablexport-survey-close:hover {
  background-color: #f3f4f6;
}

.tablexport-survey-close svg {
  width: 16px;
  height: 16px;
}

.tablexport-survey-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tablexport-survey-option {
  position: relative;
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 14px 16px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
}

.tablexport-survey-option:hover {
  border-color: #1B9358;
  background-color: #f8fdf9;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(27, 147, 88, 0.15);
}

.tablexport-survey-option.selected {
  border-color: #1B9358;
  background-color: #f0f9ff;
  box-shadow: 0 0 0 2px rgba(27, 147, 88, 0.2);
}

.tablexport-survey-option-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tablexport-survey-option-emoji {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.tablexport-survey-option-text {
  font-size: 14px;
  color: #062013;
  line-height: 1.4;
  flex: 1;
}

.tablexport-survey-radio {
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  background: white;
  position: relative;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tablexport-survey-option:hover .tablexport-survey-radio {
  border-color: #1B9358;
}

.tablexport-survey-option.selected .tablexport-survey-radio {
  border-color: #1B9358;
  background-color: #1B9358;
}

.tablexport-survey-option.selected .tablexport-survey-radio::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
}

/* Thank You State */
.tablexport-survey-thank-you {
  text-align: center;
  padding: 20px 0;
}

.tablexport-survey-celebration {
  font-size: 48px;
  margin-bottom: 16px;
  animation: tablexport-bounce 0.6s ease-out;
}

.tablexport-survey-thank-title {
  font-size: 16px;
  font-weight: 600;
  color: #062013;
  margin: 0 0 8px 0;
}

.tablexport-survey-thank-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

/* Animations */
@keyframes tablexport-bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -12px, 0);
  }
  70% {
    transform: translate3d(0, -6px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

/* Responsive */
@media (max-width: 480px) {
  .tablexport-survey-container {
    bottom: 16px;
    left: 16px;
    right: 16px;
  }

  .tablexport-survey-modal {
    width: 100%;
    max-width: none;
    padding: 20px;
  }

  .tablexport-survey-title {
    font-size: 15px;
  }

  .tablexport-survey-option-text {
    font-size: 13px;
  }
}
` 