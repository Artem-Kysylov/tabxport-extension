import { getUserSettings } from "../../lib/storage"
import { ChromeMessage, ChromeMessageType, TableData } from "../../types"
import { createTooltip } from "./tooltip"

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
      showNotification(result?.error || "Export failed", "error")
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
