import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "./supabase/types"

// Ленивая инициализация клиента Supabase
let _supabase: SupabaseClient<Database> | null = null

function createSupabaseClient(): SupabaseClient<Database> {
// Получаем переменные окружения
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

  console.log('🔧 Creating Supabase client...')
  console.log('- URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('- Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables. Please check .env file.")
}

// Создаем типизированный клиент Supabase
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce" // Рекомендуется для безопасности
  },
  global: {
    headers: {
      "X-Client-Info": "tablexport-extension"
    }
    }
  })
}

// Геттер для получения клиента с ленивой инициализацией
export const supabase: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = createSupabaseClient()
    }
    return (_supabase as any)[prop]
  }
})

// Экспортируем типы для удобства
export type { Database } from "./supabase/types"
export * from "./supabase/types"
