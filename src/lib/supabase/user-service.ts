import { supabase } from "../supabase"
import type {
  ExportDestination,
  PlanType,
  Subscription,
  UsageQuota,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  ExportLimitCheck,
  DailyUsageStats
} from "./types"

export interface UserData {
  profile: UserProfile
  subscription: Subscription
  quota: UsageQuota
}

// ExportLimitCheck теперь импортируется из types.ts

class UserService {
  /**
   * Получение полных данных пользователя
   */
  async getUserData(userId: string): Promise<UserData | null> {
    try {
      // Получаем профиль пользователя
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (profileError) {
        console.error("Error fetching user profile:", profileError)
        return null
      }

      // Получаем подписку
      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (subscriptionError) {
        console.error("Error fetching subscription:", subscriptionError)
        return null
      }

      // Получаем квоты
      const { data: quota, error: quotaError } = await supabase
        .from("usage_quotas")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (quotaError) {
        console.error("Error fetching usage quota:", quotaError)
        return null
      }

      return { profile, subscription, quota }
    } catch (error) {
      console.error("Error fetching user data:", error)
      return null
    }
  }

  /**
   * Создание профиля пользователя
   */
  async createUserProfile(
    data: UserProfileInsert
  ): Promise<UserProfile | null> {
    try {
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .insert(data)
        .select()
        .single()

      if (error) {
        console.error("Error creating user profile:", error)
        return null
      }

      return profile
    } catch (error) {
      console.error("Error creating user profile:", error)
      return null
    }
  }

  /**
   * Обновление профиля пользователя
   */
  async updateUserProfile(
    userId: string,
    updates: UserProfileUpdate
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", userId)

      if (error) {
        console.error("Error updating user profile:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error updating user profile:", error)
      return false
    }
  }

  /**
   * Проверка лимитов экспорта для пользователя
   */
  async checkExportLimits(
    userId: string,
    destination: ExportDestination = "download"
  ): Promise<ExportLimitCheck> {
    try {
      // Получаем данные пользователя
      const userData = await this.getUserData(userId)
      if (!userData) {
        return {
          canExport: false,
          canExportToGoogleDrive: false,
          remainingExports: 0,
          remainingGoogleDriveExports: 0,
          limitMessage: "User data not found"
        }
      }

      const { quota, subscription } = userData

      // Проверяем, нужно ли сбросить дневные лимиты
      const today = new Date().toDateString()
      const lastResetDate = quota.last_reset_date ? new Date(quota.last_reset_date).toDateString() : null
      
      if (lastResetDate !== today) {
        // Сбрасываем дневные счетчики
        await this.resetDailyLimits(userId)
        quota.exports_today = 0
        quota.last_reset_date = new Date().toISOString()
      }

      // Устанавливаем лимиты в зависимости от плана
      const dailyExportLimit = subscription.plan_type === 'free' ? 5 : -1 // Free: 5 в день, Pro: unlimited
      const googleDriveAccess = subscription.plan_type !== 'free' // Только для Pro+

      // Проверяем дневной лимит экспортов
      const canExport = dailyExportLimit === -1 || quota.exports_today < dailyExportLimit
      
      // Проверяем доступ к Google Drive
      const canExportToGoogleDrive = googleDriveAccess && (destination !== "google_drive" || canExport)

      // Вычисляем оставшиеся экспорты
      const remainingExports = dailyExportLimit === -1 
          ? -1 // Unlimited
        : Math.max(0, dailyExportLimit - quota.exports_today)

      const remainingGoogleDriveExports = googleDriveAccess 
        ? remainingExports 
        : 0

      // Формируем сообщения о лимитах
      let limitMessage: string | undefined

      if (!canExport) {
        if (subscription.plan_type === "free" && quota.exports_today >= dailyExportLimit) {
          limitMessage = `You've reached your daily limit of ${dailyExportLimit} exports. Upgrade to Pro for unlimited exports or wait until tomorrow.`
        }
      } else if (destination === "google_drive" && !googleDriveAccess) {
        limitMessage = "Google Drive export is available only for Pro subscribers."
      }

      return {
        canExport,
        canExportToGoogleDrive,
        remainingExports,
        remainingGoogleDriveExports,
        limitMessage
      }
    } catch (error) {
      console.error("Error checking export limits:", error)
      return {
        canExport: false,
        canExportToGoogleDrive: false,
        remainingExports: 0,
        remainingGoogleDriveExports: 0,
        limitMessage: "Error checking limits"
      }
    }
  }

  /**
   * Сброс дневных лимитов
   */
  private async resetDailyLimits(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usage_quotas')
        .update({
          exports_today: 0,
          last_reset_date: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error("Error resetting daily limits:", error)
      }
    } catch (error) {
      console.error("Error resetting daily limits:", error)
    }
  }

  /**
   * Увеличение счетчика экспортов
   */
  async incrementExportCount(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_daily_exports', {
        user_uuid: userId
      })

      if (error) {
        console.error("Error incrementing export count:", error)
      }
    } catch (error) {
      console.error("Error incrementing export count:", error)
    }
  }

  /**
   * Включение Google Drive для пользователя
   */
  async enableGoogleDrive(userId: string, folderId?: string): Promise<boolean> {
    try {
      const updates: UserProfileUpdate = {
        google_drive_enabled: true
      }

      if (folderId) {
        updates.google_drive_folder_id = folderId
      }

      return await this.updateUserProfile(userId, updates)
    } catch (error) {
      console.error("Error enabling Google Drive:", error)
      return false
    }
  }

  /**
   * Получение истории экспортов пользователя
   */
  async getExportHistory(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("export_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("Error fetching export history:", error)
        return []
      }

      return data
    } catch (error) {
      console.error("Error fetching export history:", error)
      return []
    }
  }

  /**
   * Проверка, нужно ли показать уведомление о лимитах
   */
  // method shouldShowLimitWarning(quota)
  shouldShowLimitWarning(quota: UsageQuota): boolean {
  // TESTING MODE: Never show limit warnings
  // удален лишний console.log тестового режима
  return false

    // Original warning logic commented out for testing
    /*
    if (quota.exports_limit === -1) return false // Unlimited plan

    const usagePercentage =
      (quota.exports_this_month / quota.exports_limit) * 100
    return usagePercentage >= 80 // Show warning at 80% usage
    */
  }

  /**
   * Получение сообщения о статусе использования
   */
  // method getUsageMessage(quota)
  getUsageMessage(quota: UsageQuota): string {
  // TESTING MODE: Always show unlimited access message
  // удален лишний console.log тестового режима
  return "🧪 ТЕСТОВЫЙ РЕЖИМ: Неограниченные экспорты ✨"

    // Original usage message logic commented out for testing
    /*
    if (quota.exports_limit === -1) {
      return "Неограниченные экспорты ✨"
    }

    const remaining = quota.exports_limit - quota.exports_this_month
    const resetDate = new Date(quota.reset_date).toLocaleDateString("ru-RU")

    if (remaining <= 0) {
      return `Лимит исчерпан. Обновится ${resetDate}`
    }

    if (remaining <= 2) {
      return `Осталось ${remaining} экспорт${remaining === 1 ? "" : "а"}. Обновится ${resetDate}`
    }

    return `Использовано ${quota.exports_this_month} из ${quota.exports_limit} экспортов`
    */
  }
}

export const userService = new UserService()
