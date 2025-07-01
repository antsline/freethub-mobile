import { 
  Driver, 
  Vehicle, 
  DailyReport, 
  Company, 
  FavoriteLocation,
  ApiResponse,
  ActionType 
} from '../types';

// デモ用のデータベースサービス
class DemoDatabaseService {
  // デモ用のテストデータ
  private demoCompany: Company = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'テスト運送株式会社',
    created_at: new Date().toISOString()
  };

  private demoDrivers: Driver[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      company_id: '550e8400-e29b-41d4-a716-446655440000',
      name: '田中太郎',
      email: 'tanaka@test.com',
      phone: '090-1234-5678',
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      company_id: '550e8400-e29b-41d4-a716-446655440000',
      name: '佐藤次郎',
      email: 'sato@test.com',
      phone: '090-2345-6789',
      status: 'active',
      created_at: new Date().toISOString()
    }
  ];

  private demoVehicles: Vehicle[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      company_id: '550e8400-e29b-41d4-a716-446655440000',
      vehicle_number: '品川 500 あ 1234',
      last_odometer: 50000,
      current_driver_id: null,
      created_at: new Date().toISOString()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      company_id: '550e8400-e29b-41d4-a716-446655440000',
      vehicle_number: '品川 500 あ 5678',
      last_odometer: 75000,
      current_driver_id: null,
      created_at: new Date().toISOString()
    }
  ];

  private demoReports: DailyReport[] = [];

  // 認証関連
  async validateInvitation(companyCode: string, invitationCode: string): Promise<ApiResponse<Driver>> {
    // デモ用の簡単な認証
    if (companyCode.includes('テスト') && (invitationCode === 'INVITE001' || invitationCode === 'INVITE002')) {
      const driver = invitationCode === 'INVITE001' ? this.demoDrivers[0] : this.demoDrivers[1];
      return { data: driver, error: null };
    }
    
    return { data: null, error: '会社コードまたは招待コードが正しくありません' };
  }

  // ドライバー関連
  async getDriver(driverId: string): Promise<ApiResponse<Driver>> {
    const driver = this.demoDrivers.find(d => d.id === driverId);
    if (driver) {
      return { data: driver, error: null };
    }
    return { data: null, error: 'ドライバーが見つかりません' };
  }

  // 車両関連
  async getCompanyVehicles(companyId: string): Promise<ApiResponse<Vehicle[]>> {
    const vehicles = this.demoVehicles.filter(v => v.company_id === companyId);
    return { data: vehicles, error: null };
  }

  async updateVehicleDriver(vehicleId: string, driverId: string | null): Promise<ApiResponse<void>> {
    const vehicle = this.demoVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.current_driver_id = driverId;
      return { data: null, error: null };
    }
    return { data: null, error: '車両が見つかりません' };
  }

  async updateVehicleOdometer(vehicleId: string, odometer: number): Promise<ApiResponse<void>> {
    const vehicle = this.demoVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.last_odometer = odometer;
      return { data: null, error: null };
    }
    return { data: null, error: '車両が見つかりません' };
  }

  // 日報関連
  async createDailyReport(report: Omit<DailyReport, 'id' | 'created_at'>): Promise<ApiResponse<DailyReport>> {
    const newReport: DailyReport = {
      ...report,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    this.demoReports.push(newReport);
    return { data: newReport, error: null };
  }

  async getTodayReports(driverId: string, date: string): Promise<ApiResponse<DailyReport[]>> {
    const reports = this.demoReports.filter(r => 
      r.driver_id === driverId && 
      r.timestamp.startsWith(date)
    );
    return { data: reports, error: null };
  }

  // よく行く場所関連
  async getFavoriteLocations(companyId: string, limit: number = 10): Promise<ApiResponse<FavoriteLocation[]>> {
    const demoLocations: FavoriteLocation[] = [
      {
        id: '1',
        company_id: companyId,
        name: '東京駅',
        address: '東京都千代田区丸の内1丁目',
        lat: 35.6812,
        lng: 139.7671,
        visit_count: 10,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        company_id: companyId,
        name: '羽田空港',
        address: '東京都大田区羽田空港',
        lat: 35.5494,
        lng: 139.7798,
        visit_count: 8,
        created_at: new Date().toISOString()
      }
    ];
    return { data: demoLocations.slice(0, limit), error: null };
  }

  async incrementLocationVisit(companyId: string, name: string, address: string, lat?: number, lng?: number): Promise<ApiResponse<void>> {
    // デモ用なので何もしない
    return { data: null, error: null };
  }

  // 会社情報取得
  async getCompany(companyId: string): Promise<ApiResponse<Company>> {
    if (companyId === this.demoCompany.id) {
      return { data: this.demoCompany, error: null };
    }
    return { data: null, error: '会社が見つかりません' };
  }
}

export const databaseService = new DemoDatabaseService();