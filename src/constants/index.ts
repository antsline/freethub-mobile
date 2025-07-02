export * from './colors';

// アイコンサイズの定義
export const iconSizes = {
  small: 12,    // タグ、補助的な要素
  medium: 16,   // ボタン、リスト項目
  large: 24,    // ヘッダー、重要なアクション
};

// よく使用するアイコンの定義
export const iconNames = {
  // お気に入り
  favoriteEmpty: 'favorite-border',
  favoriteFilled: 'favorite',
  
  // アクション
  add: 'add',
  refresh: 'refresh',
  edit: 'edit',
  delete: 'delete',
  back: 'arrow-back',
  forward: 'arrow-forward',
  
  // ナビゲーション
  home: 'home',
  settings: 'settings',
  logout: 'logout',
  
  // 車両・業務
  vehicle: 'directions-car',
  start: 'play-arrow',
  stop: 'stop',
  pause: 'pause',
  
  // 施設カテゴリ
  delivery: 'local-shipping',
  parking: 'local-parking',
  fuel: 'local-gas-station',
  location: 'place',
} as const;

// FontAwesome5 アイコン
export const fontAwesome5Icons = {
  coffee: 'coffee',
} as const;

// アプリケーション定数
export const APP_NAME = 'FleetHub';
export const APP_VERSION = '1.0.0';

// API設定
export const API_TIMEOUT = 10000; // 10秒

// GPS設定
export const GPS_TIMEOUT = 5000; // 5秒
export const GPS_HIGH_ACCURACY = true;

// 地域設定
export const DEFAULT_REGION = {
  latitude: 35.6762,
  longitude: 139.6503,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// ストレージキー
export const STORAGE_KEYS = {
  USER_SESSION: 'userSession',
  OFFLINE_REPORTS: 'offlineReports',
  APP_SETTINGS: 'appSettings',
} as const;

// アクション種別グループ
export const ACTION_GROUPS = {
  MOVE: ['出発', '到着', '通過'],
  WORK: ['積込開始', '積込完了', '荷降し開始', '荷降し完了'],
  REST: ['休憩開始', '休憩終了', '待機開始', '待機終了'],
} as const;