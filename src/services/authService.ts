import { supabase } from './supabase';
import { Driver, Company, ApiResponse } from '../types';

interface AuthResponse {
  driver: Driver;
  company: Company;
  accessToken: string;
}

class SimpleAuthService {
  // 招待コードのみでのログイン（デモ用シンプル版）
  async signInWithInvitationOnly(companyCode: string, invitationCode: string): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('ログイン試行:', { companyCode, invitationCode });
      
      // 1. 会社コードから会社を検索
      console.log('検索する会社コード:', `"${companyCode}"`, '文字数:', companyCode.length);
      
      // まず全ての会社を取得してデバッグ
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name');
      console.log('データベースの全会社:', allCompanies);
      
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .eq('name', companyCode)
        .limit(1);

      console.log('会社検索結果:', { companies, companyError });

      if (companyError) {
        console.error('会社検索エラー:', companyError);
        return { data: null, error: `会社検索エラー: ${companyError.message}` };
      }
      
      if (!companies || companies.length === 0) {
        return { data: null, error: '会社コードが見つかりません' };
      }

      const company = companies[0];
      console.log('見つかった会社:', company);

      // 2. 招待コードを検証
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

      console.log('招待コード検索結果:', { invitations, invitationError });

      if (invitationError) {
        console.error('招待コード検索エラー:', invitationError);
        return { data: null, error: `招待コード検索エラー: ${invitationError.message}` };
      }
      
      if (!invitations || invitations.length === 0) {
        return { data: null, error: '招待コードが無効または期限切れです' };
      }

      const invitation = invitations[0];
      const driver = invitation.drivers as any;
      console.log('見つかった招待コードとドライバー:', { invitation, driver });

      // 3. ドライバーの会社IDが一致するかチェック
      if (driver.company_id !== company.id) {
        console.error('会社IDの不一致:', { driverCompanyId: driver.company_id, companyId: company.id });
        return { data: null, error: 'ドライバーと会社の組み合わせが正しくありません' };
      }

      // 4. 招待コードを使用済みにマークしない（デモ用なので再利用可能）
      // await supabase
      //   .from('driver_invitations')
      //   .update({ used: true })
      //   .eq('id', invitation.id);

      console.log('ログイン成功');
      return {
        data: {
          driver: driver,
          company: company,
          accessToken: 'demo_token',
        },
        error: null,
      };
    } catch (error: any) {
      console.error('ログイン処理でエラー:', error);
      return { data: null, error: error.message || 'ログインに失敗しました' };
    }
  }

  // パスワードでのログイン（将来実装）
  async signInWithInvitation(companyCode: string, invitationCode: string, password: string): Promise<ApiResponse<AuthResponse>> {
    // 現在はシンプル版と同じ処理
    return this.signInWithInvitationOnly(companyCode, invitationCode);
  }

  // 新規ユーザー登録（将来実装）
  async signUpWithInvitation(
    companyCode: string, 
    invitationCode: string, 
    email: string, 
    password: string
  ): Promise<ApiResponse<AuthResponse>> {
    // 現在はシンプル版と同じ処理
    return this.signInWithInvitationOnly(companyCode, invitationCode);
  }

  // ログアウト
  async signOut(): Promise<ApiResponse<void>> {
    return { data: null, error: null };
  }

  // 現在のセッション情報を取得
  async getCurrentSession(): Promise<ApiResponse<AuthResponse>> {
    return { data: null, error: 'セッションが見つかりません' };
  }
}

export const authService = new SimpleAuthService();