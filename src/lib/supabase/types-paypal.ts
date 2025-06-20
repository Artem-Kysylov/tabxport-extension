// Database types for TableXport subscription system with PayPal

export type SubscriptionPlan = "free" | "pro" | "enterprise"
export type SubscriptionStatus = "active" | "cancelled" | "expired" | "trialing"
export type PaymentStatus = "succeeded" | "failed" | "pending" | "cancelled"

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          preferences: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          preferences?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_type: SubscriptionPlan
          status: SubscriptionStatus
          paypal_customer_email: string | null
          paypal_subscription_id: string | null
          paypal_plan_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type?: SubscriptionPlan
          status?: SubscriptionStatus
          paypal_customer_email?: string | null
          paypal_subscription_id?: string | null
          paypal_plan_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: SubscriptionPlan
          status?: SubscriptionStatus
          paypal_customer_email?: string | null
          paypal_subscription_id?: string | null
          paypal_plan_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          subscription_id: string
          amount: number
          currency: string
          paypal_payment_id: string | null
          paypal_transaction_id: string | null
          status: PaymentStatus
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          amount: number
          currency?: string
          paypal_payment_id?: string | null
          paypal_transaction_id?: string | null
          status?: PaymentStatus
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          amount?: number
          currency?: string
          paypal_payment_id?: string | null
          paypal_transaction_id?: string | null
          status?: PaymentStatus
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      export_history: {
        Row: {
          id: string
          user_id: string
          table_name: string
          format: string
          row_count: number
          file_size_mb: number
          platform: string | null
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          table_name: string
          format: string
          row_count?: number
          file_size_mb?: number
          platform?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          table_name?: string
          format?: string
          row_count?: number
          file_size_mb?: number
          platform?: string | null
          metadata?: Record<string, any>
          created_at?: string
        }
      }
      usage_quotas: {
        Row: {
          id: string
          user_id: string
          exports_this_month: number
          storage_used_mb: number
          shared_tables_count: number
          reset_date: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exports_this_month?: number
          storage_used_mb?: number
          shared_tables_count?: number
          reset_date?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exports_this_month?: number
          storage_used_mb?: number
          shared_tables_count?: number
          reset_date?: string
          updated_at?: string
        }
      }
      saved_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          template_data: Record<string, any>
          is_public: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          template_data: Record<string, any>
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          template_data?: Record<string, any>
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      shared_tables: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          table_data: Record<string, any>
          share_token: string
          is_public: boolean
          expires_at: string | null
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          table_data: Record<string, any>
          share_token?: string
          is_public?: boolean
          expires_at?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          table_data?: Record<string, any>
          share_token?: string
          is_public?: boolean
          expires_at?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      check_usage_limit: {
        Args: {
          user_uuid: string
          limit_type: string
          current_value?: number
        }
        Returns: boolean
      }
      increment_usage: {
        Args: {
          user_uuid: string
          usage_type: string
          increment_value?: number
        }
        Returns: void
      }
    }
  }
}

// Plan configurations with PayPal plan IDs
export interface PlanLimits {
  exportsPerMonth: number
  maxFileSize: number // MB
  cloudStorage: number // MB
  sharedTables: number
  exportFormats: string[]
  historyRetention: number // days
}

export interface PlanConfig {
  name: string
  price: number
  limits: PlanLimits
  features: string[]
  paypalPlanId?: string
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    limits: {
      exportsPerMonth: 10,
      maxFileSize: 1,
      cloudStorage: 10,
      sharedTables: 1,
      exportFormats: ["CSV", "JSON"],
      historyRetention: 7
    },
    features: [
      "10 exports per month",
      "CSV and JSON formats",
      "1 MB max file size",
      "10 MB cloud storage",
      "1 shared table",
      "7 days history"
    ]
  },
  pro: {
    name: "Pro",
    price: 9.99,
    limits: {
      exportsPerMonth: 500,
      maxFileSize: 50,
      cloudStorage: 1000,
      sharedTables: 20,
      exportFormats: ["CSV", "JSON", "XLSX", "PDF", "DOCX"],
      historyRetention: 90
    },
    features: [
      "500 exports per month",
      "All export formats",
      "50 MB max file size",
      "1 GB cloud storage",
      "20 shared tables",
      "90 days history",
      "Priority support",
      "Advanced templates"
    ],
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID
  },
  enterprise: {
    name: "Enterprise",
    price: 29.99,
    limits: {
      exportsPerMonth: -1, // unlimited
      maxFileSize: 500,
      cloudStorage: 10000,
      sharedTables: -1, // unlimited
      exportFormats: ["CSV", "JSON", "XLSX", "PDF", "DOCX", "XML"],
      historyRetention: 365
    },
    features: [
      "Unlimited exports",
      "All export formats + XML",
      "500 MB max file size",
      "10 GB cloud storage",
      "Unlimited shared tables",
      "1 year history",
      "Priority support",
      "Custom templates",
      "Team collaboration",
      "API access"
    ],
    paypalPlanId: process.env.NEXT_PUBLIC_PAYPAL_ENTERPRISE_PLAN_ID
  }
}

// PayPal specific types
export interface PayPalSubscriptionData {
  customerId: string // PayPal customer email
  subscriptionId: string // PayPal subscription ID
  planId: string // PayPal plan ID
  periodStart: string
  periodEnd: string
}

export interface PayPalWebhookEvent {
  id: string
  event_type: string
  resource_type: string
  summary: string
  resource: any
  create_time: string
}

// Helper types
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"]
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]
export type Payment = Database["public"]["Tables"]["payments"]["Row"]
export type ExportHistory =
  Database["public"]["Tables"]["export_history"]["Row"]
export type UsageQuota = Database["public"]["Tables"]["usage_quotas"]["Row"]
export type SavedTemplate =
  Database["public"]["Tables"]["saved_templates"]["Row"]
export type SharedTable = Database["public"]["Tables"]["shared_tables"]["Row"]

// Insert types
export type UserProfileInsert =
  Database["public"]["Tables"]["user_profiles"]["Insert"]
export type SubscriptionInsert =
  Database["public"]["Tables"]["subscriptions"]["Insert"]
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"]
export type ExportHistoryInsert =
  Database["public"]["Tables"]["export_history"]["Insert"]
export type UsageQuotaInsert =
  Database["public"]["Tables"]["usage_quotas"]["Insert"]
export type SavedTemplateInsert =
  Database["public"]["Tables"]["saved_templates"]["Insert"]
export type SharedTableInsert =
  Database["public"]["Tables"]["shared_tables"]["Insert"]

// Update types
export type UserProfileUpdate =
  Database["public"]["Tables"]["user_profiles"]["Update"]
export type SubscriptionUpdate =
  Database["public"]["Tables"]["subscriptions"]["Update"]
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"]
export type ExportHistoryUpdate =
  Database["public"]["Tables"]["export_history"]["Update"]
export type UsageQuotaUpdate =
  Database["public"]["Tables"]["usage_quotas"]["Update"]
export type SavedTemplateUpdate =
  Database["public"]["Tables"]["saved_templates"]["Update"]
export type SharedTableUpdate =
  Database["public"]["Tables"]["shared_tables"]["Update"]
