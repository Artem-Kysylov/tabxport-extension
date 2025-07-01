import { supabase } from "./supabase"

export interface GoogleAuthConfig {
  scopes: string[]
  redirectTo?: string
}

// Scopes для Google Drive API и Google Sheets API
export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.file", // Создание и редактирование файлов
  "https://www.googleapis.com/auth/spreadsheets" // Создание и редактирование Google Sheets
]

// Аутентификация через Google с нужными scopes
export const signInWithGoogle = async (config?: GoogleAuthConfig) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: config?.scopes?.join(" ") || GOOGLE_DRIVE_SCOPES.join(" "),
      redirectTo: config?.redirectTo || "https://yuvilstnuaetzmszvegw.supabase.co/auth/v1/callback",
      queryParams: {
        access_type: "offline", // Для refresh token
        prompt: "consent" // Принудительный запрос разрешений
      }
    }
  })

  return { data, error }
}

// Получение Google Access Token из сессии Supabase
export const getGoogleAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error || !session) {
    console.error("No active session:", error)
    return null
  }

  // Google токен хранится в provider_token
  return session.provider_token || null
}

// Проверка активной сессии и Google токена
export const checkGoogleAuth = async () => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { isAuthenticated: false, hasGoogleAccess: false }
  }

  const token = await getGoogleAccessToken()

  return {
    isAuthenticated: true,
    hasGoogleAccess: !!token,
    user,
    googleToken: token
  }
}

// Обновление Google токена (если нужно)
export const refreshGoogleToken = async () => {
  const { data, error } = await supabase.auth.refreshSession()

  if (error) {
    console.error("Failed to refresh session:", error)
    return null
  }

  return data.session?.provider_token || null
}
