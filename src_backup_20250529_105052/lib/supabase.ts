import { createClient } from '@supabase/supabase-js';

// Получаем переменные окружения
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Создаем клиент Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Типы для базы данных
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          plan_type: 'free' | 'pro';
          exports_used: number;
          exports_limit: number;
          created_at: string;
          valid_until?: string;
        };
        Insert: {
          id: string;
          email: string;
          plan_type?: 'free' | 'pro';
          exports_used?: number;
          exports_limit?: number;
          valid_until?: string;
        };
        Update: {
          plan_type?: 'free' | 'pro';
          exports_used?: number;
          exports_limit?: number;
          valid_until?: string;
        };
      };
      exports: {
        Row: {
          id: string;
          user_id: string;
          table_count: number;
          format: string;
          source: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          table_count: number;
          format: string;
          source: string;
        };
      };
    };
  };
} 