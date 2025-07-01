// データベース型定義
export interface Company {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  registration_number?: string; // 運送業許可番号
  created_at: string;
}

export interface Driver {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  auth_user_id?: string; // Supabase Auth UUID
  license_number?: string; // 運転免許証番号
  license_expiry?: string; // 免許証有効期限
  hire_date?: string; // 雇用開始日
  emergency_contact_name?: string; // 緊急連絡先名
  emergency_contact_phone?: string; // 緊急連絡先電話
  created_at: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  vehicle_number: string;
  last_odometer?: number;
  current_driver_id?: string;
  make?: string; // メーカー
  model?: string; // 車種
  year?: number; // 年式
  fuel_type?: string; // 燃料種別
  inspection_expiry?: string; // 車検有効期限
  insurance_expiry?: string; // 保険有効期限
  created_at: string;
}

export interface DailyReport {
  id: string;
  driver_id: string;
  vehicle_id: string;
  schedule_id?: string; // 運行予定ID
  action_type: ActionType;
  timestamp: string;
  sequence_number?: number; // 記録順序番号
  location_lat?: number;
  location_lng?: number;
  address?: string;
  facility_name?: string;
  odometer?: number;
  fuel_amount?: number; // 燃料補給量
  fuel_cost?: number; // 燃料費用
  memo?: string;
  photo_url?: string; // レガシー対応
  created_at: string;
}

export interface Schedule {
  id: string;
  schedule_number: string;
  company_id: string;
  date: string;
  driver_id?: string;
  vehicle_id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleDestination {
  id: string;
  schedule_id: string;
  sequence: number;
  destination_name: string;
  destination_address?: string;
  destination_lat?: number;
  destination_lng?: number;
  action_type: 'pickup' | 'delivery' | 'waypoint';
  estimated_time?: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  driver_id: string;
  vehicle_id?: string;
  date: string;
  type: 'fuel' | 'toll' | 'parking' | 'meal' | 'other';
  category?: string; // 詳細カテゴリ
  amount: number;
  description?: string;
  receipt_url?: string; // 領収書画像URL
  location_name?: string;
  location_address?: string;
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface VehicleInspection {
  id: string;
  vehicle_id: string;
  driver_id: string;
  date: string;
  inspection_type: 'daily' | 'weekly' | 'monthly' | 'annual';
  checklist_items: Record<string, boolean | string>; // 点検項目
  issues_found: string[]; // 発見された問題
  photos: string[]; // 点検写真URL配列
  status: 'completed' | 'issues_found' | 'requires_repair';
  next_inspection_date?: string;
  created_at: string;
}

export interface ReportMedia {
  id: string;
  daily_report_id: string;
  media_type: 'photo' | 'voice' | 'video';
  file_url: string;
  file_size?: number;
  duration?: number; // 音声・動画の長さ（秒）
  transcription?: string; // 音声の文字起こし
  description?: string;
  created_at: string;
}

export interface DailyStatistics {
  id: string;
  driver_id: string;
  vehicle_id?: string;
  date: string;
  total_distance?: number;
  total_working_hours?: number;
  total_deliveries?: number;
  total_fuel_cost?: number;
  total_other_expenses?: number;
  average_speed?: number;
  idle_time_minutes?: number;
  overtime_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: string;
  company_id: string;
  setting_key: string;
  setting_value: any; // JSONB
  description?: string;
  updated_by?: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  driver_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  action_url?: string;
  expires_at?: string;
  created_at: string;
}

export interface FavoriteLocation {
  id: string;
  company_id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  visit_count: number;
  created_at: string;
}

export interface DriverInvitation {
  id: string;
  driver_id: string;
  code: string;
  expires_at: string;
  used: boolean;
  password_set: boolean; // パスワード設定済みフラグ
  created_at: string;
}

export interface UserSession {
  id: string;
  driver_id: string;
  device_id?: string;
  last_activity: string;
  is_active: boolean;
  created_at: string;
}

// アクション種別
export type ActionType = 
  | '出発' | '到着' | '通過'
  | '積込開始' | '積込完了' | '荷降し開始' | '荷降し完了'
  | '休憩開始' | '休憩終了' | '待機開始' | '待機終了'
  | '業務終了';

// アプリの状態管理
export interface AppState {
  user: Driver | null;
  company: Company | null;
  currentVehicle: Vehicle | null;
  isWorkingDay: boolean;
  todayReports: DailyReport[];
}

// ナビゲーション
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Start: undefined;
  ActionSelect: {
    actionGroup: 'MOVE' | 'WORK' | 'REST';
  };
  RecordConfirm: {
    actionType: ActionType;
    vehicle: Vehicle;
  };
  End: undefined;
};

// API レスポンス
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// GPS位置情報
export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  facilityName?: string;
}

// 認証情報
export interface LoginCredentials {
  companyCode: string;
  invitationCode: string;
}