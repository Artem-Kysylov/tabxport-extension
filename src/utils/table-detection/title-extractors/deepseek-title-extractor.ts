import { logger } from "../common/logging"
import { TitleExtractor } from "../types"

/**
 * Title extractor for DeepSeek platform
 * Based on the original working extractDeepSeekTitle function
 */
export const deepseekTitleExtractor: TitleExtractor = {
  extractTitle: (): string => {
    logger.debug("Starting DeepSeek title extraction")
    logger.debug("Current URL:", window.location.href)
    logger.debug("Page title:", document.title)

    // ВАЖНО: НЕ используем заголовок страницы как первый вариант для DeepSeek,
    // так как он может быть одинаковым для всех чатов

    // Вариант 1: Ищем в боковой панели (активный чат)
    const sidebarSelectors = [
      ".sidebar-chat-item.active",
      ".chat-list .selected",
      ".chat-sidebar .current",
      '[class*="sidebar"] [class*="active"]',
      '[class*="chat-list"] [class*="selected"]',
      'aside [aria-current="page"]',
      ".conversation-item.active",
      '[data-active="true"]',
      ".active.chat-title",
      ".selected.chat-title",
      ".current.chat-title",
      ".chat-item.active",
      ".conversation.active",
      '[class*="conversation"][class*="active"]',
      '[class*="chat"][class*="active"]'
    ]

    logger.debug("Testing sidebar selectors first...")
    for (const selector of sidebarSelectors) {
      const elements = document.querySelectorAll(selector)
      logger.debug(
        `Sidebar selector "${selector}" found ${elements.length} elements`
      )

      for (const element of elements) {
        const text = element.textContent?.trim()
        logger.debug(`Sidebar element text: "${text}"`)

        if (text && text.length > 3 && text.length < 100) {
          const lowerText = text.toLowerCase()
          const isValidTitle =
            !lowerText.includes("deepseek") &&
            !lowerText.includes("new chat") &&
            !lowerText.includes("untitled") &&
            !lowerText.includes("新对话") &&
            !lowerText.includes("新建") &&
            !lowerText.includes("menu") &&
            !lowerText.includes("settings") &&
            !lowerText.includes("logout")

          if (isValidTitle) {
            logger.debug("DeepSeek title from sidebar:", text)
            return text
          }
        }
      }
    }

    // Вариант 2: Ищем в заголовке чата в основном интерфейсе
    const chatHeaderSelectors = [
      ".chat-header h1",
      ".chat-header h2",
      ".conversation-header h1",
      ".conversation-header h2",
      ".chat-title",
      ".conversation-title",
      ".session-title",
      '[class*="conversation-title"]',
      '[class*="chat-title"]',
      '[class*="session-title"]',
      "header .title",
      "header h1",
      "header h2",
      '[role="heading"][aria-level="1"]',
      '[role="heading"][aria-level="2"]',
      ".title",
      '[class*="title"]'
    ]

    logger.debug("Testing chat header selectors...")
    for (const selector of chatHeaderSelectors) {
      const elements = document.querySelectorAll(selector)
      logger.debug(
        `Header selector "${selector}" found ${elements.length} elements`
      )

      for (const element of elements) {
        const text = element.textContent?.trim()
        logger.debug(`Header element text: "${text}"`)

        if (text && text.length > 3 && text.length < 100) {
          const lowerText = text.toLowerCase()
          const isValidTitle =
            !lowerText.includes("deepseek") &&
            !lowerText.includes("assistant") &&
            !lowerText.includes("chat") &&
            !lowerText.includes("对话") &&
            !lowerText.includes("新建") &&
            !lowerText.includes("untitled") &&
            !lowerText.includes("new conversation") &&
            !lowerText.includes("menu") &&
            !lowerText.includes("button") &&
            !lowerText.includes("settings")

          if (isValidTitle) {
            logger.debug("DeepSeek title from header:", text)
            return text
          }
        }
      }
    }

    // Вариант 3: Ищем первое сообщение пользователя
    const userMessageSelectors = [
      ".user-message:first-child",
      ".human-message:first-child",
      '[class*="user-message"]:first-child',
      '[class*="human-message"]:first-child',
      '[role="user"]:first-child',
      ".message.user:first-child",
      ".msg-user:first-child",
      ".user:first-child",
      ".human:first-child",
      '[data-role="user"]:first-child',
      '[data-author="user"]:first-child'
    ]

    logger.debug("Testing user message selectors...")
    for (const selector of userMessageSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = element.textContent?.trim()
        logger.debug(
          `User message "${selector}": "${text?.substring(0, 50)}..."`
        )

        if (text && text.length > 10 && text.length < 120) {
          const shortTitle = text.substring(0, 50).trim()
          if (shortTitle.length > 5) {
            logger.debug("DeepSeek title from first user message:", shortTitle)
            return shortTitle
          }
        }
      }
    }

    // Вариант 4: Ищем в навигационных элементах (более агрессивный поиск)
    const navElements = document.querySelectorAll("a, button, div, span")
    logger.debug(`Testing ${navElements.length} navigation elements...`)

    for (const element of navElements) {
      const text = element.textContent?.trim()
      if (!text || text.length < 5 || text.length > 80) continue

      // Проверяем, является ли это активным элементом
      const isActive =
        element.classList.contains("active") ||
        element.classList.contains("selected") ||
        element.classList.contains("current") ||
        element.getAttribute("aria-current") === "page" ||
        element.getAttribute("data-active") === "true" ||
        element.classList.contains("chat-title") ||
        element.classList.contains("conversation-title")

      if (isActive) {
        logger.debug(`Active nav element: "${text}"`)

        const lowerText = text.toLowerCase()
        const isValidTitle =
          !lowerText.includes("deepseek") &&
          !lowerText.includes("new") &&
          !lowerText.includes("chat") &&
          !lowerText.includes("新") &&
          !lowerText.includes("对话") &&
          !lowerText.includes("menu") &&
          !lowerText.includes("button") &&
          !lowerText.includes("settings") &&
          !lowerText.includes("logout") &&
          !lowerText.includes("profile")

        if (isValidTitle) {
          logger.debug("DeepSeek title from active navigation:", text)
          return text
        }
      }
    }

    // Вариант 5: Ищем в localStorage или sessionStorage
    logger.debug("Testing storage...")
    try {
      const storageKeys = [
        "currentChatTitle",
        "chatTitle",
        "conversationTitle",
        "sessionTitle",
        "title"
      ]
      for (const key of storageKeys) {
        const stored = localStorage.getItem(key) || sessionStorage.getItem(key)
        logger.debug(`Storage ${key}: "${stored}"`)

        if (stored && stored.length > 3 && stored.length < 100) {
          const lowerStored = stored.toLowerCase()
          const isValidTitle =
            !lowerStored.includes("deepseek") &&
            !lowerStored.includes("untitled") &&
            !lowerStored.includes("new chat")

          if (isValidTitle) {
            logger.debug("DeepSeek title from storage:", stored)
            return stored
          }
        }
      }
    } catch (error) {
      logger.error("Could not access storage for title extraction:", error)
    }

    // Вариант 6: Ищем в URL (если есть читаемый путь)
    logger.debug("Testing URL extraction...")
    const urlPath = window.location.pathname
    logger.debug("URL path:", urlPath)

    // Пытаемся извлечь название из пути URL
    const pathMatch = urlPath.match(/\/chat\/([^\/]+)/)
    if (pathMatch && pathMatch[1]) {
      const urlTitle = decodeURIComponent(pathMatch[1])
        .replace(/-/g, " ")
        .replace(/_/g, " ")
        .replace(/\+/g, " ")

      logger.debug("URL title candidate:", urlTitle)

      if (
        urlTitle.length > 3 &&
        urlTitle.length < 80 &&
        !urlTitle.includes("undefined") &&
        !urlTitle.includes("null") &&
        !/^[a-f0-9-]{20,}$/i.test(urlTitle)
      ) {
        // Не UUID/ID
        logger.debug("DeepSeek title from URL path:", urlTitle)
        return urlTitle
      }
    }

    // Вариант 7: Ищем в метаданных страницы
    const metaSelectors = [
      'meta[name="title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[property="twitter:title"]'
    ]

    logger.debug("Testing meta tags...")
    for (const selector of metaSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const content = element.getAttribute("content")
        logger.debug(`Meta ${selector}: "${content}"`)

        if (content && content.length > 3 && content.length < 100) {
          const lowerContent = content.toLowerCase()
          const isValidTitle =
            !lowerContent.includes("deepseek") &&
            !lowerContent.includes("chat") &&
            !lowerContent.includes("assistant")

          if (isValidTitle) {
            // Очищаем от суффиксов
            let cleanContent = content
            if (cleanContent.includes(" - DeepSeek")) {
              cleanContent = cleanContent.replace(" - DeepSeek", "")
            }
            if (cleanContent.includes(" - Chat")) {
              cleanContent = cleanContent.replace(" - Chat", "")
            }

            cleanContent = cleanContent.trim()
            if (cleanContent.length > 3) {
              logger.debug("DeepSeek title from meta:", cleanContent)
              return cleanContent
            }
          }
        }
      }
    }

    // Вариант 8: Последняя попытка - ищем любой осмысленный текст в заголовках
    logger.debug("Final fallback - searching all headings...")
    const allHeadings = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, [role="heading"]'
    )

    for (const heading of allHeadings) {
      const text = heading.textContent?.trim()
      logger.debug(`Heading candidate: "${text}"`)

      if (text && text.length > 5 && text.length < 100) {
        const lowerText = text.toLowerCase()
        const isValidTitle =
          !lowerText.includes("deepseek") &&
          !lowerText.includes("chat") &&
          !lowerText.includes("conversation") &&
          !lowerText.includes("assistant") &&
          !lowerText.includes("ai") &&
          !lowerText.includes("对话") &&
          !lowerText.includes("新建") &&
          !lowerText.includes("menu") &&
          !lowerText.includes("settings") &&
          !lowerText.includes("welcome") &&
          !lowerText.includes("hello")

        if (isValidTitle) {
          logger.debug("DeepSeek title from heading fallback:", text)
          return text
        }
      }
    }

    // Вариант 9: ТОЛЬКО СЕЙЧАС пробуем заголовок страницы (как последний вариант)
    logger.debug("Final attempt - checking page title as last resort...")
    const pageTitle = document.title
    if (pageTitle && pageTitle.length > 3) {
      // Проверяем, не содержит ли заголовок только название платформы
      const cleanPageTitle = pageTitle.toLowerCase()
      const isGenericTitle =
        cleanPageTitle === "deepseek" ||
        cleanPageTitle === "deepseek chat" ||
        cleanPageTitle === "chat" ||
        (cleanPageTitle.includes("deepseek - ") &&
          cleanPageTitle.replace("deepseek - ", "").trim().length < 3)

      if (!isGenericTitle) {
        // Очищаем заголовок от префиксов платформы
        let cleanTitle = pageTitle
        if (cleanTitle.toLowerCase().startsWith("deepseek - ")) {
          cleanTitle = cleanTitle.substring(11)
        }
        if (cleanTitle.toLowerCase().endsWith(" - deepseek")) {
          cleanTitle = cleanTitle.substring(0, cleanTitle.length - 11)
        }

        cleanTitle = cleanTitle.trim()
        if (cleanTitle.length > 3) {
          logger.debug(
            "DeepSeek title from page title (last resort):",
            cleanTitle
          )
          return cleanTitle
        }
      }
    }

    logger.debug("No specific DeepSeek title found, using default")
    return "DeepSeek_Chat"
  }
}
