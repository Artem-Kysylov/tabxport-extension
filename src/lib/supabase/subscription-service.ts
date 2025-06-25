import { createClient } from "@supabase/supabase-js"

import {
  Database,
  Subscription,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
  UsageQuota
} from "./types"

export class SubscriptionService {
  private supabase

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey)
  }

  /**
   * Get user's current subscription with usage data
   */
  async getUserSubscription(userId: string) {
    const { data: subscription, error: subscriptionError } = await this.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      throw new Error(
        `Failed to get subscription: ${subscriptionError.message}`
      )
    }

    const { data: usage, error: usageError } = await this.supabase
      .from("usage_quotas")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (usageError && usageError.code !== "PGRST116") {
      throw new Error(`Failed to get usage: ${usageError.message}`)
    }

    const planType = (subscription?.plan_type || "free") as SubscriptionPlan
    const planConfig = SUBSCRIPTION_PLANS[planType]

    return {
      subscription: subscription || {
        id: "",
        user_id: userId,
        plan_type: "free" as SubscriptionPlan,
        status: "active" as const,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_start: null,
        current_period_end: null,
        trial_end: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      usage: usage || {
        id: "",
        user_id: userId,
        exports_this_month: 0,
        storage_used_mb: 0,
        shared_tables_count: 0,
        reset_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      planConfig
    }
  }

  /**
   * Check if user can perform an action based on their plan limits
   */
  async canPerformAction(
    userId: string,
    action: "export" | "upload" | "share",
    value: number = 1
  ): Promise<{
    allowed: boolean
    reason?: string
    current: number
    limit: number
  }> {
    // TESTING MODE: Always allow unlimited access
    console.log("🧪 TESTING MODE: Bypassing subscription limits for user:", userId, "action:", action)
    
    return {
      allowed: true,
      reason: undefined,
      current: 0,
      limit: -1 // Unlimited
    }

    // Original subscription checking code commented out for testing
    /*
    const { subscription, usage, planConfig } =
      await this.getUserSubscription(userId)

    switch (action) {
      case "export": {
        const current = usage.exports_this_month
        const limit = planConfig.limits.exportsPerMonth

        if (limit === -1) {
          // unlimited
          return { allowed: true, current, limit }
        }

        const allowed = current + value <= limit
        return {
          allowed,
          reason: allowed
            ? undefined
            : `Export limit reached (${current}/${limit})`,
          current,
          limit
        }
      }

      case "upload": {
        const current = usage.storage_used_mb
        const limit = planConfig.limits.cloudStorage

        const allowed = current + value <= limit
        return {
          allowed,
          reason: allowed
            ? undefined
            : `Storage limit reached (${current.toFixed(1)}/${limit} MB)`,
          current,
          limit
        }
      }

      case "share": {
        const current = usage.shared_tables_count
        const limit = planConfig.limits.sharedTables

        if (limit === -1) {
          // unlimited
          return { allowed: true, current, limit }
        }

        const allowed = current + value <= limit
        return {
          allowed,
          reason: allowed
            ? undefined
            : `Shared tables limit reached (${current}/${limit})`,
          current,
          limit
        }
      }

      default:
        return {
          allowed: false,
          reason: "Unknown action",
          current: 0,
          limit: 0
        }
    }
    */
  }

  /**
   * Check if a file format is allowed for user's plan
   */
  async isFormatAllowed(userId: string, format: string): Promise<boolean> {
    // TESTING MODE: Allow all formats
    console.log("🧪 TESTING MODE: Allowing all formats for user:", userId, "format:", format)
    return true

    // Original format checking code commented out for testing
    /*
    const { planConfig } = await this.getUserSubscription(userId)
    return planConfig.limits.exportFormats.includes(format.toUpperCase())
    */
  }

  /**
   * Check if file size is within limits
   */
  async isFileSizeAllowed(
    userId: string,
    fileSizeMB: number
  ): Promise<boolean> {
    // TESTING MODE: Allow all file sizes
    console.log("🧪 TESTING MODE: Allowing all file sizes for user:", userId, "size:", fileSizeMB, "MB")
    return true

    // Original file size checking code commented out for testing
    /*
    const { planConfig } = await this.getUserSubscription(userId)
    return fileSizeMB <= planConfig.limits.maxFileSize
    */
  }

  /**
   * Record an export and update usage
   */
  async recordExport(
    userId: string,
    exportData: {
      tableName: string
      format: string
      rowCount: number
      fileSizeMB: number
      platform?: string
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    // Check if export is allowed
    const exportCheck = await this.canPerformAction(userId, "export", 1)
    if (!exportCheck.allowed) {
      throw new Error(exportCheck.reason || "Export not allowed")
    }

    // Check format
    const formatAllowed = await this.isFormatAllowed(userId, exportData.format)
    if (!formatAllowed) {
      throw new Error(`Format ${exportData.format} not allowed for your plan`)
    }

    // Check file size
    const sizeAllowed = await this.isFileSizeAllowed(
      userId,
      exportData.fileSizeMB
    )
    if (!sizeAllowed) {
      const { planConfig } = await this.getUserSubscription(userId)
      throw new Error(
        `File size ${exportData.fileSizeMB}MB exceeds limit of ${planConfig.limits.maxFileSize}MB`
      )
    }

    // Record export in history
    const { error: historyError } = await this.supabase
      .from("export_history")
      .insert({
        user_id: userId,
        table_name: exportData.tableName,
        format: exportData.format,
        row_count: exportData.rowCount,
        file_size_mb: exportData.fileSizeMB,
        platform: exportData.platform,
        metadata: exportData.metadata || {}
      })

    if (historyError) {
      throw new Error(`Failed to record export: ${historyError.message}`)
    }

    // Update usage
    const { error: usageError } = await this.supabase.rpc("increment_usage", {
      user_uuid: userId,
      usage_type: "exports",
      increment_value: 1
    })

    if (usageError) {
      throw new Error(`Failed to update usage: ${usageError.message}`)
    }
  }

  /**
   * Upgrade/downgrade user subscription
   */
  async updateSubscription(
    userId: string,
    newPlan: SubscriptionPlan,
    stripeData?: {
      customerId: string
      subscriptionId: string
      periodStart: string
      periodEnd: string
    }
  ): Promise<void> {
    const updateData: any = {
      plan_type: newPlan,
      updated_at: new Date().toISOString()
    }

    if (stripeData) {
      updateData.stripe_customer_id = stripeData.customerId
      updateData.stripe_subscription_id = stripeData.subscriptionId
      updateData.current_period_start = stripeData.periodStart
      updateData.current_period_end = stripeData.periodEnd
    }

    const { error } = await this.supabase.from("subscriptions").upsert({
      user_id: userId,
      ...updateData
    })

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`)
    }
  }

  /**
   * Get user's export history with pagination
   */
  async getExportHistory(
    userId: string,
    options?: {
      limit?: number
      offset?: number
      format?: string
      platform?: string
    }
  ) {
    let query = this.supabase
      .from("export_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (options?.format) {
      query = query.eq("format", options.format)
    }

    if (options?.platform) {
      query = query.eq("platform", options.platform)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      )
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get export history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get usage statistics for dashboard
   */
  async getUsageStats(userId: string) {
    const { subscription, usage, planConfig } =
      await this.getUserSubscription(userId)

    // Get exports this month
    const { data: monthlyExports, error: exportsError } = await this.supabase
      .from("export_history")
      .select("id, file_size_mb, format, created_at")
      .eq("user_id", userId)
      .gte(
        "created_at",
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        ).toISOString()
      )

    if (exportsError) {
      throw new Error(`Failed to get monthly exports: ${exportsError.message}`)
    }

    // Calculate format distribution
    const formatStats = (monthlyExports || []).reduce(
      (acc, exp) => {
        acc[exp.format] = (acc[exp.format] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      subscription,
      planConfig,
      usage: {
        exports: {
          current: usage.exports_this_month,
          limit: planConfig.limits.exportsPerMonth,
          percentage:
            planConfig.limits.exportsPerMonth === -1
              ? 0
              : Math.round(
                  (usage.exports_this_month /
                    planConfig.limits.exportsPerMonth) *
                    100
                )
        },
        storage: {
          current: usage.storage_used_mb,
          limit: planConfig.limits.cloudStorage,
          percentage: Math.round(
            (usage.storage_used_mb / planConfig.limits.cloudStorage) * 100
          )
        },
        sharedTables: {
          current: usage.shared_tables_count,
          limit: planConfig.limits.sharedTables,
          percentage:
            planConfig.limits.sharedTables === -1
              ? 0
              : Math.round(
                  (usage.shared_tables_count / planConfig.limits.sharedTables) *
                    100
                )
        }
      },
      stats: {
        totalExportsThisMonth: monthlyExports?.length || 0,
        totalDataExported: (monthlyExports || []).reduce(
          (sum, exp) => sum + exp.file_size_mb,
          0
        ),
        formatDistribution: formatStats,
        averageFileSize: monthlyExports?.length
          ? monthlyExports.reduce((sum, exp) => sum + exp.file_size_mb, 0) /
            monthlyExports.length
          : 0
      }
    }
  }

  /**
   * Clean up old export history based on plan retention
   */
  async cleanupOldHistory(userId: string): Promise<void> {
    const { planConfig } = await this.getUserSubscription(userId)
    const retentionDays = planConfig.limits.historyRetention

    if (retentionDays === -1) return // unlimited retention

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const { error } = await this.supabase
      .from("export_history")
      .delete()
      .eq("user_id", userId)
      .lt("created_at", cutoffDate.toISOString())

    if (error) {
      throw new Error(`Failed to cleanup old history: ${error.message}`)
    }
  }

  /**
   * Check if user is on trial
   */
  async isOnTrial(userId: string): Promise<boolean> {
    const { subscription } = await this.getUserSubscription(userId)

    if (!subscription.trial_end) return false

    return new Date(subscription.trial_end) > new Date()
  }

  /**
   * Get days remaining in trial
   */
  async getTrialDaysRemaining(userId: string): Promise<number> {
    const { subscription } = await this.getUserSubscription(userId)

    if (!subscription.trial_end) return 0

    const trialEnd = new Date(subscription.trial_end)
    const now = new Date()

    if (trialEnd <= now) return 0

    return Math.ceil(
      (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  }
}
