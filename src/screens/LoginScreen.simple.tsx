import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAppStore } from '../services/store';
import { authService } from '../services/authService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

const STORAGE_KEYS = {
  COMPANY_CODE: 'company_code',
  INVITATION_CODE: 'invitation_code',
  AUTO_LOGIN: 'auto_login_enabled',
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [companyCode, setCompanyCode] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { setUser, setCompany } = useAppStore();

  // 初期化時に保存された認証情報をチェック
  useEffect(() => {
    checkAutoLogin();
  }, []);

  const checkAutoLogin = async () => {
    try {
      const [savedCompanyCode, savedInvitationCode, autoLoginEnabled] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.COMPANY_CODE),
        AsyncStorage.getItem(STORAGE_KEYS.INVITATION_CODE),
        AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOGIN),
      ]);

      if (savedCompanyCode && savedInvitationCode && autoLoginEnabled === 'true') {
        console.log('自動ログイン実行中...');
        setCompanyCode(savedCompanyCode);
        setInvitationCode(savedInvitationCode);
        
        // 自動ログイン実行
        await performLogin(savedCompanyCode, savedInvitationCode, true);
      } else {
        // 保存された値があれば入力欄に設定（自動ログインは無効）
        if (savedCompanyCode) setCompanyCode(savedCompanyCode);
        if (savedInvitationCode) setInvitationCode(savedInvitationCode);
      }
    } catch (error) {
      console.error('自動ログインチェックエラー:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const performLogin = async (company: string, invitation: string, isAutoLogin: boolean = false) => {
    if (!company.trim() || !invitation.trim()) {
      if (!isAutoLogin) {
        Alert.alert('エラー', '会社コードと招待コードを入力してください');
      }
      return false;
    }

    setIsLoading(true);

    try {
      const result = await authService.signInWithInvitationOnly(company, invitation);
      
      if (result.error || !result.data) {
        if (!isAutoLogin) {
          Alert.alert('ログインエラー', result.error || 'ログインに失敗しました');
        } else {
          // 自動ログイン失敗時は自動ログインを無効化
          await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOGIN, 'false');
          console.log('自動ログイン失敗、手動ログインが必要です');
        }
        return false;
      }

      // ログイン成功 - 認証情報を保存
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.COMPANY_CODE, company),
        AsyncStorage.setItem(STORAGE_KEYS.INVITATION_CODE, invitation),
        AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOGIN, 'true'),
      ]);

      // ストアに保存（isAuthenticatedが自動的にtrueになりナビゲーションが自動実行される）
      setUser(result.data.driver);
      setCompany(result.data.company);

      if (!isAutoLogin) {
        // 既に自動ログインが有効かどうかチェック
        const currentAutoLogin = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOGIN);
        const message = currentAutoLogin === 'true' 
          ? `${result.data.driver.name}さん、おかえりなさい！`
          : `${result.data.driver.name}さん、おかえりなさい！次回から自動ログインします。`;
        
        Alert.alert('ログイン成功', message);
      }

      return true;
      
    } catch (error: any) {
      if (!isAutoLogin) {
        Alert.alert('エラー', error.message || 'ログインに失敗しました');
      }
      console.error('ログインエラー:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    await performLogin(companyCode, invitationCode);
  };

  const handleLogout = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOGIN, 'false');
    Alert.alert('設定更新', '次回は手動ログインが必要になります');
  };

  // 初期化中の画面
  if (isInitializing) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <ActivityIndicator size="large" color={colors.white} />
        <Text style={styles.initializingText}>初期化中...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" backgroundColor={colors.primary} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.title}>FleetHub</Text>
          <Text style={styles.subtitle}>運送業向けデジタル日報</Text>
        </View>

        {/* ログインフォーム */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>ログイン</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>会社コード</Text>
            <TextInput
              style={styles.input}
              placeholder="会社コードを入力"
              value={companyCode}
              onChangeText={setCompanyCode}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>招待コード</Text>
            <TextInput
              style={styles.input}
              placeholder="招待コードを入力"
              value={invitationCode}
              onChangeText={setInvitationCode}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>ログイン</Text>
            )}
          </TouchableOpacity>

          {/* 自動ログイン無効化ボタン（デバッグ用） */}
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={handleLogout}
          >
            <Text style={styles.debugButtonText}>自動ログインを無効化</Text>
          </TouchableOpacity>

          {/* 説明テキスト */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              管理者から提供された会社コードと招待コードを入力してください。
              {'\n'}
              初回ログイン成功後は自動ログインが有効になります。
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.white,
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.lightGray,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  debugButton: {
    marginTop: 16,
    padding: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  initializingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 16,
  },
  infoContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoginScreen;