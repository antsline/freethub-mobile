import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 環境変数からSupabase設定を取得
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数のバリデーション
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase環境変数が設定されていません');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '設定済み' : '未設定');
}

// 本番環境では環境変数が必須
const finalUrl = supabaseUrl || (() => {
  throw new Error('EXPO_PUBLIC_SUPABASE_URLが設定されていません。.envファイルを確認してください。');
})();

const finalKey = supabaseAnonKey || (() => {
  throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEYが設定されていません。.envファイルを確認してください。');
})();

// Supabaseクライアントを作成
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// データベース型定義をSupabaseに提供するための型
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      drivers: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          email: string;
          phone: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          email: string;
          phone?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          vehicle_number: string;
          last_odometer: number | null;
          current_driver_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_number: string;
          last_odometer?: number | null;
          current_driver_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_number?: string;
          last_odometer?: number | null;
          current_driver_id?: string | null;
          created_at?: string;
        };
      };
      daily_reports: {
        Row: {
          id: string;
          driver_id: string;
          vehicle_id: string;
          action_type: string;
          timestamp: string;
          location_lat: number | null;
          location_lng: number | null;
          address: string | null;
          facility_name: string | null;
          odometer: number | null;
          memo: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          vehicle_id: string;
          action_type: string;
          timestamp: string;
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          facility_name?: string | null;
          odometer?: number | null;
          memo?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          vehicle_id?: string;
          action_type?: string;
          timestamp?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          facility_name?: string | null;
          odometer?: number | null;
          memo?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
      };
      favorite_locations: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          address: string | null;
          lat: number | null;
          lng: number | null;
          visit_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          visit_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          visit_count?: number;
          created_at?: string;
        };
      };
      driver_invitations: {
        Row: {
          id: string;
          driver_id: string;
          code: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          code: string;
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          code?: string;
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}