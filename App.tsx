import React, { useEffect } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { sessionService } from './src/services/sessionService';
import { useAppStore } from './src/services/store';

export default function App() {
  const { isAuthenticated, logout } = useAppStore();

  useEffect(() => {
    if (isAuthenticated) {
      // セッション監視を開始
      sessionService.startSessionMonitoring(() => {
        Alert.alert(
          'セッション期限切れ',
          '30分間操作がなかったため、自動的にログアウトしました。',
          [
            {
              text: 'OK',
              onPress: () => {
                logout();
              },
            },
          ]
        );
      });

      return () => {
        // セッション監視を停止
        sessionService.stopSessionMonitoring();
      };
    }
  }, [isAuthenticated, logout]);

  // アプリ内でのタッチイベント監視（アクティビティ更新用）
  const handleUserActivity = () => {
    if (isAuthenticated) {
      sessionService.updateLastActivity();
    }
  };

  return (
    <SafeAreaProvider onTouchStart={handleUserActivity}>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
