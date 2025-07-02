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
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { ja } from 'date-fns/locale';
import { RootStackParamList, LocationData } from '../types';
import { useAppStore } from '../services/store';
import { databaseService } from '../services/databaseService';
import { locationService } from '../services/locationService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'FieldRecord'>;

const FieldRecordScreen: React.FC<Props> = ({ navigation }) => {
  const [memo, setMemo] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const { user, currentVehicle, addReport } = useAppStore();

  useEffect(() => {
    loadCurrentLocation();
    
    // 1秒ごとに現在時刻を更新（日本時間）
    const timer = setInterval(() => {
      setCurrentDateTime(utcToZonedTime(new Date(), 'Asia/Tokyo'));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const location = await locationService.getCurrentLocation();
      setLocationData(location.data);
    } catch (error) {
      console.error('位置情報取得エラー:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // 写真関連関数
  const requestPermissions = async () => {
    try {
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraResult.status === 'granted' && mediaResult.status === 'granted';
    } catch (error) {
      return false;
    }
  };

  const showImagePickerOptions = async () => {
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    if (cameraStatus.status === 'undetermined' || mediaStatus.status === 'undetermined') {
      Alert.alert(
        '写真機能について',
        '現場の状況を記録するために写真を追加できます。\n\nカメラとフォトライブラリへのアクセス許可が必要です。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '続行', 
            onPress: async () => {
              const hasPermission = await requestPermissions();
              if (hasPermission) {
                showCameraOptions();
              }
            }
          }
        ]
      );
      return;
    }

    if (cameraStatus.status === 'granted' && mediaStatus.status === 'granted') {
      showCameraOptions();
      return;
    }

    Alert.alert(
      '権限が必要です',
      '写真機能を使用するには、端末の設定でカメラとフォトライブラリへのアクセスを許可してください。\n\n設定 > プライバシーとセキュリティ > カメラ・写真',
      [{ text: 'OK' }]
    );
  };

  const showCameraOptions = () => {
    Alert.alert(
      '写真を追加',
      '写真の追加方法を選択してください',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'カメラで撮影', onPress: takePhoto },
        { text: 'ライブラリから選択', onPress: pickImage },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('撮影エラー', '写真の撮影に失敗しました。もう一度お試しください。');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages = result.assets.map(asset => asset.uri);
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      Alert.alert('選択エラー', '写真の選択に失敗しました。もう一度お試しください。');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!memo.trim() && selectedImages.length === 0) {
      Alert.alert('入力エラー', 'メモまたは写真のいずれかを入力してください');
      return;
    }

    if (!user || !currentVehicle) {
      Alert.alert('エラー', 'ユーザー情報または車両情報が見つかりません');
      return;
    }

    setIsLoading(true);

    try {
      const reportData = {
        driver_id: user.id,
        vehicle_id: currentVehicle.id,
        action_type: '現場記録' as any,
        timestamp: zonedTimeToUtc(currentDateTime, 'Asia/Tokyo').toISOString(),
        location_lat: locationData?.latitude,
        location_lng: locationData?.longitude,
        address: locationData?.address,
        facility_name: null,
        odometer: null,
        memo: memo.trim() || null,
        photo_url: selectedImages.length > 0 ? selectedImages[0] : null, // とりあえず最初の画像のみ
      };

      const result = await databaseService.createDailyReport(reportData);
      
      if (result.error) {
        Alert.alert('保存エラー', result.error);
        return;
      }

      // 成功時にストアに追加
      if (result.data) {
        addReport(result.data);
      }

      Alert.alert(
        '保存完了',
        '現場記録を保存しました',
        [{ 
          text: 'OK', 
          onPress: () => navigation.goBack()
        }]
      );

    } catch (error: any) {
      Alert.alert('エラー', error.message || '保存に失敗しました');
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
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>現場記録</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* 日時・位置情報表示 */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>記録日時</Text>
            <Text style={styles.infoValue}>
              {format(currentDateTime, 'yyyy年MM月dd日 HH:mm:ss', { locale: ja })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
            <Text style={styles.infoLabel}>現在地</Text>
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.infoValue}>
                {locationData?.address || '位置情報を取得中...'}
              </Text>
            )}
          </View>

          {!isLoadingLocation && (
            <TouchableOpacity
              style={styles.refreshLocationButton}
              onPress={loadCurrentLocation}
            >
              <MaterialIcons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.refreshLocationText}>位置情報を更新</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* メモ入力 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="edit" size={20} color={colors.text} />
            <Text style={styles.sectionTitle}>メモ・備考</Text>
          </View>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="現場の状況や備考を入力してください"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>
            {memo.length}/500文字
          </Text>
        </View>

        {/* 写真添付 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="photo-camera" size={20} color={colors.text} />
            <Text style={styles.sectionTitle}>写真</Text>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={showImagePickerOptions}
            >
              <MaterialIcons name="add" size={20} color={colors.primary} />
              <Text style={styles.addPhotoText}>写真を追加</Text>
            </TouchableOpacity>
          </View>

          {selectedImages.length > 0 && (
            <View style={styles.imageGrid}>
              {selectedImages.map((imageUri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <MaterialIcons name="close" size={16} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {selectedImages.length === 0 && (
            <Text style={styles.noPhotosText}>
              現場の写真を追加すると、より詳細な記録を残せます
            </Text>
          )}
        </View>

        {/* 保存ボタン */}
        <TouchableOpacity
          style={[styles.saveButton, (!memo.trim() && selectedImages.length === 0) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading || (!memo.trim() && selectedImages.length === 0)}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>記録を保存</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  infoSection: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.lightGray,
    borderRadius: 16,
    marginTop: 8,
  },
  refreshLocationText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
  },
  section: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.lightGray,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.lightGray,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addPhotoText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  imageContainer: {
    position: 'relative',
    width: (Dimensions.get('window').width - 80) / 3,
    height: (Dimensions.get('window').width - 80) / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotosText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FieldRecordScreen;