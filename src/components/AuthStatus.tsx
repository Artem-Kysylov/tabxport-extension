import React, { useEffect, useState } from "react"

import AuthDetails from "./AuthDetails"
import SubscriptionStatus from "./SubscriptionStatus"

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

  if (!authState.isAuthenticated || !authState.user) {
    return (
      <div 
        style={{
          background: '#F8F9FA',
          border: '1px solid #CDD2D0',
          borderRadius: '10px',
          padding: '20px',
          margin: '16px 16px 16px 16px' // Добавляем отступы: сверху, справа, снизу, слева
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h3 
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#062013',
              margin: '0 0 12px 0'
            }}
          >
            Sign in to TableXport
            </h3>
          <p 
            style={{
              fontSize: '12px',
              fontWeight: 'normal',
              color: '#062013',
              margin: '0 0 20px 0'
            }}
          >
              Connect your Google account to:
              • Export tables to Google Drive
              • Manage your subscription (Free & Pro plans)
              • Unlock all supported export formats: Excel, CSV, DOCX, PDF, Google Sheets
            </p>
          
          <button
            onClick={handleGoogleSignIn}
            disabled={authState.isLoading}
            style={{
              width: '100%',
              background: 'white',
              border: '1.5px solid #CDD2D0',
              color: '#062013',
              padding: '20px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}
            onMouseEnter={(e) => {
              if (!authState.isLoading) {
                e.currentTarget.style.opacity = '0.5'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "16px", height: "16px" }}>
              <g clipPath="url(#clip0_192_42)">
                <mask
                  id="mask0_192_42"
                  style={{ maskType: "luminance" }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="24"
                  height="24">
                  <path
                    d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z"
                    fill="white"
                  />
                </mask>
                <g mask="url(#mask0_192_42)">
                  <path
                    d="M-0.354736 18.8343V5.16528L8.5827 11.9998L-0.354736 18.8343Z"
                    fill="#FBBC05"
                  />
                </g>
                <mask
                  id="mask1_192_42"
                  style={{ maskType: "luminance" }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="24"
                  height="24">
                  <path
                    d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z"
                    fill="white"
                  />
                </mask>
                <g mask="url(#mask1_192_42)">
                  <path
                    d="M-0.354736 5.16537L8.5827 11.9999L12.2628 8.79293L24.8804 6.74256V-0.617676H-0.354736V5.16537Z"
                    fill="#EA4335"
                  />
                </g>
                <mask
                  id="mask2_192_42"
                  style={{ maskType: "luminance" }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="24"
                  height="24">
                  <path
                    d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z"
                    fill="white"
                  />
                </mask>
                <g mask="url(#mask2_192_42)">
                  <path
                    d="M-0.354736 18.8344L15.4172 6.74256L19.5705 7.26829L24.8804 -0.617676V24.6174H-0.354736V18.8344Z"
                    fill="#34A853"
                  />
                </g>
                <mask
                  id="mask3_192_42"
                  style={{ maskType: "luminance" }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="24"
                  height="24">
                  <path
                    d="M23.0404 9.897H12.2629V14.3657H18.4665C17.8882 17.2047 15.4698 18.8344 12.2629 18.8344C8.4776 18.8344 5.42836 15.7852 5.42836 11.9999C5.42836 8.21466 8.4776 5.16542 12.2629 5.16542C13.8926 5.16542 15.3647 5.74374 16.5213 6.69005L19.886 3.32536C17.8356 1.53787 15.207 0.433838 12.2629 0.433838C5.84894 0.433838 0.696777 5.586 0.696777 11.9999C0.696777 18.4138 5.84894 23.566 12.2629 23.566C18.0459 23.566 23.3032 19.3602 23.3032 11.9999C23.3032 11.3165 23.1981 10.5805 23.0404 9.897Z"
                    fill="white"
                  />
                </mask>
                <g mask="url(#mask3_192_42)">
                  <path
                    d="M24.8806 24.6173L8.58291 11.9998L6.47998 10.4226L24.8806 5.16528V24.6173Z"
                    fill="#4285F4"
                  />
                </g>
              </g>
              <defs>
                <clipPath id="clip0_192_42">
                  <rect width="24" height="24" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <span>Sign in with Google</span>
          </button>
          
          <p 
            style={{
              fontSize: '10px',
              color: '#062013',
              margin: '0'
            }}
          >
            We only access files created by TableXport. Your data stays private
          </p>
        </div>
      </div>
    );
  }

  // В конце компонента AuthStatus
  return <AuthDetails user={authState.user} onSignOut={handleSignOut} />;
}

