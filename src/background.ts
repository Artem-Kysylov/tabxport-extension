import { cleanTableData, exportTable, validateTableData } from "./lib/export"
import {
  getUserSettings,
  getUserSubscription,
  saveLastExportTime
} from "./lib/storage"
import { authService } from "./lib/supabase/auth-service"
import { supabase } from "./lib/supabase"
import { SessionManager } from "./lib/supabase/session-manager"
import { googleDriveService } from "./lib/google-drive-api"
import { exportService } from "./lib/supabase/export-service"
import { userService } from "./lib/supabase/user-service"
import type {
  ChromeMessage,
  ExportOptions,
  ExportResult,
  TableData
} from "./types"

// Обработчик сообщений от content scripts
chrome.runtime.onMessage.addListener(
  (message: ChromeMessage, sender, sendResponse) => {
    console.log("Background: Received message", message.type)
    
    // Проверка безопасности: принимаем сообщения от расширения и content scripts
    if (sender.origin && !sender.origin.startsWith(`chrome-extension://${chrome.runtime.id}`)) {
      // Разрешаем сообщения от content scripts (они не имеют sender.origin или имеют origin веб-страницы)
      if (sender.tab && sender.tab.url) {
        console.log("Background: Message from content script on:", sender.tab.url)
      } else {
        console.warn("Background: Rejected message from untrusted origin:", sender.origin)
        sendResponse({ error: "Untrusted origin" })
        return false
      }
    }

    switch (message.type) {
      case "EXPORT_TABLE":
        handleTableExport(message.payload, sendResponse)
        return true // Указывает, что ответ будет асинхронным

      case "GET_SETTINGS":
        handleGetSettings(sendResponse)
        return true

      case "UPDATE_SETTINGS":
        handleUpdateSettings(message.payload, sendResponse)
        return true

      case "CHECK_SUBSCRIPTION":
        handleCheckSubscription(sendResponse)
        return true

      case "CHECK_AUTH_STATUS":
        handleCheckAuthStatus(sendResponse)
        return true

      case "GOOGLE_SIGN_IN":
        handleGoogleSignIn(sendResponse)
        return true

      case "SIGN_OUT":
        handleSignOut(sendResponse)
        return true

      case "OAUTH_SUCCESS":
        handleOAuthSuccess(message.sessionData, sendResponse)
        return true

      case "OAUTH_ERROR":
        handleOAuthError(message.error, message.errorDescription, sendResponse)
        return true

      case "OAUTH_CODE":
        handleOAuthCode(message.code, sendResponse)
        return true

      case "CHROMIUMAPP_OAUTH_DATA":
        handleChromiumAppOAuth(message, sendResponse)
        return true

      case "CREATE_TABLEXPORT_FOLDER":
        handleCreateTableXportFolder(sendResponse)
        return true

      case "GET_GOOGLE_TOKEN":
        handleGetGoogleToken(sendResponse)
        return true

      case "GET_EXPORT_HISTORY":
        handleGetExportHistory(sendResponse)
        return true

      case "GET_USAGE_QUOTAS":
        handleGetUsageQuotas(sendResponse)
        return true

      default:
        sendResponse({ error: "Unknown message type" })
        return false
    }
  }
)

// Обработка экспорта таблицы
const handleTableExport = async (
  payload: any,
  sendResponse: (response: any) => void
): Promise<void> => {
  console.log("🔍 Background: Received message EXPORT_TABLE")
  console.log("🔍 Background: Full payload:", JSON.stringify(payload, null, 2))
  
  try {
    const { tableData, options } = payload
    // Используем платформу из tableData.source или 'unknown' как fallback
    const platform = tableData?.source || "unknown"

    console.log("🔍 Background: Extracted options:", options)
    console.log("🔍 Background: Options destination:", options.destination)
    console.log("🔍 Background: Options format:", options.format)
    console.log("🔍 Background: Platform:", platform)
    console.log("🔍 Background: Is batch upload:", !!options.isBatchUpload)

    if (!tableData || !options) {
      console.error("❌ Background: Missing required data")
      sendResponse({
        success: false,
        error: "Missing table data or options"
      })
      return
    }

    // Проверяем настройки пользователя для сравнения
    const userSettings = await getUserSettings()
    console.log("🔍 Background: Current user settings:", userSettings)
    console.log("🔍 Background: User defaultDestination:", userSettings.defaultDestination)

    // Проверяем авторизацию
    const authState = authService.getCurrentState()
    console.log("🔍 Background: Auth state:", authState)

    if (!authState.isAuthenticated || !authState.user) {
      console.error("❌ Background: User not authenticated")
      sendResponse({
        success: false,
        error: "Authentication required"
      })
      return
    }

    const userId = authState.user.id

    // Нормализуем destination для совместимости
    let normalizedDestination = options.destination
    if (options.destination === "google-drive") {
      console.log("🔄 Background: Converting 'google-drive' to 'google_drive'")
      normalizedDestination = "google_drive"
    }
    
    console.log("🔍 Background: Normalized destination:", normalizedDestination)
    console.log("🔍 Background: Checking destination condition...")
    console.log("🔍 Background: Is google_drive?", normalizedDestination === "google_drive")
    console.log("🔍 Background: Is google-drive?", normalizedDestination === "google-drive")

    // Специальная обработка для Google Sheets формата
    if (options.format === "google_sheets") {
      console.log("✅ Background: Using Google Sheets export...")
      
      // Очистка данных таблицы
      const cleanedTableData = cleanTableData(tableData)
      
      // Экспорт таблицы через Google Sheets API
      const result: ExportResult = await exportTable(cleanedTableData, options)
      console.log("🔍 Background: Google Sheets export result:", result)

      if (result.success) {
        sendResponse({
          success: true,
          googleSheetsId: result.googleSheetsId,
          googleSheetsUrl: result.googleSheetsUrl,
          filename: result.filename
        })

        // Показ уведомления
        chrome.notifications.create({
          type: "basic",
          iconUrl: "/icon48.plasmo.aced7582.png",
          title: "TableXport",
          message: `Table exported to Google Sheets successfully!`
        })
      } else {
        console.error("❌ Background: Google Sheets export failed:", result.error)
        sendResponse({
          success: false,
          error: result.error || "Google Sheets export failed"
        })
      }
    }
    // Используем новый ExportService для экспорта с проверками лимитов
    else if (normalizedDestination === "google_drive") {
      console.log("✅ Background: Using Google Drive export...")
      
      // Для batch upload с dataUrl используем прямую загрузку в Google Drive
      if (options.isBatchUpload && options.dataUrl) {
        console.log("🔄 Background: Handling batch upload with dataUrl")
        
        try {
          // Конвертируем dataUrl в blob
          const response = await fetch(options.dataUrl)
          const blob = await response.blob()
          
          // Определяем MIME type
          const mimeType = blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          
          console.log("🔍 Background: Blob details:", {
            size: blob.size,
            type: blob.type,
            filename: options.filename
          })
          
          // Загружаем в Google Drive
          const uploadResult = await googleDriveService.uploadFile({
            filename: options.filename || `batch_export_${Date.now()}.xlsx`,
            content: blob,
            mimeType: mimeType
          })
          
          console.log("🔍 Background: Direct upload result:", uploadResult)
          
          if (uploadResult.success) {
            sendResponse({
              success: true,
              googleDriveLink: uploadResult.webViewLink,
              fileId: uploadResult.fileId
            })
            
            // Показ уведомления
            chrome.notifications.create({
              type: "basic",
              iconUrl: "/icon48.plasmo.aced7582.png",
              title: "TableXport",
              message: `File uploaded to Google Drive successfully!`
            })
          } else {
            console.error("❌ Background: Direct upload failed:", uploadResult.error)
            sendResponse({
              success: false,
              error: uploadResult.error || "Google Drive upload failed"
            })
          }
          
          return
        } catch (error) {
          console.error("❌ Background: Error processing batch upload:", error)
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Batch upload failed"
          })
          return
        }
      }
      
      // Обычный экспорт через exportService
      // Преобразуем tableData в формат массива массивов
      const tableArray: any[][] = []
      
      // Добавляем заголовки если они есть и включены
      if (options.includeHeaders && tableData.headers) {
        tableArray.push(tableData.headers)
        console.log("🔍 Background: Added headers to table array:", tableData.headers)
      }
      
      // Добавляем строки данных
      if (tableData.rows && Array.isArray(tableData.rows)) {
        tableArray.push(...tableData.rows)
        console.log("🔍 Background: Added rows to table array, count:", tableData.rows.length)
      }
      
      console.log("🔍 Background: Final table array format:", tableArray.slice(0, 2)) // Показываем первые 2 строки
      
      const exportResult = await exportService.exportTable({
        userId,
        tableName: options.filename || `table_${Date.now()}`,
        tableData: tableArray, // Передаем массив массивов
        format: options.format as "csv" | "xlsx" | "docx" | "pdf" | "google_sheets",
        platform,
        destination: "google_drive",
        metadata: {
          exportedFrom: "TableXport Extension",
          timestamp: new Date().toISOString()
        }
      })

      console.log("🔍 Background: Google Drive export result:", exportResult)
      console.log("🔍 Background: Export result detailed:", {
        success: exportResult.success,
        googleDriveLink: exportResult.googleDriveLink,
        exportId: exportResult.exportId,
        error: exportResult.error,
        allKeys: Object.keys(exportResult)
      })

      if (exportResult.success) {
        console.log("🔍 Background: Sending response with googleDriveLink:", exportResult.googleDriveLink)
        sendResponse({
          success: true,
          googleDriveLink: exportResult.googleDriveLink,
          exportId: exportResult.exportId
        })

        // Показ уведомления
        chrome.notifications.create({
          type: "basic",
          iconUrl: "/icon48.plasmo.aced7582.png", // Используем прямой путь к файлу иконки
          title: "TableXport",
          message: `Table exported to Google Drive successfully!`
        })
      } else {
        console.error("❌ Background: Google Drive export failed:", exportResult.error)
        sendResponse({
          success: false,
          error: exportResult.error || "Google Drive export failed"
        })
      }
    } else {
      // Старый метод для обычного скачивания
      console.log("📥 Background: Using download export...")
      console.log("🔍 Background: Destination was:", options.destination, "-> normalized to:", normalizedDestination)
      
      // Очистка данных таблицы
      const cleanedTableData = cleanTableData(tableData)
      
      // Экспорт таблицы
      const result: ExportResult = await exportTable(cleanedTableData, options)
      console.log("🔍 Background: Download export result:", result)

      if (result.success && result.downloadUrl) {
        // Скачивание файла через Chrome Downloads API
        const downloadId = await chrome.downloads.download({
          url: result.downloadUrl,
          filename: result.filename,
          saveAs: false
        })

        // Сохранение времени последнего экспорта
        await saveLastExportTime()

        sendResponse({
          success: true,
          filename: result.filename,
          downloadId
        })

        // Показ уведомления
        chrome.notifications.create({
          type: "basic",
          iconUrl: "/icon48.plasmo.aced7582.png", // Используем прямой путь к файлу иконки
          title: "TableXport",
          message: `Table exported as ${result.filename}`
        })
      } else {
        console.error("❌ Background: Download export failed:", result.error)
        sendResponse({
          success: false,
          error: result.error || "Export failed"
        })
      }
    }
  } catch (error) {
    console.error("❌ Background: Export error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Получение настроек пользователя
const handleGetSettings = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    const settings = await getUserSettings()
    sendResponse({ success: true, settings })
  } catch (error) {
    console.error("Get settings error:", error)
    sendResponse({
      success: false,
      error: "Failed to get settings"
    })
  }
}

// Обновление настроек пользователя
const handleUpdateSettings = async (
  payload: any,
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    // TODO: Implement settings update
    sendResponse({ success: true })
  } catch (error) {
    console.error("Update settings error:", error)
    sendResponse({
      success: false,
      error: "Failed to update settings"
    })
  }
}

// Проверка подписки пользователя
const handleCheckSubscription = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    const subscription = await getUserSubscription()
    sendResponse({ success: true, subscription })
  } catch (error) {
    console.error("Check subscription error:", error)
    sendResponse({
      success: false,
      error: "Failed to check subscription"
    })
  }
}

// Проверка статуса авторизации
const handleCheckAuthStatus = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("Background: Checking auth status...")
    
    // Приоритет authService (основной)
    const authState = authService.getCurrentState()
    console.log("Background: AuthService state:", authState)
    
    // Проверяем сессию через SessionManager (дополнительно)
    const isSessionAuthenticated = await SessionManager.isAuthenticated()
    const sessionUser = await SessionManager.getCurrentUser()
    
    console.log("Background: SessionManager state:", { 
      isSessionAuthenticated, 
      sessionUser: !!sessionUser 
    })
    
    // Комбинируем результаты - приоритет у authService
    const finalAuthState = {
      isAuthenticated: authState.isAuthenticated || isSessionAuthenticated,
      user: authState.user || sessionUser,
      hasGoogleAccess: authState.hasGoogleAccess
    }
    
    console.log("Background: Final auth state:", finalAuthState)
    
    sendResponse({ 
      success: true, 
      authState: finalAuthState
    })
  } catch (error) {
    console.error("Check auth status error:", error)
    sendResponse({
      success: false,
      error: "Failed to check auth status"
    })
  }
}

// Проверка и уведомление об успешной авторизации
const checkAndNotifyAuthSuccess = async (): Promise<void> => {
  try {
    console.log("Checking auth status after OAuth...")
    
    // Принудительно обновляем сессию
    await supabase.auth.refreshSession()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log("Auth check result:", { session: !!session, error })
    
    if (session && session.user) {
      console.log("✅ User successfully authenticated:", session.user.email)
      
      // Уведомляем popup об успешной авторизации
      try {
        await chrome.runtime.sendMessage({ 
          type: "AUTH_SUCCESS", 
          user: session.user 
        })
        console.log("AUTH_SUCCESS message sent to popup")
      } catch (msgError) {
        console.log("Failed to send AUTH_SUCCESS message:", msgError)
      }
    } else {
      console.log("❌ Authentication failed or incomplete")
      
      // Альтернативная проверка через authService
      setTimeout(() => {
        const authState = authService.getCurrentState()
        console.log("AuthService state check:", authState)
        
        if (authState.isAuthenticated && authState.user) {
          console.log("✅ User authenticated via AuthService:", authState.user.email)
          chrome.runtime.sendMessage({ 
            type: "AUTH_SUCCESS", 
            user: authState.user 
          }).catch(err => console.log("Message send failed:", err))
        }
      }, 2000)
    }
  } catch (error) {
    console.error("Error in auth status check:", error)
  }
}

// Вход через Google
const handleGoogleSignIn = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    // Проверяем, настроен ли Google OAuth
    const googleClientId = process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_ID
    if (!googleClientId || googleClientId === "your_google_client_id_here") {
      console.error("Google OAuth not configured")
      sendResponse({
        success: false,
        error: "Google OAuth не настроен. Пожалуйста, настройте Google Cloud Project и добавьте Client ID в .env файл."
      })
      return
    }

    // Проверяем, может пользователь уже авторизован
    const authState = authService.getCurrentState()
    if (authState.isAuthenticated) {
      console.log("✅ User is already authenticated, skipping OAuth")
      sendResponse({ 
        success: true, 
        message: "User is already authenticated",
        user: authState.user
      })
      return
    }

    console.log("🔄 Starting web-based OAuth flow...")
    
    // Используем обычный веб-OAuth без chrome.identity
    const result = await authService.signInWithGoogle()
    
    console.log("🔍 OAuth result:", result)
    
    if (result.success) {
      if (result.data?.url) {
        console.log("Opening OAuth URL in new tab:", result.data.url)
      
      // Открываем OAuth в новой вкладке
      const tab = await chrome.tabs.create({ url: result.data.url })
      console.log("OAuth tab created:", tab.id)
      
      // Отвечаем сразу, что OAuth запущен
      sendResponse({ 
        success: true, 
        message: "OAuth started. Please complete authorization in the new tab." 
      })
      
      // Мониторим вкладку и проверяем авторизацию
      const checkAuthInterval = setInterval(async () => {
        try {
          // Проверяем, существует ли еще вкладка
          const tabInfo = await chrome.tabs.get(tab.id!)
          
          // Если вкладка все еще открыта, проверяем URL
          if (tabInfo && tabInfo.url) {
            // Если пользователь вернулся на localhost (успешная авторизация)
            if (tabInfo.url.includes('localhost:3000')) {
              console.log("OAuth completed - user redirected to localhost")
              clearInterval(checkAuthInterval)
              
              // Закрываем вкладку
              chrome.tabs.remove(tab.id!)
              
              // Проверяем авторизацию через небольшую задержку
              setTimeout(async () => {
                await checkAndNotifyAuthSuccess()
              }, 2000)
            }
          }
        } catch (error) {
          // Вкладка закрыта пользователем
          console.log("OAuth tab was closed")
          clearInterval(checkAuthInterval)
          
          // Проверяем, возможно авторизация все же прошла
          setTimeout(async () => {
            await checkAndNotifyAuthSuccess()
          }, 1000)
        }
      }, 1000)
      
      } else {
        // OAuth уже завершен успешно, но без URL (пользователь уже авторизован)
        console.log("✅ OAuth completed successfully without new URL")
        sendResponse({ 
          success: true, 
          message: "Authentication completed successfully" 
        })
      }
    } else {
      console.error("❌ Failed to get OAuth URL:", result.error)
      console.log("🔍 Full result object:", result)
      sendResponse({
        success: false,
        error: result.error || "Failed to initiate Google sign in"
      })
    }
  } catch (error) {
    console.error("Google sign in error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed"
    })
  }
}

// Выход из системы
const handleSignOut = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    // Очищаем сессию через SessionManager
    await SessionManager.clearSession()
    
    // Также вызываем authService для полной очистки
    const result = await authService.signOut()
    
    sendResponse({ success: true })
  } catch (error) {
    console.error("Sign out error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Sign out failed"
    })
  }
}

// Обработчик установки расширения
chrome.runtime.onInstalled.addListener((details) => {
  console.log("TableXport: Extension installed", details.reason)

  if (details.reason === "install") {
    // Показ welcome уведомления
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/icon48.plasmo.aced7582.png",
      title: "TableXport Installed!",
      message: "Start exporting tables from AI chats to Excel/CSV"
    })
  }
})

// Обработчик ошибок скачивания
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.error) {
    console.error("Download error:", downloadDelta.error)
    chrome.notifications.create({
      type: "basic",
      iconUrl: "/icon48.plasmo.aced7582.png",
      title: "TableXport Error",
      message: "Failed to download exported file"
    })
  }
})

// Обработка успешного OAuth callback
const handleOAuthSuccess = async (
  sessionData: any,
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("🎉 OAuth Success received:", sessionData)
    
    // Создаем сессию в формате Supabase
    const session = {
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token || "",
      expires_in: sessionData.expires_in || 3600,
      token_type: sessionData.token_type || "bearer",
      user: sessionData.user || {
        id: crypto.randomUUID(),
        email: "unknown@gmail.com",
        user_metadata: {
          full_name: "Unknown User",
          avatar_url: ""
        }
      }
    }
    
    // Сохраняем сессию через SessionManager (автоматически настраивает refresh)
    await SessionManager.saveSession(session as any)
    
    // Обновляем состояние в Supabase
    try {
      await supabase.auth.setSession(session as any)
    } catch (setError) {
      console.warn("Failed to set session via Supabase, continuing anyway:", setError)
    }
    
    console.log("✅ Auth state updated successfully")
    sendResponse({ success: true })
    
    // Уведомляем popup об успешной авторизации
    setTimeout(() => {
      chrome.runtime.sendMessage({ 
        type: "AUTH_SUCCESS", 
        user: session.user 
      }).catch(err => console.log("Failed to send AUTH_SUCCESS:", err))
    }, 500)
    
  } catch (error) {
    console.error("Error handling OAuth success:", error)
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    })
  }
}

// Обработка ошибки OAuth
const handleOAuthError = async (
  error: string,
  errorDescription: string,
  sendResponse: (response: any) => void
): Promise<void> => {
  console.error("OAuth Error:", error, errorDescription)
  sendResponse({ 
    success: false, 
    error: error,
    errorDescription: errorDescription 
  })
  
  // Уведомляем popup об ошибке
  chrome.runtime.sendMessage({ 
    type: "AUTH_ERROR", 
    error: error,
    errorDescription: errorDescription
  }).catch(err => console.log("Failed to send AUTH_ERROR:", err))
}

// Обработка authorization code
const handleOAuthCode = async (
  code: string,
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("🔄 Processing authorization code...")
    
    // Обмениваем code на session через Supabase
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error("Code exchange error:", error)
      sendResponse({ success: false, error: error.message })
      return
    }
    
    if (data.session) {
      console.log("✅ Session created from authorization code")
      await handleOAuthSuccess(data.session, sendResponse)
    } else {
      sendResponse({ success: false, error: "No session returned from code exchange" })
    }
    
  } catch (error) {
    console.error("Error exchanging authorization code:", error)
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : "Code exchange failed" 
    })
  }
}

// Отладочная информация о переменных окружения
console.log("TableXport: Background script loaded")
console.log("Environment variables check:")
console.log("- SUPABASE_URL:", process.env.PLASMO_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing")
console.log("- SUPABASE_ANON_KEY:", process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing")
console.log("- GOOGLE_CLIENT_ID:", process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing")

// Обработка OAuth данных с chromiumapp.org
const handleChromiumAppOAuth = async (
  message: any,
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("🔗 Chromiumapp OAuth data received:", message)
    
    const { params, hash } = message
    
    // Проверяем на ошибки
    const error = hash.error || params.error
    if (error) {
      await handleOAuthError(error, hash.error_description || params.error_description, sendResponse)
      return
    }
    
    // Проверяем access_token
    const accessToken = hash.access_token || params.access_token
    if (accessToken) {
      const sessionData = {
        access_token: accessToken,
        refresh_token: hash.refresh_token || params.refresh_token || "",
        expires_in: parseInt(hash.expires_in || params.expires_in || "3600"),
        token_type: hash.token_type || params.token_type || "bearer"
      }
      
      await handleOAuthSuccess(sessionData, sendResponse)
      return
    }
    
    // Проверяем authorization code
    const authCode = params.code
    if (authCode) {
      await handleOAuthCode(authCode, sendResponse)
      return
    }
    
    console.warn("No OAuth data found in chromiumapp message")
    sendResponse({ success: false, error: "No OAuth data found" })
    
  } catch (error) {
    console.error("Error handling chromiumapp OAuth:", error)
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    })
  }
}

// Обработка создания папки TableXport в Google Drive
const handleCreateTableXportFolder = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("Background: Creating TableXport folder...")
    
    const authState = authService.getCurrentState()
    if (!authState.isAuthenticated || !authState.hasGoogleAccess) {
      sendResponse({
        success: false,
        error: "Google authentication required"
      })
      return
    }

    const folderId = await googleDriveService.createTableXportFolder()
    
    if (folderId) {
      console.log("Background: TableXport folder created/found:", folderId)
      sendResponse({
        success: true,
        folderId
      })
    } else {
      sendResponse({
        success: false,
        error: "Failed to create/access TableXport folder"
      })
    }
  } catch (error) {
    console.error("Background: Create folder error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Обработка получения Google токена
const handleGetGoogleToken = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("Background: Getting Google token...")
    
    const authState = authService.getCurrentState()
    if (!authState.isAuthenticated) {
      sendResponse({
        success: false,
        error: "User not authenticated"
      })
      return
    }

    const googleToken = authService.getGoogleToken()
    
    if (googleToken) {
      sendResponse({
        success: true,
        hasToken: true
      })
    } else {
      sendResponse({
        success: false,
        error: "No Google token available"
      })
    }
  } catch (error) {
    console.error("Background: Get token error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Обработка получения истории экспортов
const handleGetExportHistory = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("Background: Getting export history...")
    
    const authState = authService.getCurrentState()
    if (!authState.isAuthenticated || !authState.user) {
      sendResponse({
        success: false,
        error: "User not authenticated"
      })
      return
    }

    const exports = await userService.getExportHistory(authState.user.id, 10)
    
    sendResponse({
      success: true,
      exports
    })
  } catch (error) {
    console.error("Background: Get export history error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Обработка получения квот использования
const handleGetUsageQuotas = async (
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log("Background: Getting usage quotas...")
    
    const authState = authService.getCurrentState()
    if (!authState.isAuthenticated || !authState.user) {
      sendResponse({
        success: false,
        error: "User not authenticated"
      })
      return
    }

    const quotas = await userService.getUserQuotas(authState.user.id)
    
    sendResponse({
      success: true,
      quotas
    })
  } catch (error) {
    console.error("Background: Get usage quotas error:", error)
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}

// Инициализация сессии при старте
SessionManager.loadSession().then((session) => {
  if (session) {
    console.log("🔄 Existing session restored for user:", session.user?.email)
  } else {
    console.log("📭 No existing session found")
  }
}).catch((error) => {
  console.error("❌ Failed to load session on startup:", error)
})
