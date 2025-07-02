import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import { RootStackParamList, ActionType } from '../types';
import { useAppStore } from '../services/store';
import { databaseService } from '../services/databaseService';
import { colors, ACTION_GROUPS } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'Main'>;

const MainScreen: React.FC<Props> = ({ navigation }) => {
  const { user, company, currentVehicle, isWorkingDay, todayReports, setTodayReports, logout } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 本日の日付
  const tokyoTime = utcToZonedTime(new Date(), 'Asia/Tokyo');
  const today = format(tokyoTime, 'yyyy-MM-dd');
  const todayDisplay = format(tokyoTime, 'MM月dd日(E)', { locale: ja });

  // 今日の記録を取得
  const fetchTodayReports = async () => {
    if (!user) return;

    try {
      const result = await databaseService.getTodayReports(user.id, today);
      if (result.data) {
        setTodayReports(result.data);
      }
    } catch (error) {
      console.error('今日の記録取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchTodayReports();
  }, [user]);

  // リフレッシュ処理
  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchTodayReports();
    setIsRefreshing(false);
  };

  // サマリー計算
  const summary = React.useMemo(() => {
    const moveReports = todayReports.filter(r => ACTION_GROUPS.MOVE.includes(r.action_type as ActionType));
    const workReports = todayReports.filter(r => ACTION_GROUPS.WORK.includes(r.action_type as ActionType));
    
    // 走行距離（最後の到着記録の走行距離）
    const lastArrival = moveReports
      .filter(r => r.action_type === '到着' && r.odometer)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    const totalDistance = lastArrival?.odometer || 0;
    
    // 配送件数（荷降し完了の回数）
    const deliveryCount = workReports.filter(r => r.action_type === '荷降し完了').length;
    
    // 稼働時間（出発から最後の記録まで）
    const firstDeparture = moveReports.find(r => r.action_type === '出発');
    const lastRecord = todayReports.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    let workingHours = 0;
    if (firstDeparture && lastRecord) {
      const startTime = new Date(firstDeparture.timestamp);
      const endTime = new Date(lastRecord.timestamp);
      workingHours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
    }

    return {
      totalDistance,
      deliveryCount,
      workingHours,
    };
  }, [todayReports]);

  // アクションボタン押下
  const handleActionPress = (actionGroup: 'MOVE' | 'WORK' | 'REST') => {
    if (!currentVehicle) {
      Alert.alert(
        '業務開始が必要です',
        '記録を開始するには、まず業務開始で車両を選択してください。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '業務開始', onPress: () => navigation.navigate('Start') },
        ]
      );
      return;
    }

    // アクション選択画面へ遷移
    navigation.navigate('ActionSelect', { actionGroup });
  };

  // ログアウト処理
  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'ログアウト', 
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.replace('Login');
          }
        },
      ]
    );
  };

  if (!user || !company) {
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.primary} />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* ユーザー情報ヘッダー */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.dateText}>{todayDisplay}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>ログアウト</Text>
          </TouchableOpacity>
        </View>

        {/* 車両情報 */}
        <View style={styles.vehicleInfo}>
          {currentVehicle ? (
            <>
              <Text style={styles.vehicleLabel}>使用車両</Text>
              <Text style={styles.vehicleNumber}>{currentVehicle.vehicle_number}</Text>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.startWorkButton}
              onPress={() => navigation.navigate('Start')}
            >
              <Text style={styles.startWorkButtonText}>業務開始</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 本日のサマリー */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>本日のサマリー</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalDistance}km</Text>
              <Text style={styles.summaryLabel}>走行距離</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.deliveryCount}件</Text>
              <Text style={styles.summaryLabel}>配送件数</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.workingHours}時間</Text>
              <Text style={styles.summaryLabel}>稼働時間</Text>
            </View>
          </View>
        </View>

        {/* メインアクションボタン */}
        <View style={styles.actionContainer}>
          <Text style={styles.actionTitle}>記録する</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.moveButton]}
            onPress={() => handleActionPress('MOVE')}
          >
            <Text style={styles.actionButtonText}>移動</Text>
            <Text style={styles.actionSubText}>出発・到着・通過</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.workButton]}
            onPress={() => handleActionPress('WORK')}
          >
            <Text style={styles.actionButtonText}>作業</Text>
            <Text style={styles.actionSubText}>積込・荷降し</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.restButton]}
            onPress={() => handleActionPress('REST')}
          >
            <Text style={styles.actionButtonText}>休憩</Text>
            <Text style={styles.actionSubText}>休憩・待機</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.memoButton]}
            onPress={() => navigation.navigate('FieldRecord')}
          >
            <Text style={styles.actionButtonText}>現場記録</Text>
            <Text style={styles.actionSubText}>メモ・写真</Text>
          </TouchableOpacity>
        </View>

        {/* 最近の記録 */}
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>最近の記録</Text>
          {todayReports.length > 0 ? (
            todayReports
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5)
              .map((report, index) => (
                <View key={report.id} style={styles.recordItem}>
                  <View style={styles.recordHeader}>
                    <Text style={styles.recordAction}>{report.action_type}</Text>
                    <Text style={styles.recordTime}>
                      {format(utcToZonedTime(new Date(report.timestamp), 'Asia/Tokyo'), 'HH:mm', { locale: ja })}
                    </Text>
                  </View>
                  {report.address && (
                    <Text style={styles.recordAddress}>{report.address}</Text>
                  )}
                  {report.facility_name && (
                    <Text style={styles.recordFacility}>{report.facility_name}</Text>
                  )}
                </View>
              ))
          ) : (
            <Text style={styles.noRecordsText}>今日の記録はまだありません</Text>
          )}
        </View>

        {/* お気に入り管理 */}
        <View style={styles.favoriteContainer}>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => navigation.navigate('FavoriteList')}
          >
            <MaterialIcons name="favorite" size={24} color={colors.primary} />
            <Text style={styles.favoriteButtonText}>お気に入り一覧</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 業務終了ボタン */}
        {currentVehicle && (
          <View style={styles.endWorkContainer}>
            <TouchableOpacity 
              style={styles.endWorkButton}
              onPress={() => navigation.navigate('End')}
            >
              <Text style={styles.endWorkButtonText}>業務終了</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  companyName: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  dateText: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 14,
  },
  vehicleInfo: {
    backgroundColor: colors.white,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  startWorkButton: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startWorkButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionContainer: {
    margin: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  actionButton: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  moveButton: {
    backgroundColor: colors.move,
  },
  workButton: {
    backgroundColor: colors.work,
  },
  restButton: {
    backgroundColor: colors.rest,
  },
  memoButton: {
    backgroundColor: '#8B5CF6', // 紫色
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionSubText: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
  recentContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 32,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  recordItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordAction: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recordTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  recordAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  recordFacility: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  noRecordsText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 16,
    padding: 20,
  },
  favoriteContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  favoriteButton: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 12,
  },
  endWorkContainer: {
    padding: 16,
  },
  endWorkButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  endWorkButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MainScreen;