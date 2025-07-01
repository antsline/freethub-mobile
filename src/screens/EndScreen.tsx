import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { RootStackParamList, ActionType } from '../types';
import { useAppStore } from '../services/store';
import { databaseService } from '../services/databaseService';
import { colors, ACTION_GROUPS } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'End'>;

const EndScreen: React.FC<Props> = ({ navigation }) => {
  const { 
    user, 
    currentVehicle, 
    todayReports, 
    setCurrentVehicle, 
    setWorkingDay,
    setTodayReports,
    addReport 
  } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [finalOdometer, setFinalOdometer] = useState('');
  const [workSummary, setWorkSummary] = useState('');

  const today = format(new Date(), 'MM月dd日(E)', { locale: ja });

  // 本日のサマリー計算
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
    
    // 稼働時間（出発から現在まで）
    const firstDeparture = moveReports.find(r => r.action_type === '出発');
    
    let workingHours = 0;
    if (firstDeparture) {
      const startTime = new Date(firstDeparture.timestamp);
      const endTime = new Date();
      workingHours = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
    }

    return {
      totalDistance,
      deliveryCount,
      workingHours,
      totalReports: todayReports.length,
    };
  }, [todayReports]);

  useEffect(() => {
    // 最後の走行距離を初期値として設定
    if (summary.totalDistance > 0) {
      setFinalOdometer(summary.totalDistance.toString());
    }
  }, [summary.totalDistance]);

  const handleEndWork = async () => {
    if (!finalOdometer.trim()) {
      Alert.alert('入力エラー', '終了時の走行距離を入力してください');
      return;
    }

    if (!user || !currentVehicle) {
      Alert.alert('エラー', 'ユーザー情報または車両情報が見つかりません');
      return;
    }

    setIsLoading(true);

    try {
      // 業務終了の記録を作成
      const endReportData = {
        driver_id: user.id,
        vehicle_id: currentVehicle.id,
        action_type: '業務終了' as ActionType,
        timestamp: new Date().toISOString(),
        odometer: parseFloat(finalOdometer),
        memo: workSummary || undefined,
      };

      const result = await databaseService.createDailyReport(endReportData);
      
      if (result.error) {
        Alert.alert('記録エラー', result.error);
        return;
      }

      if (result.data) {
        addReport(result.data);
      }

      // 車両の最終走行距離を更新
      await databaseService.updateVehicleOdometer(currentVehicle.id, parseFloat(finalOdometer));
      
      // 車両のドライバーをクリア
      await databaseService.updateVehicleDriver(currentVehicle.id, null);

      // ストアをクリア
      setCurrentVehicle(null);
      setWorkingDay(false);

      Alert.alert(
        '業務終了',
        '本日の業務が終了しました。お疲れ様でした！',
        [{ 
          text: 'OK', 
          onPress: () => {
            // 今日の記録をクリアして、メイン画面に戻る
            setTodayReports([]);
            navigation.navigate('Main');
          }
        }]
      );

    } catch (error: any) {
      Alert.alert('エラー', error.message || '業務終了の処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentVehicle) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>業務が開始されていません</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>業務終了</Text>
        <Text style={styles.headerSubtitle}>{today}の業務を終了します</Text>
      </View>

      <View style={styles.content}>
        {/* 本日のサマリー */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>本日の業務サマリー</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalDistance}km</Text>
              <Text style={styles.summaryLabel}>走行距離</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.deliveryCount}件</Text>
              <Text style={styles.summaryLabel}>配送完了</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.workingHours}時間</Text>
              <Text style={styles.summaryLabel}>稼働時間</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.totalReports}件</Text>
              <Text style={styles.summaryLabel}>記録総数</Text>
            </View>
          </View>
        </View>

        {/* 車両情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>車両情報</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>車両番号</Text>
            <Text style={styles.infoValue}>{currentVehicle.vehicle_number}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>開始時走行距離</Text>
            <Text style={styles.infoValue}>
              {currentVehicle.last_odometer?.toLocaleString() || '未記録'}km
            </Text>
          </View>
        </View>

        {/* 終了時走行距離 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>終了時走行距離 *</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>現在の走行距離（km）</Text>
            <TextInput
              style={styles.textInput}
              value={finalOdometer}
              onChangeText={setFinalOdometer}
              placeholder="例: 50123"
              keyboardType="numeric"
            />
            <Text style={styles.hintText}>
              必ず正確な走行距離を入力してください
            </Text>
          </View>
        </View>

        {/* 業務サマリー */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>業務サマリー（任意）</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, styles.summaryInput]}
              value={workSummary}
              onChangeText={setWorkSummary}
              placeholder="本日の業務について特記事項があれば記入してください"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* 業務終了ボタン */}
        <TouchableOpacity
          style={[styles.endButton, isLoading && styles.endButtonDisabled]}
          onPress={handleEndWork}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.endButtonText}>業務終了</Text>
          )}
        </TouchableOpacity>

        {/* 注意事項 */}
        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚠️ 注意事項</Text>
          <Text style={styles.warningText}>
            • 業務終了後は車両の使用ができなくなります{'\n'}
            • 走行距離は正確に入力してください{'\n'}
            • 終了処理は取り消しできません
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: colors.error,
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.white,
    marginTop: 8,
    opacity: 0.9,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.lightGray,
  },
  summaryInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  endButton: {
    backgroundColor: colors.error,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  endButtonDisabled: {
    opacity: 0.6,
  },
  endButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: colors.warning,
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
});

export default EndScreen;