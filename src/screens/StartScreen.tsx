import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, Vehicle } from '../types';
import { useAppStore } from '../services/store';
import { databaseService } from '../services/databaseService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'Start'>;

const StartScreen: React.FC<Props> = ({ navigation }) => {
  const { user, company, setCurrentVehicle, setWorkingDay } = useAppStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    if (!company) {
      console.log('会社情報がありません');
      setIsLoading(false);
      return;
    }

    console.log('車両取得開始 - 会社ID:', company.id, '会社名:', company.name);

    try {
      const result = await databaseService.getCompanyVehicles(company.id);
      console.log('車両取得結果:', result);
      
      if (result.data) {
        console.log('取得した車両数:', result.data.length);
        setVehicles(result.data);
      } else if (result.error) {
        console.error('車両取得エラー:', result.error);
        Alert.alert('エラー', result.error);
      }
    } catch (error: any) {
      console.error('車両取得例外:', error);
      Alert.alert('エラー', error.message || '車両情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWork = async () => {
    if (!selectedVehicle || !user) {
      Alert.alert('エラー', '車両を選択してください');
      return;
    }

    try {
      // 車両のドライバーを更新
      const result = await databaseService.updateVehicleDriver(selectedVehicle.id, user.id);
      if (result.error) {
        Alert.alert('エラー', result.error);
        return;
      }

      // ストアを更新
      setCurrentVehicle(selectedVehicle);
      setWorkingDay(true);

      Alert.alert(
        '業務開始',
        `${selectedVehicle.vehicle_number}での業務を開始しました`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('エラー', error.message || '業務開始に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>車両情報を読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>業務開始</Text>
        <Text style={styles.subtitle}>使用する車両を選択してください</Text>
      </View>

      <View style={styles.vehicleContainer}>
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleItem,
                selectedVehicle?.id === vehicle.id && styles.vehicleItemSelected,
                vehicle.current_driver_id && vehicle.current_driver_id !== user?.id && styles.vehicleItemDisabled,
              ]}
              onPress={() => {
                if (vehicle.current_driver_id && vehicle.current_driver_id !== user?.id) {
                  Alert.alert('使用中', 'この車両は他のドライバーが使用中です');
                  return;
                }
                setSelectedVehicle(vehicle);
              }}
              disabled={vehicle.current_driver_id !== null && vehicle.current_driver_id !== user?.id}
            >
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleNumber}>{vehicle.vehicle_number}</Text>
                {vehicle.last_odometer && (
                  <Text style={styles.lastOdometer}>
                    前回終了時: {vehicle.last_odometer.toLocaleString()}km
                  </Text>
                )}
              </View>
              {vehicle.current_driver_id && vehicle.current_driver_id !== user?.id && (
                <Text style={styles.inUseText}>使用中</Text>
              )}
              {selectedVehicle?.id === vehicle.id && (
                <Text style={styles.selectedText}>選択中</Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noVehiclesContainer}>
            <Text style={styles.noVehiclesText}>利用可能な車両がありません</Text>
          </View>
        )}
      </View>

      {selectedVehicle && (
        <View style={styles.startContainer}>
          <TouchableOpacity style={styles.startButton} onPress={handleStartWork}>
            <Text style={styles.startButtonText}>業務開始</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    padding: 20,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  vehicleContainer: {
    padding: 16,
  },
  vehicleItem: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleItemSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  vehicleItemDisabled: {
    opacity: 0.5,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  lastOdometer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  inUseText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  selectedText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  noVehiclesContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
  },
  noVehiclesText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  startContainer: {
    padding: 16,
  },
  startButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  startButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default StartScreen;