import React, { useEffect, useState } from "react"

interface AuthUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  googleToken?: string | null
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  hasGoogleAccess: boolean
}

interface AuthStatusProps {
  onAuthChange?: (authState: AuthState) => void
}

export const AuthStatus: React.FC<AuthStatusProps> = ({ onAuthChange }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    hasGoogleAccess: false
  })

  useEffect(() => {
    // Слушаем изменения авторизации от background script
    const checkAuthStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "CHECK_AUTH_STATUS"
        })
        
        if (response?.success) {
          const newAuthState = response.authState
          setAuthState(newAuthState)
          onAuthChange?.(newAuthState)
        }
      } catch (error) {
        console.error("Failed to check auth status:", error)
        setAuthState(prev => ({ ...prev, isLoading: false }))
      }
    }

    checkAuthStatus()

    // Слушаем сообщения об успешной авторизации
    const messageListener = (message: any) => {
      if (message.type === "AUTH_SUCCESS") {
        console.log("✅ Received AUTH_SUCCESS message:", message)
        
        // Немедленно обновляем состояние, если есть данные пользователя
        if (message.user) {
          const newAuthState: AuthState = {
            user: {
              id: message.user.id,
              email: message.user.email || "",
              full_name: message.user.user_metadata?.full_name || message.user.user_metadata?.name,
              avatar_url: message.user.user_metadata?.avatar_url,
              googleToken: message.user.provider_token
            },
            isLoading: false,
            isAuthenticated: true,
            hasGoogleAccess: !!message.user.provider_token
          }
          
          console.log("🔄 Updating auth state from message:", newAuthState)
          setAuthState(newAuthState)
          onAuthChange?.(newAuthState)
        }
        
        // Также проверяем статус через API для подтверждения
        setTimeout(checkAuthStatus, 500)
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    // Периодически проверяем статус авторизации
    const interval = setInterval(checkAuthStatus, 5000)

    return () => {
      clearInterval(interval)
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [onAuthChange])

  const handleGoogleSignIn = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const response = await chrome.runtime.sendMessage({
        type: "GOOGLE_SIGN_IN"
      })

      if (response?.success) {
        // После успешной авторизации обновляем состояние
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "CHECK_AUTH_STATUS" })
            .then((statusResponse) => {
              if (statusResponse?.success) {
                setAuthState(statusResponse.authState)
                onAuthChange?.(statusResponse.authState)
              }
            })
        }, 1000)
      } else {
        console.error("Google sign in failed:", response?.error)
        // Показываем пользователю понятное сообщение об ошибке
        if (response?.error?.includes("Google OAuth не настроен")) {
          alert("⚠️ Google OAuth не настроен\n\nДля работы с Google Drive нужно:\n1. Создать Google Cloud Project\n2. Настроить OAuth credentials\n3. Добавить Client ID в .env файл\n\nПодробная инструкция в файле GOOGLE_OAUTH_SETUP.md")
        } else {
          alert(`Ошибка авторизации: ${response?.error || "Неизвестная ошибка"}`)
        }
        setAuthState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Google sign in error:", error)
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }

  const handleSignOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const response = await chrome.runtime.sendMessage({
        type: "SIGN_OUT"
      })

      if (response?.success) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          hasGoogleAccess: false
        })
        onAuthChange?.({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          hasGoogleAccess: false
        })
      }
    } catch (error) {
      console.error("Sign out error:", error)
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }

  if (authState.isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
        <span className="ml-2 text-sm text-gray-600">Checking authentication...</span>
      </div>
    )
  }

  if (!authState.isAuthenticated) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="text-center">
          <div className="mb-3">
            <span className="text-2xl">🔐</span>
            <h3 className="text-lg font-semibold text-gray-900 mt-2">
              Sign in to TabXport
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Connect your Google account to export tables to Google Drive
            </p>
          </div>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={authState.isLoading}
            className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 font-medium">
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3LjY0IDkuMjA0NTVDMTcuNjQgOC41NjYzNiAxNy41ODY0IDcuOTUyNzMgMTcuNDg2NCA3LjM2MzY0SDE5VjkuMjA0NTVIMTcuNjRaTTkgMTQuNzI3M0M2Ljc5MDkxIDEyLjgyNzMgNi43OTA5MSA5LjU5MDkxIDkgNy42OTA5MUM5IDUuNzkwOTEgNi43OTA5MSAyLjU1NDU1IDQuMzYzNjQgMi41NTQ1NUM0LjM2MzY0IDIuNTU0NTUgOS45NTQ1NSAyLjU1NDU1IDEzLjM2MzYgMi41NTQ1NUMxNS43OTA5IDIuNTU0NTUgMTcuNjQgNC4zOTU0NSAxNy42NCA3LjI3MjczQzE3LjY0IDEwLjE1IDE1Ljc5MDkgMTEuOTkwOSAxMy4zNjM2IDExLjk5MDlIMTJWOS4yMDQ1NUgxMy4zNjM2QzE0LjMyNzMgOS4yMDQ1NSAxNS4xNSA4LjM4MTgyIDE1LjE1IDcuNDE4MThDMTUuMTUgNi40NTQ1NSAxNC4zMjczIDUuNjMxODIgMTMuMzYzNiA1LjYzMTgySDEwLjVWMTIuNTQ1NUMxMC41IDEzLjUwOTEgOS42NzcyNyAxNC4zMzE4IDguNzEzNjQgMTQuMzMxOEM3Ljc1IDEzLjMzMTggNy41IDEyLjUwOTEgNy41IDExLjU0NTVWMTAuMTgxOEg5VjEyLjU0NTVDOSAxMi41NDU1IDkgMTQuNzI3MyA5IDE0LjcyNzNaIiBmaWxsPSIjNDI4NUY0Ii8+Cjwvc3ZnPgo="
              alt="Google"
              className="w-5 h-5"
            />
            <span>Continue with Google</span>
          </button>
          
          <p className="text-xs text-gray-500 mt-3">
            We'll only access files created by TabXport
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {authState.user?.full_name?.[0] || authState.user?.email?.[0] || "U"}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {authState.user?.full_name || "Google User"}
            </p>
            <p className="text-xs text-gray-600">{authState.user?.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-emerald-600 flex items-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
                Connected
              </span>
              {authState.hasGoogleAccess && (
                <span className="text-xs text-blue-600 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  Google Drive
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors px-2 py-1 rounded border border-gray-200 hover:border-gray-300">
          Sign out
        </button>
      </div>
    </div>
  )
} 

