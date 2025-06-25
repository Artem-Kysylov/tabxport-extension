import { supabase } from "../supabase"
import type {
  ExportDestination,
  PlanType,
  Subscription,
  UsageQuota,
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate
} from "./types"

export interface UserData {
  profile: UserProfile
  subscription: Subscription
  quota: UsageQuota
}

export interface ExportLimitCheck {
  canExport: boolean
  canExportToGoogleDrive: boolean
  remainingExports: number
  remainingGoogleDriveExports: number
  limitMessage?: string
}

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
    // TESTING MODE: Always return unlimited access
    console.log("🧪 TESTING MODE: Bypassing all export limits for user:", userId)
    
    return {
      canExport: true,
      canExportToGoogleDrive: true,
      remainingExports: -1, // Unlimited
      remainingGoogleDriveExports: -1, // Unlimited
      limitMessage: undefined
    }

    // Original limit checking code commented out for testing
    /*
    try {
      // Используем RPC функцию для проверки лимитов
      const { data: canExport, error } = await supabase.rpc(
        "check_export_limit",
        {
          user_uuid: userId,
          export_destination: destination
        }
      )

      if (error) {
        console.error("Error checking export limits:", error)
        return {
          canExport: false,
          canExportToGoogleDrive: false,
          remainingExports: 0,
          remainingGoogleDriveExports: 0,
          limitMessage: "Error checking limits"
        }
      }

      // Получаем текущие квоты для подробной информации
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

      // Вычисляем оставшиеся экспорты
      const remainingExports =
        quota.exports_limit === -1
          ? -1 // Unlimited
          : Math.max(0, quota.exports_limit - quota.exports_this_month)

      const remainingGoogleDriveExports =
        quota.google_drive_limit === -1
          ? -1 // Unlimited
          : Math.max(
              0,
              quota.google_drive_limit - quota.google_drive_exports_this_month
            )

      // Определяем сообщения о лимитах
      let limitMessage: string | undefined

      if (!canExport) {
        if (
          subscription.plan_type === "free" &&
          quota.exports_this_month >= quota.exports_limit
        ) {
          limitMessage = `Вы достигли лимита ${quota.exports_limit} экспортов в месяц. Обновитесь до Pro плана для неограниченных экспортов.`
        } else if (
          destination === "google_drive" &&
          quota.google_drive_limit === 0
        ) {
          limitMessage =
            "Google Drive экспорт доступен только для Pro подписчиков."
        } else if (
          destination === "google_drive" &&
          quota.google_drive_exports_this_month >= quota.google_drive_limit
        ) {
          limitMessage =
            "Вы достигли лимита Google Drive экспортов в этом месяце."
        }
      }

      return {
        canExport: !!canExport,
        canExportToGoogleDrive: quota.google_drive_limit !== 0,
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
    */
  }

  /**
   * Увеличение счетчика использования после экспорта
   */
  async incrementUsage(
    userId: string,
    destination: ExportDestination = "download"
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc("increment_export_usage", {
        user_uuid: userId,
        export_destination: destination
      })

      if (error) {
        console.error("Error incrementing usage:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error incrementing usage:", error)
      return false
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
  shouldShowLimitWarning(quota: UsageQuota): boolean {
    // TESTING MODE: Never show limit warnings
    console.log("🧪 TESTING MODE: Hiding limit warnings for testing")
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
  getUsageMessage(quota: UsageQuota): string {
    // TESTING MODE: Always show unlimited access message
    console.log("🧪 TESTING MODE: Showing unlimited access message")
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
