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
import { RootStackParamList, LocationData } from '../types';
import { useAppStore } from '../services/store';
import { databaseService } from '../services/databaseService';
import { locationService } from '../services/locationService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'RecordConfirm'>;

const RecordConfirmScreen: React.FC<Props> = ({ route, navigation }) => {
  const { actionType, vehicle } = route.params;
  const { user, addReport } = useAppStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [odometer, setOdometer] = useState('');
  const [memo, setMemo] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [facilityName, setFacilityName] = useState('');

  // 走行距離入力が必要かどうか
  const needsOdometer = actionType === '到着' || actionType === '出発';

  useEffect(() => {
    getCurrentLocation();
    // 車両の最終走行距離を初期値として設定
    if (vehicle.last_odometer && needsOdometer) {
      setOdometer(vehicle.last_odometer.toString());
    }
  }, []);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const location = await locationService.getCurrentLocationWithAddress();
      
      if (location) {
        setLocationData(location);
        if (location.address) {
          setManualAddress(location.address);
        }
        if (location.facilityName) {
          setFacilityName(location.facilityName);
        }
      } else {
        // 位置情報が取得できない場合は手動入力を促す（エラーは表示しない）
        console.log('位置情報を手動で入力します');
      }
    } catch (error) {
      console.error('位置情報取得エラー:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleConfirm = async () => {
    if (needsOdometer && !odometer.trim()) {
      Alert.alert('入力エラー', 
        actionType === '出発' 
          ? '出発時のメーター距離を入力してください' 
          : '到着時のメーター距離を入力してください'
      );
      return;
    }

    if (!user) {
      Alert.alert('エラー', 'ユーザー情報が見つかりません');
      return;
    }

    setIsLoading(true);

    try {
      const reportData = {
        driver_id: user.id,
        vehicle_id: vehicle.id,
        action_type: actionType,
        timestamp: new Date().toISOString(),
        location_lat: locationData?.latitude,
        location_lng: locationData?.longitude,
        address: manualAddress || locationData?.address,
        facility_name: facilityName || locationData?.facilityName,
        odometer: odometer ? parseFloat(odometer) : undefined,
        memo: memo || undefined,
        photo_url: undefined, // 後で実装
      };

      const result = await databaseService.createDailyReport(reportData);
      
      if (result.error) {
        Alert.alert('記録エラー', result.error);
        return;
      }

      if (result.data) {
        addReport(result.data);
        
        // 走行距離が入力された場合、車両の最終走行距離を更新
        if (odometer) {
          await databaseService.updateVehicleOdometer(vehicle.id, parseFloat(odometer));
        }
      }

      Alert.alert(
        '記録完了',
        `${actionType}の記録が完了しました`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

    } catch (error: any) {
      Alert.alert('エラー', error.message || '記録の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = () => {
    if (['出発', '到着', '通過'].includes(actionType)) return colors.move;
    if (['積込開始', '積込完了', '荷降し開始', '荷降し完了'].includes(actionType)) return colors.work;
    if (['休憩開始', '休憩終了', '待機開始', '待機終了'].includes(actionType)) return colors.rest;
    return colors.primary;
  };

  const currentTime = format(new Date(), 'HH:mm');

  return (
    <ScrollView style={styles.container}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: getActionColor() }]}>
        <Text style={styles.headerTitle}>{actionType}</Text>
        <Text style={styles.headerSubtitle}>記録内容を確認してください</Text>
      </View>

      <View style={styles.content}>
        {/* 基本情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本情報</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>車両</Text>
            <Text style={styles.infoValue}>{vehicle.vehicle_number}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>時刻</Text>
            <Text style={styles.infoValue}>{currentTime}</Text>
          </View>
        </View>

        {/* 位置情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>位置情報</Text>
          
          {isLoadingLocation ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>位置情報を取得中...</Text>
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>住所</Text>
                <TextInput
                  style={styles.textInput}
                  value={manualAddress}
                  onChangeText={setManualAddress}
                  placeholder="住所を入力または修正"
                  multiline
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>施設名</Text>
                <TextInput
                  style={styles.textInput}
                  value={facilityName}
                  onChangeText={setFacilityName}
                  placeholder="施設名（任意）"
                />
              </View>

              <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
                <Text style={styles.refreshButtonText}>位置情報を再取得</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 走行距離（出発・到着時） */}
        {needsOdometer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {actionType === '出発' ? '出発時メーター' : '到着時メーター'} *
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>現在の走行距離（km）</Text>
              <TextInput
                style={styles.textInput}
                value={odometer}
                onChangeText={setOdometer}
                placeholder="例: 50123"
                keyboardType="numeric"
              />
              {vehicle.last_odometer && (
                <Text style={styles.hintText}>
                  {actionType === '出発' 
                    ? `前回終了時: ${vehicle.last_odometer.toLocaleString()}km`
                    : `出発時から: ${odometer && !isNaN(Number(odometer)) 
                        ? `+${(Number(odometer) - vehicle.last_odometer).toLocaleString()}km` 
                        : '---'}`
                  }
                </Text>
              )}
            </View>
          </View>
        )}

        {/* メモ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メモ（任意）</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, styles.memoInput]}
              value={memo}
              onChangeText={setMemo}
              placeholder="備考・メモを入力"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* 確認ボタン */}
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: getActionColor() }]}
          onPress={handleConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.confirmButtonText}>記録する</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: colors.textSecondary,
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
  memoInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    marginTop: 8,
  },
  refreshButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RecordConfirmScreen;