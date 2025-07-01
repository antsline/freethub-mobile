import { supabase } from './supabase';
import { 
  Driver, 
  Vehicle, 
  DailyReport, 
  Company, 
  FavoriteLocation,
  DriverInvitation,
  ApiResponse,
  ActionType,
  Schedule,
  ScheduleDestination,
  Expense,
  VehicleInspection,
  ReportMedia,
  DailyStatistics,
  Notification
} from '../types';

class DatabaseService {
  // 認証関連
  async validateInvitation(companyCode: string, invitationCode: string): Promise<ApiResponse<Driver>> {
    try {
      // 会社コードから会社を検索
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${companyCode}%`)
        .limit(1);

      if (companyError) throw companyError;
      if (!companies || companies.length === 0) {
        return { data: null, error: '会社コードが見つかりません' };
      }

      const company = companies[0];

      // 招待コードを検証
      const { data: invitations, error: invitationError } = await supabase
        .from('driver_invitations')
        .select(`
          id,
          driver_id,
          code,
          expires_at,
          used,
          drivers (
            id,
            company_id,
            name,
            email,
            phone,
            status
          )
        `)
        .eq('code', invitationCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (invitationError) throw invitationError;
      if (!invitations || invitations.length === 0) {
        return { data: null, error: '招待コードが無効または期限切れです' };
      }

      const invitation = invitations[0];
      const driver = invitation.drivers as any;

      // ドライバーの会社IDが一致するかチェック
      if (driver.company_id !== company.id) {
        return { data: null, error: 'ドライバーと会社の組み合わせが正しくありません' };
      }

      // 招待コードを使用済みにマーク
      await supabase
        .from('driver_invitations')
        .update({ used: true })
        .eq('id', invitation.id);

      return { data: driver, error: null };
    } catch (error: any) {
      return { data: null, error: error.message || '認証に失敗しました' };
    }
  }

  // ドライバー関連
  async getDriver(driverId: string): Promise<ApiResponse<Driver>> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 車両関連
  async getCompanyVehicles(companyId: string): Promise<ApiResponse<Vehicle[]>> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', companyId)
        .order('vehicle_number');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateVehicleDriver(vehicleId: string, driverId: string | null): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ current_driver_id: driverId })
        .eq('id', vehicleId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateVehicleOdometer(vehicleId: string, odometer: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ last_odometer: odometer })
        .eq('id', vehicleId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 日報関連
  async createDailyReport(report: Omit<DailyReport, 'id' | 'created_at'>): Promise<ApiResponse<DailyReport>> {
    try {
      const { data, error } = await supabase
        .from('daily_reports')
        .insert(report)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getTodayReports(driverId: string, date: string): Promise<ApiResponse<DailyReport[]>> {
    try {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('driver_id', driverId)
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay)
        .order('timestamp');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // よく行く場所関連
  async getFavoriteLocations(companyId: string, limit: number = 10): Promise<ApiResponse<FavoriteLocation[]>> {
    try {
      const { data, error } = await supabase
        .from('favorite_locations')
        .select('*')
        .eq('company_id', companyId)
        .order('visit_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async incrementLocationVisit(companyId: string, name: string, address: string, lat?: number, lng?: number): Promise<ApiResponse<void>> {
    try {
      // 既存の場所を検索
      const { data: existing } = await supabase
        .from('favorite_locations')
        .select('*')
        .eq('company_id', companyId)
        .eq('name', name)
        .limit(1);

      if (existing && existing.length > 0) {
        // 既存の場所の訪問回数を増加
        const { error } = await supabase
          .from('favorite_locations')
          .update({ visit_count: existing[0].visit_count + 1 })
          .eq('id', existing[0].id);

        if (error) throw error;
      } else {
        // 新しい場所を追加
        const { error } = await supabase
          .from('favorite_locations')
          .insert({
            company_id: companyId,
            name,
            address,
            lat,
            lng,
            visit_count: 1,
          });

        if (error) throw error;
      }

      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 会社情報取得
  async getCompany(companyId: string): Promise<ApiResponse<Company>> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // === 拡張機能: Phase 1.5以降対応 ===

  // 運行予定関連
  async getSchedulesByDriver(driverId: string, date: string): Promise<ApiResponse<Schedule[]>> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('driver_id', driverId)
        .eq('date', date)
        .order('created_at');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getScheduleDestinations(scheduleId: string): Promise<ApiResponse<ScheduleDestination[]>> {
    try {
      const { data, error } = await supabase
        .from('schedule_destinations')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('sequence');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateScheduleStatus(scheduleId: string, status: Schedule['status']): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', scheduleId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async completeDestination(destinationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('schedule_destinations')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString() 
        })
        .eq('id', destinationId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 経費記録関連
  async createExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<ApiResponse<Expense>> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expense)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getExpensesByDriver(driverId: string, date: string): Promise<ApiResponse<Expense[]>> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('driver_id', driverId)
        .eq('date', date)
        .order('created_at');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async updateExpenseApproval(expenseId: string, approved: boolean, approvedBy: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ 
          approved, 
          approved_by: approvedBy, 
          approved_at: new Date().toISOString() 
        })
        .eq('id', expenseId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // メディア関連
  async createReportMedia(media: Omit<ReportMedia, 'id' | 'created_at'>): Promise<ApiResponse<ReportMedia>> {
    try {
      const { data, error } = await supabase
        .from('report_media')
        .insert(media)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getReportMedia(dailyReportId: string): Promise<ApiResponse<ReportMedia[]>> {
    try {
      const { data, error } = await supabase
        .from('report_media')
        .select('*')
        .eq('daily_report_id', dailyReportId)
        .order('created_at');

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // ファイルアップロード
  async uploadFile(bucket: string, path: string, file: any): Promise<ApiResponse<{ path: string; url: string }>> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { 
        data: { 
          path: data.path, 
          url: urlData.publicUrl 
        }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 車両点検関連
  async createVehicleInspection(inspection: Omit<VehicleInspection, 'id' | 'created_at'>): Promise<ApiResponse<VehicleInspection>> {
    try {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .insert(inspection)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async getVehicleInspections(vehicleId: string, limit: number = 10): Promise<ApiResponse<VehicleInspection[]>> {
    try {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 統計関連
  async getDailyStatistics(driverId: string, date: string): Promise<ApiResponse<DailyStatistics>> {
    try {
      const { data, error } = await supabase
        .from('daily_statistics')
        .select('*')
        .eq('driver_id', driverId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = No rows found
      return { data: data || null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async calculateDailyStatistics(driverId: string, date: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.rpc('calculate_daily_statistics', {
        target_driver_id: driverId,
        target_date: date
      });

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 通知関連
  async getNotifications(driverId: string, unreadOnly: boolean = false): Promise<ApiResponse<Notification[]>> {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('driver_id', driverId);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<ApiResponse<Notification>> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 拡張版日報作成（メディア付き）
  async createDailyReportWithMedia(
    report: Omit<DailyReport, 'id' | 'created_at'>,
    mediaFiles: Array<{ type: ReportMedia['media_type']; file: any; description?: string }>
  ): Promise<ApiResponse<{ report: DailyReport; media: ReportMedia[] }>> {
    try {
      // 日報作成
      const { data: reportData, error: reportError } = await supabase
        .from('daily_reports')
        .insert(report)
        .select()
        .single();

      if (reportError) throw reportError;

      const uploadedMedia: ReportMedia[] = [];

      // メディアファイルのアップロード
      for (let i = 0; i < mediaFiles.length; i++) {
        const mediaFile = mediaFiles[i];
        const fileName = `${reportData.id}_${Date.now()}_${i}`;
        const filePath = `reports/${reportData.driver_id}/${fileName}`;

        // ファイルアップロード
        const uploadResult = await this.uploadFile('report-media', filePath, mediaFile.file);
        if (uploadResult.error) {
          console.error('ファイルアップロードエラー:', uploadResult.error);
          continue;
        }

        // メディア記録作成
        const mediaRecord = {
          daily_report_id: reportData.id,
          media_type: mediaFile.type,
          file_url: uploadResult.data!.url,
          description: mediaFile.description,
        };

        const mediaResult = await this.createReportMedia(mediaRecord);
        if (mediaResult.data) {
          uploadedMedia.push(mediaResult.data);
        }
      }

      return { 
        data: { 
          report: reportData, 
          media: uploadedMedia 
        }, 
        error: null 
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 複合クエリ：ドライバーの日次データ取得
  async getDriverDayData(driverId: string, date: string): Promise<ApiResponse<{
    reports: DailyReport[];
    expenses: Expense[];
    statistics: DailyStatistics | null;
    schedules: Schedule[];
  }>> {
    try {
      const [reportsResult, expensesResult, statisticsResult, schedulesResult] = await Promise.all([
        this.getTodayReports(driverId, date),
        this.getExpensesByDriver(driverId, date),
        this.getDailyStatistics(driverId, date),
        this.getSchedulesByDriver(driverId, date),
      ]);

      if (reportsResult.error) throw new Error(reportsResult.error);
      if (expensesResult.error) throw new Error(expensesResult.error);
      if (schedulesResult.error) throw new Error(schedulesResult.error);

      return {
        data: {
          reports: reportsResult.data || [],
          expenses: expensesResult.data || [],
          statistics: statisticsResult.data,
          schedules: schedulesResult.data || [],
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }
}

export const databaseService = new DatabaseService();