import { getUserSettings } from "../../lib/storage"
import { ChromeMessage, ChromeMessageType, TableData } from "../../types"
import { createTooltip } from "./tooltip"
import { showLimitExceededWarning } from "./limit-warning"

interface ButtonPosition {
  x: number
  y: number
  container: HTMLElement
}

interface Platform {
  isGemini: boolean
  isChatGPT: boolean
  isClaude: boolean
  isDeepSeek: boolean
}

// Хранилище для отслеживания добавленных кнопок
export const addedButtons = new Map<HTMLElement, HTMLElement>()

// Функция для поиска позиционированного контейнера
const findPositionedContainer = (element: HTMLElement): HTMLElement => {
  let container = element.parentElement
  while (container && container !== document.body) {
    const style = window.getComputedStyle(container)
    if (style.position === "relative" || style.position === "absolute") {
      return container
    }
    container = container.parentElement
  }
  return element.parentElement || document.body
}

// Функция для вычисления позиции кнопки
export const calculateButtonPosition = (
  element: HTMLElement
): ButtonPosition => {
  const rect = element.getBoundingClientRect()

  // Определяем платформу для адаптивного позиционирования
  const url = window.location.href
  const platform: Platform = {
    isGemini:
      url.includes("gemini.google.com") || url.includes("bard.google.com"),
    isChatGPT: url.includes("chat.openai.com") || url.includes("chatgpt.com"),
    isClaude: url.includes("claude.ai"),
    isDeepSeek:
      url.includes("chat.deepseek.com") || url.includes("deepseek.com")
  }

  console.log("TabXport: Element rect:", rect)
  console.log("TabXport: Platform detection:", platform)

  // Специальная логика для DeepSeek с большими таблицами
  if (platform.isDeepSeek) {
    return calculateDeepSeekButtonPosition(element, rect)
  }

  const container = findPositionedContainer(element)
  console.log(
    "TabXport: Using container:",
    container.tagName,
    container.className
  )

  const containerRect = container.getBoundingClientRect()
  const relativeX = rect.left - containerRect.left
  const relativeY = rect.top - containerRect.top

  const spaceOnLeft = rect.left
  const buttonWidth = 45

  // Унифицированная логика позиционирования с платформо-специфичными настройками
  const config = {
    spacing: platform.isGemini
      ? 12
      : platform.isChatGPT || platform.isClaude
        ? 15
        : 4,
    verticalOffset: platform.isGemini
      ? -5
      : platform.isChatGPT || platform.isClaude
        ? -2
        : -2,
    rightSpacing: platform.isGemini ? 8 : 5,
    rightVerticalOffset: platform.isGemini ? 3 : 5
  }

  // По умолчанию размещаем кнопку СЛЕВА от таблицы
  const minSpacing = platform.isChatGPT ? 18 : 10
  const position =
    spaceOnLeft >= buttonWidth + minSpacing
      ? {
          // Размещаем слева от таблицы (по умолчанию)
          x: relativeX - buttonWidth - config.spacing,
          y: relativeY + config.verticalOffset,
          container
        }
      : {
          // Размещаем справа от таблицы (только если нет места слева)
          x: rect.right - containerRect.left + config.rightSpacing,
          y: relativeY + config.rightVerticalOffset,
          container
        }

  return position
}

// Специальная функция позиционирования для DeepSeek
const calculateDeepSeekButtonPosition = (
  element: HTMLElement,
  rect: DOMRect
): ButtonPosition => {
  console.log("TabXport: Using DeepSeek-specific positioning for large tables")

  const isLargeTable =
    rect.height > 300 ||
    rect.width > 600 ||
    element.hasAttribute("data-tabxport-large-table")
  const isScrollable = element.hasAttribute("data-tabxport-scrollable")

  const viewportWidth = window.innerWidth
  const isVeryWideTable =
    rect.width > viewportWidth * 0.8 ||
    rect.right > viewportWidth - 60 ||
    element.hasAttribute("data-tabxport-very-wide")

  console.log("TabXport: Large table detected:", isLargeTable)
  console.log("TabXport: Scrollable table:", isScrollable)
  console.log("TabXport: Very wide table:", isVeryWideTable)

  let container = findPositionedContainer(element)

  if (isLargeTable) {
    const messageContainer = element.closest(
      '.message, .chat-message, .response, .assistant-message, [class*="message"], [class*="response"]'
    )
    if (messageContainer) {
      container = messageContainer as HTMLElement
      console.log(
        "TabXport: Using message container for large table:",
        container.className
      )
    }
  }

  const viewportHeight = window.innerHeight
  const tableVisibleInViewport =
    rect.top < viewportHeight &&
    rect.bottom > 0 &&
    rect.left < viewportWidth &&
    rect.right > 0

  console.log("TabXport: Table visible in viewport:", tableVisibleInViewport)

  const containerRect = container.getBoundingClientRect()
  const buttonWidth = 45
  const viewportMargin = 10

  let relativeY = rect.top - containerRect.top

  if (isScrollable && !tableVisibleInViewport) {
    const visibleTop = Math.max(rect.top, 0)
    const visibleBottom = Math.min(rect.bottom, viewportHeight)
    const visibleMiddle = (visibleTop + visibleBottom) / 2

    relativeY = visibleMiddle - containerRect.top
    console.log("TabXport: Adjusted position for scrollable table:", relativeY)
  }

  const config = {
    verticalOffset: isLargeTable ? (isScrollable ? 10 : 5) : 0
  }

  let position: ButtonPosition

  const relativeXLeft = rect.left - containerRect.left
  const spaceOnLeft = rect.left

  const spacing = isLargeTable ? (isScrollable ? 15 : 12) : 6
  const leftSpacing = isLargeTable ? (isScrollable ? 15 : 10) : 8
  const leftVerticalOffset = isLargeTable ? (isScrollable ? 12 : 8) : 5

  if (isVeryWideTable && spaceOnLeft < buttonWidth + 20) {
    const viewportBasedX = viewportMargin
    const containerBasedX = viewportBasedX - containerRect.left

    position = {
      x: Math.max(containerBasedX, relativeXLeft - buttonWidth - leftSpacing),
      y: relativeY + config.verticalOffset,
      container
    }

    console.log("TabXport: Very wide table - using left viewport positioning")
  } else {
    if (spaceOnLeft >= buttonWidth + 10) {
      position = {
        x: relativeXLeft - buttonWidth - leftSpacing,
        y: relativeY + leftVerticalOffset,
        container
      }
      console.log(
        "TabXport: DeepSeek table - placing button to the left (preferred)"
      )
    } else {
      position = {
        x: relativeXLeft + 10,
        y: relativeY + leftVerticalOffset,
        container
      }
      console.log(
        "TabXport: DeepSeek table - placing button inside table (left edge)"
      )
    }
  }

  if (position.y + buttonWidth > viewportHeight - 10) {
    position.y = viewportHeight - buttonWidth - 10
    console.log("TabXport: Adjusted Y position to fit viewport")
  }

  if (position.y < 0) {
    position.y = 10
    console.log("TabXport: Adjusted Y position to be positive")
  }

  if (isLargeTable && rect.height > 500) {
    position.y = Math.max(relativeY + 20, position.y)
    console.log("TabXport: Adjusted position for very large table")
  }

  console.log("TabXport: DeepSeek final position:", position)
  return position
}

// Функция для отправки данных в background script
const sendToBackground = async (message: ChromeMessage): Promise<any> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response)
    })
  })
}

// Функция для показа уведомлений
export const showNotification = (
  message: string,
  type: "success" | "error"
): void => {
  const notification = document.createElement("div")
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999995;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    background-color: ${type === "success" ? "#1B9358" : "#ef4444"};
  `

  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => {
    notification.style.opacity = "0"
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 300)
  }, 3000)
}

// Function to show authentication modal
export const showAuthModal = (): void => {
  // Check if modal already exists
  const existingModal = document.getElementById('tablexport-auth-container')
  if (existingModal) {
    existingModal.remove()
  }
  
  // Add styles for the modal
  const styleId = 'tablexport-auth-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* Auth Modal Styles */
      .tablexport-auth-container {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: none;
      }

      .tablexport-auth-modal {
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

      .tablexport-auth-modal.visible {
        transform: translateY(0);
        opacity: 1;
      }

      .tablexport-auth-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }

      .tablexport-auth-title {
        font-size: 18px;
        font-weight: 600;
        color: #062013;
        margin: 0;
        line-height: 1.3;
        flex: 1;
        padding-right: 12px;
      }

      .tablexport-auth-close {
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

      .tablexport-auth-close:hover {
        background-color: #f3f4f6;
      }

      .tablexport-auth-content {
        margin-bottom: 20px;
      }

      .tablexport-auth-message {
        font-size: 14px;
        color: #4b5563;
        line-height: 1.5;
        margin-bottom: 20px;
      }

      /* Стили для блока аутентификации из попапа */
      .tablexport-auth-block {
        background: #F8F9FA;
        border: 1px solid #CDD2D0;
        border-radius: 10px;
        padding: 20px;
      }

      .tablexport-auth-block-title {
        font-size: 14px;
        font-weight: 600;
        color: #062013;
        margin: 0 0 12px 0;
        text-align: center;
      }

      .tablexport-auth-block-description {
        font-size: 12px;
        font-weight: normal;
        color: #062013;
        margin: 0 0 20px 0;
        text-align: center;
      }

      .tablexport-auth-block-button {
        width: 100%;
        background: white;
        border: 1.5px solid #CDD2D0;
        color: #062013;
        padding: 20px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .tablexport-auth-block-button:hover {
        opacity: 0.5;
      }

      .tablexport-auth-block-privacy {
        font-size: 10px;
        color: #062013;
        margin: 0;
        text-align: center;
      }

      @media (max-width: 480px) {
        .tablexport-auth-container {
          bottom: 16px;
          left: 16px;
          right: 16px;
        }

        .tablexport-auth-modal {
          width: 100%;
          max-width: none;
          padding: 20px;
        }
      }
    `
    document.head.appendChild(style)
  }

  // Create HTML for the modal with popup-style auth block
  const modalHTML = `
    <div class="tablexport-auth-container" id="tablexport-auth-container" style="display: none;">
      <div class="tablexport-auth-modal" id="tablexport-auth-modal">
        <div class="tablexport-auth-header">
          <h3 class="tablexport-auth-title">
            Authentication Required
          </h3>
          <button class="tablexport-auth-close" id="tablexport-auth-close" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="tablexport-auth-content">
          <p class="tablexport-auth-message">
            You need to authenticate to export tables to Google Drive. Please click the button below to sign in with your Google account.
          </p>
          
          <!-- Блок аутентификации из попапа -->
          <div class="tablexport-auth-block">
            <h3 class="tablexport-auth-block-title">Sign in to TableXport</h3>
            <p class="tablexport-auth-block-description">
              Connect your Google account to:
              • Export tables to Google Drive
              • Manage your subscription (Free & Pro plans)
              • Unlock all supported export formats: Excel, CSV, DOCX, PDF, Google Sheets
            </p>
            
            <button class="tablexport-auth-block-button" id="tablexport-auth-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_192_42)">
                  <mask id="mask0_192_42" style="mask-type: luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                    <path d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z" fill="white"/>
                  </mask>
                  <g mask="url(#mask0_192_42)">
                    <path d="M-0.354736 18.8343V5.16528L8.5827 11.9998L-0.354736 18.8343Z" fill="#FBBC05"/>
                  </g>
                  <mask id="mask1_192_42" style="mask-type: luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                    <path d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z" fill="white"/>
                  </mask>
                  <g mask="url(#mask1_192_42)">
                    <path d="M-0.354736 5.16537L8.5827 11.9999L12.2628 8.79293L24.8804 6.74256V-0.617676H-0.354736V5.16537Z" fill="#EA4335"/>
                  </g>
                  <mask id="mask2_192_42" style="mask-type: luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                    <path d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z" fill="white"/>
                  </mask>
                  <g mask="url(#mask2_192_42)">
                    <path d="M-0.354736 18.8344L15.4172 6.74256L19.5705 7.26829L24.8804 -0.617676V24.6173H-0.354736V18.8344Z" fill="#34A853"/>
                  </g>
                  <mask id="mask3_192_42" style="mask-type: luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                    <path d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z" fill="white"/>
                  </mask>
                  <g mask="url(#mask3_192_42)">
                    <path d="M24.8806 24.6173L8.58291 11.9998L6.47998 10.4226L24.8806 5.16528V24.6173Z" fill="#4285F4"/>
                  </g>
                </g>
                <defs>
                  <clipPath id="clip0_192_42">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              <span>Sign in with Google</span>
            </button>
            
            <p class="tablexport-auth-block-privacy">
              We only access files created by TableXport. Your data stays private
            </p>
          </div>
        </div>
      </div>
    </div>
  `

  // Add the modal to the DOM
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = modalHTML
  const modalContainer = tempDiv.firstElementChild as HTMLElement
  document.body.appendChild(modalContainer)

  // Show container
  const container = document.getElementById('tablexport-auth-container')
  if (container) {
    container.style.display = 'block'
  }

  // Animation for appearance
  const modal = document.getElementById('tablexport-auth-modal')
  setTimeout(() => {
    if (modal) {
      modal.classList.add('visible')
    }
  }, 50)

  // Close handler
  const closeBtn = document.getElementById('tablexport-auth-close')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) {
        modal.classList.remove('visible')
        setTimeout(() => {
          const container = document.getElementById('tablexport-auth-container')
          if (container) {
            container.remove()
          }
        }, 300)
      }
    })
  }

  // Auth button handler
  const authBtn = document.getElementById('tablexport-auth-button')
  if (authBtn) {
    authBtn.addEventListener('click', () => {
      // Send message to background script for authorization
      chrome.runtime.sendMessage({ type: 'GOOGLE_SIGN_IN' }, (response) => {
        console.log('Auth response:', response)
        // Close the modal after sending the authorization request
        if (modal) {
          modal.classList.remove('visible')
          setTimeout(() => {
            const container = document.getElementById('tablexport-auth-container')
            if (container) {
              container.remove()
            }
          }, 300)
        }
      })
    })
  }
}

// Обработчик экспорта таблицы (прямой экспорт)
const handleExport = async (
  tableData: TableData,
  button: HTMLButtonElement
): Promise<void> => {
  try {
    console.log("🔍 TabXport: Starting export with tableData:", tableData)

    const originalText = button.innerHTML
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
    `
    button.disabled = true

    console.log("🔍 TabXport: Getting user settings...")
    const settings = await getUserSettings()
    console.log("🔍 TabXport: User settings loaded:", settings)
    console.log("🔍 TabXport: Default destination:", settings.defaultDestination)
    console.log("🔍 TabXport: Default format:", settings.defaultFormat)

    const message: ChromeMessage = {
      type: ChromeMessageType.EXPORT_TABLE,
      payload: {
        tableData,
        options: {
          format: settings.defaultFormat,
          includeHeaders: true,
          destination: settings.defaultDestination
        }
      }
    }

    console.log("🔍 TabXport: Sending message to background:", message)
    console.log("🔍 TabXport: Message payload destination:", message.payload.options.destination)
    const result = await sendToBackground(message)
    console.log("🔍 TabXport: Background response:", result)

    if (result?.success) {
      if (result.googleDriveLink) {
        console.log("✅ TabXport: Google Drive export successful!")
        console.log("🔗 TabXport: Google Drive link:", result.googleDriveLink)
        showNotification("Table exported to Google Drive successfully!", "success")
        
        // Trigger post-export survey
        import("../../utils/survey-integration").then(({ triggerPostExportSurvey, createExportContext }) => {
          const exportContext = createExportContext(
            settings.defaultFormat,
            1,
            'google_drive',
            'single',
            window.location.hostname
          )
          triggerPostExportSurvey(exportContext)
        }).catch(console.error)
      } else {
        console.log("📥 TabXport: Download export successful!")
        showNotification("Table exported successfully!", "success")
        
        // Trigger post-export survey
        import("../../utils/survey-integration").then(({ triggerPostExportSurvey, createExportContext }) => {
          const exportContext = createExportContext(
            settings.defaultFormat,
            1,
            'download',
            'single',
            window.location.hostname
          )
          triggerPostExportSurvey(exportContext)
        }).catch(console.error)
      }
    } else {
      console.error("❌ TabXport: Export failed:", result)
      
      // Проверяем, если это ошибка лимита - отключено
      if (
        result?.limitExceeded ||
        result?.error?.includes("daily limit") ||
        result?.error?.includes("Daily export")
      ) {
        // Пропускаем показ предупреждения о лимите
        console.log("✅ TabXport: Bypassing limit exceeded warning")
        // showLimitExceededWarning() - отключено
      } 
      // Проверяем, если это ошибка аутентификации
      else if (result?.error?.includes("Authentication required")) {
        // Показываем модальное окно аутентификации
        showAuthModal()
      } 
      else {
        showNotification(result?.error || "Export failed", "error")
      }
    }
  } catch (error) {
    console.error("❌ TabXport: Export error:", error)
    showNotification("Export failed. Please try again.", "error")
  } finally {
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    `
    button.disabled = false
  }
}

// Функция для создания кнопки экспорта
export const createExportButton = (
  tableData: TableData,
  position: ButtonPosition
): HTMLElement => {
  const button = document.createElement("button")

  // Определяем платформу СНАЧАЛА
  const isChatGPT = window.location.href.includes("chat.openai.com")
  const isDeepSeek =
    window.location.href.includes("chat.deepseek.com") ||
    window.location.href.includes("deepseek.com")
  const isGemini = 
    window.location.href.includes("gemini.google.com") || 
    window.location.href.includes("bard.google.com")

  // Создаем SVG с платформо-специфичными стилями
  const svgStyles = isGemini 
    ? 'style="pointer-events: none !important; display: block !important; flex-shrink: 0 !important;"'
    : 'style="pointer-events: none !important;"'
    
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${svgStyles}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  `

  // Создаем тултип
  const tooltip = createTooltip({
    text: "Export this Table",
    targetElement: button
  })

  // Базовые стили
  let cssText = `
    position: absolute !important;
    top: ${position.y}px !important;
    left: ${position.x}px !important;
    z-index: 999990 !important;
    background-color: #1B9358 !important;
    color: white !important;
    border: none !important;
    border-radius: 100% !important;
    padding: 0 !important;
    font-size: 0 !important;
    cursor: pointer !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: background-color 0.2s ease, border 0.2s ease !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    width: 45px !important;
    height: 45px !important;
    min-width: 45px !important;
    min-height: 45px !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: all !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    touch-action: manipulation !important;
    -webkit-tap-highlight-color: transparent !important;
    -webkit-font-smoothing: antialiased !important;
  `

  // Дополнительные стили для разных платформ
  if (isGemini) {
    cssText += `
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      isolation: isolate !important;
    `
  } else if (isChatGPT || isDeepSeek) {
    cssText += `
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
    `
  }

  button.style.cssText = cssText

  // Добавляем дополнительный контейнер для улучшения обработки событий
  const buttonWrapper = document.createElement("div")
  buttonWrapper.style.cssText = `
    position: absolute !important;
    top: ${position.y}px !important;
    left: ${position.x}px !important;
    width: 45px !important;
    height: 45px !important;
    z-index: 999990 !important;
    pointer-events: all !important;
    touch-action: manipulation !important;
  `

  buttonWrapper.appendChild(button)
  button.style.position = "relative"
  button.style.top = "0"
  button.style.left = "0"

  button.title = `Export ${tableData.source} table to Excel/CSV`

  // Обработчики событий
  buttonWrapper.addEventListener("mouseenter", () => {
    if (isGemini) {
      // Специальная обработка для Gemini - только меняем фон на прозрачный
      button.style.backgroundColor = "transparent !important"
      button.style.border = "1px solid #1B9358 !important"
      const svg = button.querySelector("svg")
      if (svg) {
        svg.style.stroke = "#1B9358 !important"
      }
    } else if (isDeepSeek) {
      button.style.backgroundColor = "transparent"
      button.style.border = "2px solid #1B9358"
      button.style.transform = "none"
      const svg = button.querySelector("svg")
      if (svg) {
        svg.style.stroke = "#1B9358"
        svg.style.transform = "none"
      }
    } else {
      button.style.backgroundColor = "transparent"
      button.style.border = "1px solid #1B9358"
      const svg = button.querySelector("svg")
      if (svg) {
        svg.style.stroke = "#1B9358"
      }
    }
    tooltip.show()
  })

  buttonWrapper.addEventListener("mouseleave", () => {
    if (isGemini) {
      // Специальная обработка для Gemini - возвращаем зеленый фон
      button.style.backgroundColor = "#1B9358 !important"
      button.style.border = "none !important"
      const svg = button.querySelector("svg")
      if (svg) {
        svg.style.stroke = "white !important"
      }
    } else if (isDeepSeek) {
      button.style.backgroundColor = "#1B9358"
      button.style.border = "none"
      button.style.transform = "none"
      const svg = button.querySelector("svg")
      if (svg) {
        svg.style.stroke = "#FFFFFF"
        svg.style.transform = "none"
      }
    } else {
      button.style.backgroundColor = "#1B9358"
      button.style.border = "none"
      const svg = button.querySelector("svg")
      if (svg) {
        svg.style.stroke = "white"
      }
    }
    tooltip.hide()
  })

  // Обработчик клика - прямой экспорт
  button.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    handleExport(tableData, button as HTMLButtonElement)
  })

  // Очищаем тултип при удалении кнопки
  const cleanup = () => {
    tooltip.destroy()
  }

  buttonWrapper.addEventListener("remove", cleanup)

  console.log("TabXport: Button created with direct export functionality")

  return buttonWrapper
}

// Добавляем CSS для анимации спиннера
export const addSpinnerCSS = (): void => {
  const style = document.createElement("style")
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  document.head.appendChild(style)
}

