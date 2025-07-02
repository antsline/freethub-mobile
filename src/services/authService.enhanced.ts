import { supabase } from './supabase';
import { Driver, Company, ApiResponse } from '../types';

interface AuthResponse {
  driver: Driver;
  company: Company;
  accessToken: string;
}

class EnhancedAuthService {
  // 招待コード + Supabase Auth のハイブリッド認証
  async signInWithInvitationCode(companyCode: string, invitationCode: string): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('ハイブリッド認証開始:', { companyCode, invitationCode });
      
      // 1. 既存の招待コード検証ロジック
      const validationResult = await this.validateInvitationCode(companyCode, invitationCode);
      if (validationResult.error) {
        return validationResult;
      }
      
      const { driver, company } = validationResult.data!;
      
      // 2. Supabase Authユーザーを作成または取得
      const authResult = await this.createOrGetAuthUser(driver);
      if (authResult.error) {
        return { data: null, error: authResult.error };
      }
      
      // 3. ドライバーテーブルのauth_user_idを更新
      await this.linkDriverToAuthUser(driver.id, authResult.data!.user.id);
      
      return {
        data: {
          driver,
          company,
          accessToken: authResult.data!.session?.access_token || '',
        },
        error: null,
      };
      
    } catch (error: any) {
      console.error('認証エラー:', error);
      return { data: null, error: error.message };
    }
  }

  // 既存の招待コード検証ロジック
  private async validateInvitationCode(companyCode: string, invitationCode: string): Promise<ApiResponse<{ driver: Driver; company: Company }>> {
    // 会社検索
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, name, created_at')
      .eq('name', companyCode)
      .limit(1);

    if (companyError) throw companyError;
    if (!companies || companies.length === 0) {
      return { data: null, error: '会社コードが見つかりません' };
    }

    const company = companies[0];

    // 招待コード検証
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
          status,
          auth_user_id,
          created_at
        )
      `)
      .eq('code', invitationCode)
      .single();

    if (invitationError) {
      console.error('招待コード検索エラー:', invitationError);
      return { data: null, error: '招待コードが見つかりません' };
    }

    if (!invitations || !invitations.drivers) {
      return { data: null, error: '有効な招待コードが見つかりません' };
    }

    const driver = Array.isArray(invitations.drivers) 
      ? invitations.drivers[0] 
      : invitations.drivers as any;

    if (driver.company_id !== company.id) {
      return { data: null, error: '招待コードが会社と一致しません' };
    }

    // 期限チェック
    if (invitations.expires_at && new Date(invitations.expires_at) < new Date()) {
      return { data: null, error: '招待コードの有効期限が切れています' };
    }

    return {
      data: { driver, company },
      error: null,
    };
  }

  // Supabase Authユーザーを作成または取得
  private async createOrGetAuthUser(driver: Driver) {
    try {
      console.log('Supabase Auth処理開始:', driver.id);
      
      // 既存のauth_user_idがあるかチェック
      const { data: existingDriver, error: driverSelectError } = await supabase
        .from('drivers')
        .select('auth_user_id')
        .eq('id', driver.id)
        .single();

      if (driverSelectError) {
        console.error('ドライバー情報取得エラー:', driverSelectError);
        return { data: null, error: driverSelectError.message };
      }

      console.log('既存ドライバー情報:', existingDriver);

      if (existingDriver?.auth_user_id) {
        console.log('既存auth_user_id発見、サインイン試行');
        // 既存のAuthユーザーでサインイン
        const email = this.generateEmailFromDriver(driver);
        const password = this.generatePasswordFromDriver(driver);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (!error) {
          console.log('既存ユーザーでサインイン成功');
          return { data, error: null };
        } else {
          console.log('既存ユーザーサインインエラー:', error);
        }
      }

      console.log('新規Authユーザー作成');
      // 新しいAuthユーザーを作成
      const email = this.generateEmailFromDriver(driver);
      const password = this.generatePasswordFromDriver(driver);

      console.log('サインアップ実行:', { email, password: '[HIDDEN]' });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            driver_id: driver.id,
            driver_name: driver.name,
          }
        }
      });

      if (error) {
        console.error('サインアップエラー:', error);
        return { data: null, error: error.message };
      }

      console.log('サインアップ成功:', data?.user?.id);
      return { data, error: null };

    } catch (error: any) {
      console.error('createOrGetAuthUser予期しないエラー:', error);
      return { data: null, error: error.message };
    }
  }

  // ドライバーからメールアドレスを生成
  private generateEmailFromDriver(driver: Driver): string {
    // 既存のemailがあればそれを使用、なければ生成
    if (driver.email && driver.email.includes('@')) {
      return driver.email;
    }
    return `driver_${driver.id}@fleethub.local`;
  }

  // ドライバーからパスワードを生成（招待コードベース）
  private generatePasswordFromDriver(driver: Driver): string {
    // セキュアな方法で一意のパスワードを生成
    return `FleetHub_${driver.id.substring(0, 8)}_${driver.created_at.substring(0, 10)}`;
  }

  // ドライバーテーブルのauth_user_idを更新
  private async linkDriverToAuthUser(driverId: string, authUserId: string) {
    const { error } = await supabase
      .from('drivers')
      .update({ auth_user_id: authUserId })
      .eq('id', driverId);

    if (error) {
      console.error('auth_user_id更新エラー:', error);
    }
  }

  // 通常のログアウト
  async signOut(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  }

  // 現在のセッション取得
  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  // 現在のユーザー取得
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
}

export const enhancedAuthService = new EnhancedAuthService();