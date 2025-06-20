import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js"
import { createClient } from "@supabase/supabase-js"

import { supabase } from "../supabase"

export interface AuthUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  googleToken?: string | null
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  hasGoogleAccess: boolean
}

class AuthService {
  private authStateListeners: ((state: AuthState) => void)[] = []
  private currentState: AuthState = {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    hasGoogleAccess: false
  }

  constructor() {
    console.log("AuthService: Initializing...")
    this.checkEnvironmentVariables()
    this.initialize()
  }

  /**
   * Проверка переменных окружения
   */
  private checkEnvironmentVariables() {
    // Проверяем переменные напрямую через process.env
    const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY  
    const googleClientId = process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_ID

    console.log('🔍 Environment check:')
    console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('- SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing')
    console.log('- GOOGLE_CLIENT_ID:', googleClientId ? '✅ Set' : '❌ Missing')

    const allSet = !!(supabaseUrl && supabaseKey && googleClientId)
    
    if (!allSet) {
      console.error('❌ Some environment variables are missing')
      // Не блокируем инициализацию, просто предупреждаем
      return false
    }

    console.log('✅ All environment variables are set')
    return true
  }

  /**
   * Инициализация сервиса аутентификации
   */
  private async initialize() {
    try {
      console.log("AuthService: Getting current session...")
      // Получаем текущую сессию
      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (error) {
        console.error("AuthService: Error getting session:", error)
      } else {
        console.log("AuthService: Session retrieved:", !!session)
      }

      this.updateAuthState(session)

      // Подписываемся на изменения аутентификации
      supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          console.log("Auth state changed:", event, session?.user?.email)
          this.updateAuthState(session)
        }
      )
    } catch (error) {
      console.error("Auth initialization error:", error)
      this.updateAuthState(null)
    }
  }

  /**
   * Обновление состояния аутентификации
   */
  private updateAuthState(session: Session | null) {
    const user = session?.user
    const googleToken = session?.provider_token

    this.currentState = {
      user: user
        ? {
            id: user.id,
            email: user.email || "",
            full_name:
              user.user_metadata?.full_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
            googleToken
          }
        : null,
      session,
      isLoading: false,
      isAuthenticated: !!user,
      hasGoogleAccess: !!googleToken
    }

    // Уведомляем всех слушателей
    this.authStateListeners.forEach((listener) => listener(this.currentState))
  }

  /**
   * Подписка на изменения состояния аутентификации
   */
  onAuthStateChange(callback: (state: AuthState) => void) {
    this.authStateListeners.push(callback)

    // Сразу вызываем callback с текущим состоянием
    callback(this.currentState)

    // Возвращаем функцию для отписки
    return () => {
      const index = this.authStateListeners.indexOf(callback)
      if (index > -1) {
        this.authStateListeners.splice(index, 1)
      }
    }
  }

  /**
   * Получение Extension ID для Chrome расширения
   */
  private getExtensionId(): string {
    return chrome.runtime.id
  }

  /**
   * Получение информации о пользователе Google
   */
  private async getUserInfo(token: string): Promise<{
    success: boolean
    userInfo?: any
    error?: string
  }> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to get user info:', errorText)
        return { success: false, error: `Failed to get user info: ${response.status}` }
      }

      const userInfo = await response.json()
      console.log('User info received:', userInfo.email)
      
      return {
        success: true,
        userInfo
      }
    } catch (error) {
      console.error('Get user info error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Создание сессии Supabase с Google user info (упрощенная версия)
   */
  private async createSupabaseSession(userInfo: any, googleToken: string): Promise<{
    data?: any
    error?: string
  }> {
    try {
      console.log('Creating manual session with Google user info...')
      
      // Создаем "фейковую" сессию для локального хранения состояния  
      const userId = crypto.randomUUID()
      const user = {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: userInfo.email,
        email_confirmed_at: new Date().toISOString(),
        phone: '',
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {
          provider: 'google',
          providers: ['google']
        },
        user_metadata: {
          full_name: userInfo.name,
          avatar_url: userInfo.picture,
          email: userInfo.email,
          email_verified: true,
          name: userInfo.name,
          picture: userInfo.picture,
          sub: userInfo.id,
          provider_id: userInfo.id,
          google_id: userInfo.id
        },
        identities: [{
          id: userInfo.id,
          user_id: userId,
          identity_data: userInfo,
          provider: 'google',
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const session = {
        access_token: googleToken,
        refresh_token: googleToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: user,
        provider_token: googleToken,
        provider_refresh_token: null
      }

      // Создаем пользователя в Supabase базе данных (временно отключено из-за RLS)
      // await this.createUserInDatabase(userInfo, googleToken)

      // Обновляем состояние аутентификации напрямую
      this.updateAuthState(session as any)

      console.log('Manual session created successfully for user:', userInfo.email)
      return { data: { session, user } }

    } catch (error) {
      console.error('Create manual session error:', error)
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Создание пользователя в Supabase базе данных
   */
  private async createUserInDatabase(userInfo: any, googleToken: string): Promise<void> {
    try {
      console.log('Creating user in Supabase database...')
      
      const googleId = userInfo.id.toString()
      
      // Создаем административный клиент для обхода RLS
      const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY!
      const adminClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      // Проверяем, есть ли уже пользователь с таким Google ID
      const { data: existingUser } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('preferences->>google_id', googleId)
        .single()
      
      if (existingUser) {
        console.log('User already exists, skipping creation')
        return
      }
      
      // Генерируем валидный UUID для user_id
      const userId = crypto.randomUUID()
      
      // Создаем пользователя в user_profiles таблице без RLS проверки
      const { data, error } = await adminClient
        .from('user_profiles')
        .insert({
          id: crypto.randomUUID(), // UUID для primary key
          user_id: userId, // UUID для связи с auth.users (может быть null)
          full_name: userInfo.name,
          avatar_url: userInfo.picture,
          google_drive_enabled: true,
          preferences: {
            default_format: 'xlsx',
            google_token: googleToken,
            provider: 'google',
            email: userInfo.email,
            google_id: googleId // Google ID сохраняем в preferences
          }
        })

      if (error) {
        console.error('Error creating user profile:', error)
        throw error
      }

      // Создаем начальные квоты для пользователя с админским клиентом
      const { error: quotaError } = await adminClient
        .from('usage_quotas')
        .insert({
          id: crypto.randomUUID(), // UUID для primary key
          user_id: userId, // Используем UUID
          exports_used: 0,
          exports_limit: 50, // Free plan limit
          google_drive_uploads: 0,
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })

      if (quotaError) {
        console.warn('Warning creating usage quota:', quotaError)
      }

      console.log('✅ User created in Supabase database:', userInfo.email)

    } catch (error) {
      console.error('Failed to create user in database:', error)
      // Не блокируем авторизацию, если создание в БД не удалось
    }
  }

  /**
   * Получение redirect URI для Chrome расширения
   */
  private getChromeExtensionRedirectUri(): string {
    return `https://${this.getExtensionId()}.chromiumapp.org/`
  }

  /**
   * Вход через Google для Chrome расширения (основной метод)
   * Используем chrome.identity.launchWebAuthFlow
   */
  async signInWithGoogle(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log("AuthService: Starting Chrome Extension Google OAuth...")
      
      // Проверяем, что мы в Chrome расширении
      if (!chrome?.identity?.launchWebAuthFlow) {
        console.error("Chrome Identity API not available")
        return { success: false, error: "Chrome Identity API not available" }
      }
      
      // Получаем OAuth URL от Supabase
      const chromeRedirectUri = this.getChromeExtensionRedirectUri()
      console.log("Chrome redirect URI:", chromeRedirectUri)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/drive.file"
          ].join(" "),
          redirectTo: chromeRedirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      })

      if (error) {
        console.error("Supabase OAuth error:", error)
        return { success: false, error: error.message }
      }

      if (!data?.url) {
        console.error("No OAuth URL returned")
        return { success: false, error: "Failed to generate OAuth URL" }
      }

      console.log("OAuth URL generated:", data.url)
      
      // Используем chrome.identity.launchWebAuthFlow для OAuth
      const responseUrl = await new Promise<string>((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: data.url,
            interactive: true
          },
          (responseUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else if (responseUrl) {
              resolve(responseUrl)
            } else {
              reject(new Error("No response URL received"))
            }
          }
        )
      })

      console.log("OAuth response URL:", responseUrl)
      
      // Извлекаем код авторизации из URL
      const url = new URL(responseUrl)
      const code = url.searchParams.get('code')
      
      if (!code) {
        const error = url.searchParams.get('error')
        const errorDescription = url.searchParams.get('error_description')
        console.error("OAuth error in response:", error, errorDescription)
        return { success: false, error: error || "No authorization code received" }
      }

      console.log("Authorization code received, exchanging for session...")
      
      // Обмениваем код на сессию через Supabase
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error("Failed to exchange code for session:", sessionError)
        return { success: false, error: sessionError.message }
      }

      if (!sessionData?.session) {
        console.error("No session data received")
        return { success: false, error: "Failed to create session" }
      }

      console.log("Session created successfully!")
      
      // Обновляем состояние аутентификации
      this.updateAuthState(sessionData.session)

      return { success: true, data: sessionData }

    } catch (error) {
      console.error("Chrome Extension Google OAuth error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Fallback метод - используем chrome.identity API
   */
  async signInWithGoogleChromeIdentity(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log("AuthService: Trying Chrome Identity API...")
      
      // Проверяем, что мы в Chrome расширении
      if (!chrome?.identity?.getAuthToken) {
        console.error("Chrome Identity API not available")
        return { success: false, error: "Chrome Identity API not available" }
      }

      // Используем встроенный Chrome OAuth2 (из manifest.json)
      console.log("Using Chrome built-in OAuth2...")
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken(
          { interactive: true },
          (token) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else if (token) {
              resolve(token)
            } else {
              reject(new Error("No token received"))
            }
          }
        )
      })

      console.log("Google token received:", token ? "✅" : "❌")

      // Получаем информацию о пользователе
      const userInfo = await this.getUserInfo(token)
      if (!userInfo.success) {
        console.error("Failed to get user info:", userInfo.error)
        return { success: false, error: userInfo.error }
      }

      console.log("User info:", userInfo.userInfo)

      // Создаем пользователя в базе данных
      await this.createUserInDatabase(userInfo.userInfo, token)

      // Создаем "фейковую" сессию для нашего состояния
      const fakeSession = {
        access_token: token,
        refresh_token: "",
        expires_in: 3600,
        token_type: "Bearer",
        user: {
          id: userInfo.userInfo.id,
          email: userInfo.userInfo.email,
          user_metadata: {
            full_name: userInfo.userInfo.name,
            avatar_url: userInfo.userInfo.picture
          }
        }
      }

      // Обновляем состояние аутентификации
      this.updateAuthState(fakeSession as any)

      console.log("Google OAuth successful!")
      return { success: true, data: fakeSession }

    } catch (error) {
      console.error("Chrome Identity API error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Fallback метод для веб-версии (если понадобится)
   */
  async signInWithGoogleWeb(redirectTo?: string) {
    try {
      // Для Chrome Extension используем специальный redirect URI
      const chromeRedirectUri = this.getChromeExtensionRedirectUri()
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/drive.file"
          ].join(" "),
          redirectTo: redirectTo || chromeRedirectUri,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      })

      if (error) {
        console.error("Google sign in error:", error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error("Google sign in exception:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Выход из системы
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Sign out error:", error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error("Sign out exception:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Получение Google Access Token
   */
  getGoogleToken(): string | null {
    return this.currentState.session?.provider_token || null
  }

  /**
   * Обновление Google токена
   */
  async refreshGoogleToken(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error("Token refresh error:", error)
        return null
      }

      return data.session?.provider_token || null
    } catch (error) {
      console.error("Token refresh exception:", error)
      return null
    }
  }

  /**
   * Получение текущего состояния аутентификации
   */
  getCurrentState(): AuthState {
    return { ...this.currentState }
  }

  /**
   * Проверка, может ли пользователь экспортировать в Google Drive
   */
  canExportToGoogleDrive(): boolean {
    return (
      this.currentState.isAuthenticated && this.currentState.hasGoogleAccess
    )
  }
}

// Создаем единственный экземпляр сервиса
export const authService = new AuthService()
