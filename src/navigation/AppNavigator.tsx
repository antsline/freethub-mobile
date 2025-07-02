import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppStore } from '../services/store';
import { RootStackParamList } from '../types';

// スクリーンのインポート
import LoginScreen from '../screens/LoginScreen.simple';
import MainScreen from '../screens/MainScreen';
import StartScreen from '../screens/StartScreen';
import ActionSelectScreen from '../screens/ActionSelectScreen';
import RecordConfirmScreen from '../screens/RecordConfirmScreen';
import EndScreen from '../screens/EndScreen';
import FavoriteListScreen from '../screens/FavoriteListScreen';
import FavoriteEditScreen from '../screens/FavoriteEditScreen';
import FieldRecordScreen from '../screens/FieldRecordScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Main" : "Login"}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1E88E5',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          // 未認証時のスクリーン
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              title: 'FleetHub ログイン',
              headerShown: false 
            }}
          />
        ) : (
          // 認証済み時のスクリーン
          <>
            <Stack.Screen 
              name="Main" 
              component={MainScreen}
              options={{ 
                title: 'FleetHub',
                headerLeft: () => null, // 戻るボタンを非表示
              }}
            />
            <Stack.Screen 
              name="Start" 
              component={StartScreen}
              options={{ title: '業務開始' }}
            />
            <Stack.Screen 
              name="ActionSelect" 
              component={ActionSelectScreen}
              options={{ title: 'アクション選択' }}
            />
            <Stack.Screen 
              name="RecordConfirm" 
              component={RecordConfirmScreen}
              options={{ title: '記録確認' }}
            />
            <Stack.Screen 
              name="End" 
              component={EndScreen}
              options={{ title: '業務終了' }}
            />
            <Stack.Screen 
              name="FavoriteList" 
              component={FavoriteListScreen}
              options={{ 
                title: 'お気に入り一覧',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="FavoriteEdit" 
              component={FavoriteEditScreen}
              options={{ 
                title: 'お気に入り編集',
                headerShown: false 
              }}
            />
            <Stack.Screen 
              name="FieldRecord" 
              component={FieldRecordScreen}
              options={{ 
                title: '現場記録',
                headerShown: false 
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;