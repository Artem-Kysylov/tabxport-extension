import { supabase } from '../supabase'
import type { Session } from '@supabase/supabase-js'

interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: any
}

export class SessionManager {
  private static readonly STORAGE_KEY = 'tablexport_session'
  private static refreshTimeout: NodeJS.Timeout | null = null

  /**
   * Сохраняет сессию в chrome.storage и настраивает автообновление
   */
  static async saveSession(session: Session): Promise<void> {
    try {
      const storedSession: StoredSession = {
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
        expires_at: Date.now() + (session.expires_in || 3600) * 1000,
        user: session.user
      }
      await chrome.storage.local.set({ [this.STORAGE_KEY]: storedSession })
      // удалён лишний console.log
      this.scheduleTokenRefresh(session.expires_in || 3600)
    } catch (error) {
      console.error('❌ Failed to save session:', error)
    }
  }

  /**
   * Загружает сессию из storage и проверяет её актуальность
   */
  static async loadSession(): Promise<Session | null> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY)
      const storedSession: StoredSession = result[this.STORAGE_KEY]
      if (!storedSession) {
        // удалён лишний console.log
        return null
      }
      if (Date.now() >= storedSession.expires_at) {
        // удалён лишний console.log
        return await this.refreshSession(storedSession.refresh_token)
      }
      const session: Session = {
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token,
        expires_in: Math.floor((storedSession.expires_at - Date.now()) / 1000),
        token_type: 'bearer',
        user: storedSession.user
      }
      // удалён лишний console.log
      this.scheduleTokenRefresh(session.expires_in)
      return session
    } catch (error) {
      console.error('❌ Failed to load session:', error)
      return null
    }
  }

  /**
   * Обновляет токен доступа используя refresh_token
   */
  static async refreshSession(refreshToken: string): Promise<Session | null> {
    try {
      // удалён лишний console.log
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      })
      if (error) {
        console.error('❌ Token refresh failed:', error)
        await this.clearSession()
        return null
      }
      if (data.session) {
        // удалён лишний console.log
        await this.saveSession(data.session)
        return data.session
      }
      return null
    } catch (error) {
      console.error('❌ Failed to refresh session:', error)
      await this.clearSession()
      return null
    }
  }

  /**
   * Удаляет сессию из storage и отменяет автообновление
   */
  static async clearSession(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.STORAGE_KEY)
      if (this.refreshTimeout) {
        clearTimeout(this.refreshTimeout)
        this.refreshTimeout = null
      }
      // удалён лишний console.log
    } catch (error) {
      console.error('❌ Failed to clear session:', error)
    }
  }

  /**
   * Планирует автоматическое обновление токена
   */
  private static scheduleTokenRefresh(expiresIn: number): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout)
    }
    const refreshIn = Math.max(60, expiresIn - 300) * 1000
    this.refreshTimeout = setTimeout(async () => {
      // удалён лишний console.log
      const currentSession = await this.loadSession()
      if (currentSession && currentSession.refresh_token) {
        await this.refreshSession(currentSession.refresh_token)
      }
    }, refreshIn)
    // удалён лишний console.log
  }

  /**
   * Проверяет, авторизован ли пользователь
   */
  static async isAuthenticated(): Promise<boolean> {
    const session = await this.loadSession()
    return session !== null
  }

  /**
   * Получает текущего пользователя
   */
  static async getCurrentUser(): Promise<any | null> {
    const session = await this.loadSession()
    return session?.user || null
  }
}