import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Driver, Company, Vehicle, DailyReport } from '../types';

interface AppStore {
  // ユーザー情報
  user: Driver | null;
  company: Company | null;
  
  // 業務状態
  currentVehicle: Vehicle | null;
  isWorkingDay: boolean;
  todayReports: DailyReport[];
  
  // 認証状態
  isAuthenticated: boolean;
  
  // アクション
  setUser: (user: Driver | null) => void;
  setCompany: (company: Company | null) => void;
  setCurrentVehicle: (vehicle: Vehicle | null) => void;
  setWorkingDay: (isWorking: boolean) => void;
  addReport: (report: DailyReport) => void;
  setTodayReports: (reports: DailyReport[]) => void;
  clearReport: () => void;
  logout: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // 初期状態
  user: null,
  company: null,
  currentVehicle: null,
  isWorkingDay: false,
  todayReports: [],
  isAuthenticated: false,

  // アクション
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user 
  }),

  setCompany: (company) => set({ company }),

  setCurrentVehicle: (vehicle) => set({ currentVehicle: vehicle }),

  setWorkingDay: (isWorking) => set({ isWorkingDay: isWorking }),

  addReport: (report) => set((state) => ({
    todayReports: [...state.todayReports, report],
  })),

  setTodayReports: (reports) => set({ todayReports: reports }),

  clearReport: () => set({ todayReports: [] }),

  logout: async () => {
    // 自動ログイン設定を無効化
    try {
      await AsyncStorage.setItem('auto_login_enabled', 'false');
    } catch (error) {
      console.error('自動ログイン無効化エラー:', error);
    }
    
    set({
      user: null,
      company: null,
      currentVehicle: null,
      isWorkingDay: false,
      todayReports: [],
      isAuthenticated: false,
    });
  },
}));

// オフライン用の一時ストレージ
interface OfflineStore {
  pendingReports: Omit<DailyReport, 'id' | 'created_at'>[];
  addPendingReport: (report: Omit<DailyReport, 'id' | 'created_at'>) => void;
  removePendingReport: (index: number) => void;
  clearPendingReports: () => void;
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  pendingReports: [],
  
  addPendingReport: (report) => set((state) => ({
    pendingReports: [...state.pendingReports, report],
  })),
  
  removePendingReport: (index) => set((state) => ({
    pendingReports: state.pendingReports.filter((_, i) => i !== index),
  })),
  
  clearPendingReports: () => set({ pendingReports: [] }),
}));