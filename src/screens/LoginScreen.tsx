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
import { databaseService } from '../services/databaseService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [companyCode, setCompanyCode] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { setUser, setCompany } = useAppStore();

  const handleLogin = async () => {
    if (!companyCode.trim() || !invitationCode.trim()) {
      Alert.alert('エラー', '会社コードと招待コードを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      // 招待コードを検証してドライバー情報を取得
      const result = await databaseService.validateInvitation(companyCode, invitationCode);
      
      if (result.error || !result.data) {
        Alert.alert('ログインエラー', result.error || 'ログインに失敗しました');
        return;
      }

      const driver = result.data;

      // 会社情報を取得
      const companyResult = await databaseService.getCompany(driver.company_id);
      if (companyResult.error || !companyResult.data) {
        Alert.alert('エラー', '会社情報の取得に失敗しました');
        return;
      }

      // ストアに保存
      setUser(driver);
      setCompany(companyResult.data);

      // メイン画面に遷移
      navigation.replace('Main');
      
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
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

          {/* 説明テキスト */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              管理者から提供された会社コードと招待コードを入力してください。
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
    marginBottom: 32,
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