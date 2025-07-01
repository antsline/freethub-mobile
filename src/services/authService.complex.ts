import { supabase } from './supabase';
import { Driver, Company, ApiResponse } from '../types';

interface AuthResponse {
  driver: Driver;
  company: Company;
  accessToken: string;
}

interface InvitationValidationResult {
  success: boolean;
  driver_id?: string;
  company_id?: string;
  driver_name?: string;
  company_name?: string;
  error?: string;
}

class AuthService {
  // 招待コード検証（既存のパスワード設定済みユーザー向け）
  async signInWithInvitation(companyCode: string, invitationCode: string, password: string): Promise<ApiResponse<AuthResponse>> {
    try {
      // まず招待コードを検証
      const validationResult = await this.validateInvitation(companyCode, invitationCode);
      
      if (!validationResult.success || !validationResult.driver_name) {
        return { data: null, error: validationResult.error || '招待コードの検証に失敗しました' };
      }

      // Supabase Authでサインイン（メールアドレス + パスワード）
      const email = await this.getDriverEmail(validationResult.driver_id!);
      if (!email) {
        return { data: null, error: 'ドライバーのメールアドレスが見つかりません' };
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError || !authData.user) {
        return { data: null, error: 'メールアドレスまたはパスワードが正しくありません' };
      }

      // ドライバー情報と会社情報を取得
      const driverResult = await this.getDriverByAuthId(authData.user.id);
      if (!driverResult.data) {
        return { data: null, error: 'ドライバー情報の取得に失敗しました' };
      }

      const companyResult = await this.getCompany(driverResult.data.company_id);
      if (!companyResult.data) {
        return { data: null, error: '会社情報の取得に失敗しました' };
      }

      // 招待コードを使用済みにマーク
      await this.markInvitationAsUsed(invitationCode);

      return {
        data: {
          driver: driverResult.data,
          company: companyResult.data,
          accessToken: authData.session?.access_token || '',
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: error.message || 'ログインに失敗しました' };
    }
  }

  // 新規ユーザー登録（招待コード + 新規パスワード設定）
  async signUpWithInvitation(
    companyCode: string, 
    invitationCode: string, 
    email: string, 
    password: string
  ): Promise<ApiResponse<AuthResponse>> {
    try {
      // 招待コードを検証
      const validationResult = await this.validateInvitation(companyCode, invitationCode);
      
      if (!validationResult.success) {
        return { data: null, error: validationResult.error || '招待コードの検証に失敗しました' };
      }

      // Supabase Authでユーザー作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError || !authData.user) {
        return { data: null, error: authError?.message || 'ユーザー作成に失敗しました' };
      }

      // ドライバーテーブルにauth_user_idを設定
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ 
          auth_user_id: authData.user.id,
          email: email 
        })
        .eq('id', validationResult.driver_id);

      if (updateError) {
        return { data: null, error: 'ドライバー情報の更新に失敗しました' };
      }

      // 招待コードにパスワード設定済みフラグを立てる
      await supabase
        .from('driver_invitations')
        .update({ password_set: true })
        .eq('code', invitationCode);

      // ドライバー情報と会社情報を取得
      const driverResult = await this.getDriverByAuthId(authData.user.id);
      if (!driverResult.data) {
        return { data: null, error: 'ドライバー情報の取得に失敗しました' };
      }

      const companyResult = await this.getCompany(driverResult.data.company_id);
      if (!companyResult.data) {
        return { data: null, error: '会社情報の取得に失敗しました' };
      }

      return {
        data: {
          driver: driverResult.data,
          company: companyResult.data,
          accessToken: authData.session?.access_token || '',
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: error.message || 'ユーザー登録に失敗しました' };
    }
  }

  // レガシー方式：招待コードのみでのログイン（パスワード未設定ユーザー向け）
  async signInWithInvitationOnly(companyCode: string, invitationCode: string): Promise<ApiResponse<AuthResponse>> {
    try {
      // 招待コードを検証
      const validationResult = await this.validateInvitation(companyCode, invitationCode);
      
      if (!validationResult.success) {
        return { data: null, error: validationResult.error || '招待コードの検証に失敗しました' };
      }

      // ドライバー情報と会社情報を取得
      const driverResult = await this.getDriverById(validationResult.driver_id!);
      if (!driverResult.data) {
        return { data: null, error: 'ドライバー情報の取得に失敗しました' };
      }

      const companyResult = await this.getCompany(validationResult.company_id!);
      if (!companyResult.data) {
        return { data: null, error: '会社情報の取得に失敗しました' };
      }

      // 一時的なセッションを作成（auth_user_idなしのレガシーモード）
      await this.createLegacySession(driverResult.data.id);

      return {
        data: {
          driver: driverResult.data,
          company: companyResult.data,
          accessToken: 'legacy_token', // レガシーモード用のトークン
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: error.message || 'ログインに失敗しました' };
    }
  }

  // ログアウト
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { data: null, error: error.message };
      }
      return { data: null, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // 現在のセッション情報を取得
  async getCurrentSession(): Promise<ApiResponse<AuthResponse>> {
    try {
      const { data: sessionData, error } = await supabase.auth.getSession();
      
      if (error || !sessionData.session) {
        return { data: null, error: 'セッションが見つかりません' };
      }

      const driverResult = await this.getDriverByAuthId(sessionData.session.user.id);
      if (!driverResult.data) {
        return { data: null, error: 'ドライバー情報の取得に失敗しました' };
      }

      const companyResult = await this.getCompany(driverResult.data.company_id);
      if (!companyResult.data) {
        return { data: null, error: '会社情報の取得に失敗しました' };
      }

      return {
        data: {
          driver: driverResult.data,
          company: companyResult.data,
          accessToken: sessionData.session.access_token,
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  // プライベートメソッド
  private async validateInvitation(companyCode: string, invitationCode: string): Promise<InvitationValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_invitation_and_create_user', {
        company_code: companyCode,
        invitation_code: invitationCode,
        email: '', // 検証のみなので空文字
        password: '', // 検証のみなので空文字
      });

      if (error) {
        throw error;
      }

      return data as InvitationValidationResult;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getDriverEmail(driverId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('email')
        .eq('id', driverId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.email;
    } catch (error) {
      return null;
    }
  }

  private async getDriverByAuthId(authUserId: string): Promise<ApiResponse<Driver>> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  private async getDriverById(driverId: string): Promise<ApiResponse<Driver>> {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', driverId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  private async getCompany(companyId: string): Promise<ApiResponse<Company>> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  }

  private async markInvitationAsUsed(invitationCode: string): Promise<void> {
    await supabase
      .from('driver_invitations')
      .update({ used: true })
      .eq('code', invitationCode);
  }

  private async createLegacySession(driverId: string): Promise<void> {
    await supabase
      .from('user_sessions')
      .insert({
        driver_id: driverId,
        device_id: 'legacy_device',
        last_activity: new Date().toISOString(),
        is_active: true,
      });
  }
}

export const authService = new AuthService();