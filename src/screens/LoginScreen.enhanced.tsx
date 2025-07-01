import React, { useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useAppStore } from '../services/store';
import { authService } from '../services/authService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

type LoginMode = 'invitation_only' | 'password_login' | 'first_time_setup';

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [companyCode, setCompanyCode] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('invitation_only');
  
  const { setUser, setCompany } = useAppStore();

  // レガシーモード：招待コードのみでのログイン
  const handleInvitationOnlyLogin = async () => {
    if (!companyCode.trim() || !invitationCode.trim()) {
      Alert.alert('エラー', '会社コードと招待コードを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signInWithInvitationOnly(companyCode, invitationCode);
      
      if (result.error || !result.data) {
        Alert.alert('ログインエラー', result.error || 'ログインに失敗しました');
        return;
      }

      // ストアに保存（isAuthenticatedが自動的にtrueになりナビゲーションが自動実行される）
      setUser(result.data.driver);
      setCompany(result.data.company);
      
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // パスワードでのログイン
  const handlePasswordLogin = async () => {
    if (!companyCode.trim() || !invitationCode.trim() || !password.trim()) {
      Alert.alert('エラー', '全ての項目を入力してください');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signInWithInvitation(companyCode, invitationCode, password);
      
      if (result.error || !result.data) {
        Alert.alert('ログインエラー', result.error || 'ログインに失敗しました');
        return;
      }

      // ストアに保存（isAuthenticatedが自動的にtrueになりナビゲーションが自動実行される）
      setUser(result.data.driver);
      setCompany(result.data.company);
      
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 初回セットアップ（新規ユーザー登録）
  const handleFirstTimeSetup = async () => {
    if (!companyCode.trim() || !invitationCode.trim() || !email.trim() || !password.trim()) {
      Alert.alert('エラー', '全ての項目を入力してください');
      return;
    }

    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signUpWithInvitation(companyCode, invitationCode, email, password);
      
      if (result.error || !result.data) {
        Alert.alert('登録エラー', result.error || 'ユーザー登録に失敗しました');
        return;
      }

      // ストアに保存
      setUser(result.data.driver);
      setCompany(result.data.company);

      Alert.alert(
        'ユーザー登録完了',
        'ユーザー登録が完了しました。次回からはメールアドレスとパスワードでログインできます。',
        [{ text: 'OK', onPress: () => navigation.replace('Main') }]
      );
      
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ユーザー登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => {
    switch (loginMode) {
      case 'invitation_only':
        return (
          <>
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
              onPress={handleInvitationOnlyLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>ログイン（簡易版）</Text>
              )}
            </TouchableOpacity>
          </>
        );

      case 'password_login':
        return (
          <>
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>パスワード</Text>
              <TextInput
                style={styles.input}
                placeholder="パスワードを入力"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handlePasswordLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>ログイン</Text>
              )}
            </TouchableOpacity>
          </>
        );

      case 'first_time_setup':
        return (
          <>
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>メールアドレス</Text>
              <TextInput
                style={styles.input}
                placeholder="メールアドレスを入力"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>パスワード（6文字以上）</Text>
              <TextInput
                style={styles.input}
                placeholder="パスワードを設定"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleFirstTimeSetup}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.loginButtonText}>アカウント作成</Text>
              )}
            </TouchableOpacity>
          </>
        );
    }
  };

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
          
          {/* ログインモード選択 */}
          <View style={styles.modeSelector}>
            <TouchableOpacity 
              style={[styles.modeButton, loginMode === 'invitation_only' && styles.modeButtonActive]}
              onPress={() => setLoginMode('invitation_only')}
            >
              <Text style={[styles.modeButtonText, loginMode === 'invitation_only' && styles.modeButtonTextActive]}>
                簡易ログイン
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modeButton, loginMode === 'password_login' && styles.modeButtonActive]}
              onPress={() => setLoginMode('password_login')}
            >
              <Text style={[styles.modeButtonText, loginMode === 'password_login' && styles.modeButtonTextActive]}>
                パスワード
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modeButton, loginMode === 'first_time_setup' && styles.modeButtonActive]}
              onPress={() => setLoginMode('first_time_setup')}
            >
              <Text style={[styles.modeButtonText, loginMode === 'first_time_setup' && styles.modeButtonTextActive]}>
                初回登録
              </Text>
            </TouchableOpacity>
          </View>

          {renderLoginForm()}

          {/* 説明テキスト */}
          <View style={styles.infoContainer}>
            {loginMode === 'invitation_only' && (
              <Text style={styles.infoText}>
                管理者から提供された会社コードと招待コードを入力してください。
              </Text>
            )}
            {loginMode === 'password_login' && (
              <Text style={styles.infoText}>
                既にアカウントを作成済みの方は、会社コード・招待コード・パスワードでログインしてください。
              </Text>
            )}
            {loginMode === 'first_time_setup' && (
              <Text style={styles.infoText}>
                初回利用時は、招待コードを使用してアカウントを作成してください。次回からはメールアドレスとパスワードでログインできます。
              </Text>
            )}
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
  modeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: colors.white,
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