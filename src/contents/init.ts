import {
  scanAndProcessTables,
  setupMutationObserver
} from "./components/dom-observer"
import { addSpinnerCSS } from "./components/export-button"

// Функция для проверки поддерживаемых платформ
const isSupportedPlatform = (): boolean => {
  const url = window.location.href
  console.log("TabXport: Checking platform support for URL:", url)

  const supportedDomains = [
    "chat.openai.com",
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "bard.google.com",
    "chat.deepseek.com",
    "deepseek.com"
  ]

  const isSupported = supportedDomains.some((domain) => url.includes(domain))
  return isSupported
}

// Функция для проверки готовности DOM
const isDOMReady = (): boolean => {
  const url = window.location.href

  console.log("TabXport: Checking DOM readiness for URL:", url)

  // Проверяем наличие ключевых элементов интерфейса для каждой платформы
  if (url.includes("chat.openai.com") || url.includes("chatgpt.com")) {
    const elements = document.querySelector('main, [class*="conversation-"]')
    return !!elements
  }
  if (url.includes("claude.ai")) {
    const elements = document.querySelector(
      '.chat-messages, .message-container, .prose, [class*="message"]'
    )
    return !!elements
  }
  if (url.includes("gemini.google.com") || url.includes("bard.google.com")) {
    const geminiSelectors = [
      "mat-card",
      ".message-container",
      "[data-response-id]",
      ".conversation-turn",
      "table",
      "pre",
      "code",
      "[data-sourcepos]",
      ".response-container",
      ".model-response",
      "main",
      "body"
    ]

    for (const selector of geminiSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        return true
      }
    }

    const hasBody = document.body && document.body.children.length > 0
    const hasElements = document.querySelectorAll("*").length > 100
    if (hasBody && hasElements) {
      return true
    }
    return false
  }
  if (url.includes("chat.deepseek.com") || url.includes("deepseek.com")) {
    const selectors = [
      ".chat-container",
      ".message-list",
      ".chat-content",
      ".conversation",
      ".messages",
      ".chat-main",
      ".chat-area",
      ".message-container",
      ".chat-box",
      '[class*="chat"]',
      '[class*="message"]',
      '[class*="conversation"]',
      "main",
      ".main-content",
      "#app",
      ".app",
      ".content"
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        return true
      }
    }

    const hasBody = document.body && document.body.children.length > 0
    const hasScripts = document.querySelectorAll("script").length > 0
    if (hasBody && hasScripts) {
      return true
    }
    return false
  }

  const elements = document.querySelector(
    "main, .main-content, .chat-container, body"
  )
  return !!elements
}

// Функция для ожидания готовности DOM
const waitForDOM = async (): Promise<void> => {
  const maxAttempts = 6
  const interval = 300
  let attempts = 0

  while (!isDOMReady() && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, interval))
    attempts++
  }

  if (!isDOMReady()) {
    console.warn(
      "TabXport: DOM readiness timeout, proceeding with initialization anyway"
    )
  }
}

// Обработчик сообщений от popup и background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message.type)

  switch (message.type) {
    case "REFRESH_TABLES":
      scanAndProcessTables()
      sendResponse({ success: true })
      break

    case "SETTINGS_CHANGED":
      // Если изменилось назначение экспорта, обновляем кнопки НЕМЕДЛЕННО
      if (message.key === "defaultDestination") {
        import("./components/batch-export-button")
          .then(({ refreshAllBatchExportButtons }) => {
            refreshAllBatchExportButtons().catch((error) => {
              console.error("❌ IMMEDIATE batch button refresh failed:", error)
            })
          })
          .catch((error) => {
            console.error("❌ Failed to import batch export module:", error)
          })
      }
      sendResponse({ success: true })
      break

    default:
      sendResponse({ success: false, error: "Unknown message type" })
  }
})

// Инициализация content script
export const init = async (): Promise<void> => {
  console.log("TabXport: Content script loaded")
  console.log("TabXport: Current URL:", window.location.href)

  // Проверяем, что мы на поддерживаемой платформе
  if (!isSupportedPlatform()) {
    return
  }

  // Ждем готовности DOM перед инициализацией
  await waitForDOM()

  // Добавляем CSS для спиннера загрузки
  addSpinnerCSS()

  try {
    const { checkAndShowLimitWarning } = await import(
      "./components/limit-warning"
    )
    await checkAndShowLimitWarning()
  } catch (e) {
    console.error("TabXport: Error during limit warning check:", e)
  }

  try {
    // Запускаем первоначальное сканирование
    await scanAndProcessTables()
  } catch (e) {
    console.error("TabXport: Error during table scan:", e)
  }

  // Настройка наблюдателя за изменениями DOM
  setupMutationObserver()

  // Настройка периодического сканирования только для AI платформ
  const source = window.location.href
  if (
    source.includes("chat.openai.com") ||
    source.includes("chatgpt.com") ||
    source.includes("claude.ai") ||
    source.includes("gemini.google.com") ||
    source.includes("chat.deepseek.com")
  ) {
    let scanInterval = 10000
    let lastTableCount = 0

    setInterval(() => {
      const currentTables = document.querySelectorAll("table, pre, code").length
      if (currentTables !== lastTableCount) {
        scanInterval = Math.max(5000, scanInterval - 1000)
        lastTableCount = currentTables
      } else {
        scanInterval = Math.min(15000, scanInterval + 1000)
      }
      scanAndProcessTables()
    }, scanInterval)
  }

  // Инициализация Survey Manager — удалено
  // initContentSurveyManager()
  // initSurveyEventListener()

  console.log("TabXport: Content script initialization complete")
}
