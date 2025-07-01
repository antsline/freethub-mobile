import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { authService } from './authService';

class SessionService {
  private inactivityTimer: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private lastActivityTime: number = Date.now();

  // セッション設定
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分
  private readonly SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5分ごとにチェック
  private readonly STORAGE_KEY = 'last_activity_time';

  // セッション監視を開始
  startSessionMonitoring(onSessionExpired: () => void) {
    this.updateLastActivity();
    this.startInactivityTimer(onSessionExpired);
    this.startAppStateListener(onSessionExpired);
    this.startPeriodicSessionCheck(onSessionExpired);
  }

  // セッション監視を停止
  stopSessionMonitoring() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  // アクティビティを更新
  updateLastActivity() {
    this.lastActivityTime = Date.now();
    AsyncStorage.setItem(this.STORAGE_KEY, this.lastActivityTime.toString());
  }

  // 最後のアクティビティ時刻を取得
  async getLastActivityTime(): Promise<number> {
    try {
      const storedTime = await AsyncStorage.getItem(this.STORAGE_KEY);
      return storedTime ? parseInt(storedTime, 10) : Date.now();
    } catch (error) {
      console.error('最後のアクティビティ時刻の取得に失敗:', error);
      return Date.now();
    }
  }

  // セッションが有効かチェック
  async isSessionValid(): Promise<boolean> {
    const lastActivity = await this.getLastActivityTime();
    const now = Date.now();
    return (now - lastActivity) < this.INACTIVITY_TIMEOUT;
  }

  // 非アクティブタイマーを開始
  private startInactivityTimer(onSessionExpired: () => void) {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.handleSessionExpired(onSessionExpired);
    }, this.INACTIVITY_TIMEOUT);
  }

  // アプリ状態の監視を開始
  private startAppStateListener(onSessionExpired: () => void) {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          // アプリがアクティブになったときセッションをチェック
          this.checkSessionOnResume(onSessionExpired);
        } else if (nextAppState === 'background') {
          // バックグラウンドに移行する際に最後のアクティビティ時刻を保存
          this.updateLastActivity();
        }
      }
    );
  }

  // 定期的なセッションチェックを開始
  private startPeriodicSessionCheck(onSessionExpired: () => void) {
    setInterval(async () => {
      const isValid = await this.isSessionValid();
      if (!isValid) {
        this.handleSessionExpired(onSessionExpired);
      }
    }, this.SESSION_CHECK_INTERVAL);
  }

  // アプリ復帰時のセッションチェック
  private async checkSessionOnResume(onSessionExpired: () => void) {
    const isValid = await this.isSessionValid();
    if (!isValid) {
      this.handleSessionExpired(onSessionExpired);
    } else {
      // セッションが有効な場合、タイマーをリセット
      this.updateLastActivity();
      this.startInactivityTimer(onSessionExpired);
    }
  }

  // セッション期限切れ処理
  private async handleSessionExpired(onSessionExpired: () => void) {
    console.log('セッションが期限切れになりました');
    
    // Supabaseからサインアウト
    await authService.signOut();
    
    // ローカルストレージをクリア
    await this.clearSessionData();
    
    // 監視を停止
    this.stopSessionMonitoring();
    
    // コールバック実行
    onSessionExpired();
  }

  // セッションデータをクリア
  private async clearSessionData() {
    try {
      await AsyncStorage.multiRemove([
        this.STORAGE_KEY,
        'fleethub-app-storage', // Zustandの永続化ストレージ
        'fleethub-offline-storage',
      ]);
    } catch (error) {
      console.error('セッションデータのクリアに失敗:', error);
    }
  }

  // デバイス情報を取得（セッション管理用）
  async getDeviceInfo(): Promise<{ deviceId: string; platform: string }> {
    try {
      // デバイス固有の識別子を生成または取得
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = this.generateDeviceId();
        await AsyncStorage.setItem('device_id', deviceId);
      }

      return {
        deviceId,
        platform: 'react-native', // Platform.OSでiOS/Androidを区別可能
      };
    } catch (error) {
      console.error('デバイス情報の取得に失敗:', error);
      return {
        deviceId: 'unknown',
        platform: 'react-native',
      };
    }
  }

  // デバイスIDを生成
  private generateDeviceId(): string {
    return `fleethub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // セッション統計を取得
  async getSessionStats(): Promise<{
    sessionDuration: number;
    lastActivity: Date;
    isActive: boolean;
  }> {
    const lastActivity = await this.getLastActivityTime();
    const now = Date.now();
    const sessionDuration = now - lastActivity;
    const isActive = await this.isSessionValid();

    return {
      sessionDuration,
      lastActivity: new Date(lastActivity),
      isActive,
    };
  }

  // セッションを強制終了
  async forceSignOut() {
    await this.handleSessionExpired(() => {
      // 空のコールバック
    });
  }
}

export const sessionService = new SessionService();