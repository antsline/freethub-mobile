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
  Modal,
  FlatList,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { format } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { RootStackParamList, LocationData, FavoriteLocation } from '../types';
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
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<{ name: string; address: string; types?: string[]; distance?: number; isFavorite?: boolean; favoriteCategory?: string }>>([]);
  const [showPlacesPicker, setShowPlacesPicker] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMorePlaces, setHasMorePlaces] = useState(false);
  const [isLoadingMorePlaces, setIsLoadingMorePlaces] = useState(false);
  
  // お気に入り関連
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [favoriteCategory, setFavoriteCategory] = useState<'delivery' | 'rest' | 'fuel' | 'parking' | 'other'>('delivery');
  const [favoriteMemo, setFavoriteMemo] = useState('');
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);

  // 走行距離入力が必要かどうか
  const needsOdometer = actionType === '到着' || actionType === '出発';

  // カテゴリラベル取得
  const getCategoryLabel = (category: string) => {
    const labels = {
      delivery: '配送先',
      rest: '休憩場所',
      fuel: '燃料補給',
      parking: '駐車場',
      other: 'その他',
    };
    return labels[category as keyof typeof labels] || category;
  };

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
      
      if (location && user) {
        setLocationData(location);
        
        // 近くのお気に入りをチェック
        const nearbyFavorites = await databaseService.getNearbyFavorites(
          user.id,
          location.latitude,
          location.longitude,
          0.5 // 500m以内
        );

        // お気に入りが見つかった場合は優先表示
        if (nearbyFavorites.data && nearbyFavorites.data.length > 0) {
          const closestFavorite = nearbyFavorites.data[0];
          setManualAddress(closestFavorite.address || location.address || '');
          setFacilityName(closestFavorite.name);
          
          // 訪問回数を増加
          await databaseService.incrementLocationVisit(
            user.id,
            closestFavorite.name,
            closestFavorite.address || ''
          );
        } else {
          // お気に入りがない場合は通常の処理
          if (location.address) {
            setManualAddress(location.address);
          }
          if (location.facilityName) {
            setFacilityName(location.facilityName);
          }
        }
        
        if (location.nearbyPlaces) {
          const placesWithFavorites = await markFavoritesInPlaces(location.nearbyPlaces);
          setNearbyPlaces(placesWithFavorites);
        }
        if (location.nextPageToken) {
          setNextPageToken(location.nextPageToken);
        }
        if (location.hasMorePlaces !== undefined) {
          setHasMorePlaces(location.hasMorePlaces);
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

  const loadMorePlaces = async () => {
    if (!nextPageToken || !locationData || isLoadingMorePlaces) return;

    setIsLoadingMorePlaces(true);
    try {
      const result = await locationService.getNearbyPlaces(
        locationData.latitude, 
        locationData.longitude, 
        200, 
        nextPageToken
      );
      
      if (result.places.length > 0) {
        const newPlacesWithFavorites = await markFavoritesInPlaces(result.places);
        setNearbyPlaces(prev => [...prev, ...newPlacesWithFavorites]);
        setNextPageToken(result.nextPageToken);
        setHasMorePlaces(result.hasMore);
      }
    } catch (error) {
      console.error('追加の施設取得エラー:', error);
    } finally {
      setIsLoadingMorePlaces(false);
    }
  };

  // 施設リストにお気に入り情報をマーク
  const markFavoritesInPlaces = async (places: Array<{ name: string; address: string; types?: string[]; distance?: number }>) => {
    if (!user) return places;

    try {
      const favorites = await databaseService.getFavoriteLocations(user.id, 100);
      if (!favorites.data) return places;

      return places.map(place => {
        const favorite = favorites.data?.find(fav => 
          fav.name.toLowerCase() === place.name.toLowerCase() ||
          (fav.address && place.address && fav.address.includes(place.address.substring(0, 10)))
        );

        return {
          ...place,
          isFavorite: !!favorite,
          favoriteCategory: favorite?.category,
        };
      });
    } catch (error) {
      console.error('お気に入り情報の取得エラー:', error);
      return places;
    }
  };

  const handleSaveFavorite = async () => {
    if (!user || !manualAddress.trim() || !facilityName.trim()) {
      Alert.alert('入力エラー', '住所と施設名を入力してください');
      return;
    }

    setIsSavingFavorite(true);
    try {
      const favoriteData = {
        company_id: user.company_id,
        driver_id: user.id,
        name: facilityName.trim(),
        address: manualAddress.trim(),
        lat: locationData?.latitude,
        lng: locationData?.longitude,
        category: favoriteCategory,
        memo: favoriteMemo.trim() || undefined,
        visit_count: 1,
        last_visited: new Date().toISOString(),
        created_by: 'manual' as const,
        is_active: true,
      };

      const result = await databaseService.createFavoriteLocation(favoriteData);
      
      if (result.error) {
        Alert.alert('登録エラー', result.error);
        return;
      }

      Alert.alert(
        '登録完了',
        'お気に入りに登録されました',
        [{ 
          text: 'OK', 
          onPress: () => {
            setShowFavoriteModal(false);
            setFavoriteMemo('');
          }
        }]
      );

    } catch (error: any) {
      Alert.alert('エラー', error.message || 'お気に入りの登録に失敗しました');
    } finally {
      setIsSavingFavorite(false);
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
        timestamp: zonedTimeToUtc(new Date(), 'Asia/Tokyo').toISOString(),
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
                <View style={styles.facilityInputContainer}>
                  <TextInput
                    style={[styles.textInput, styles.facilityInput]}
                    value={facilityName}
                    onChangeText={setFacilityName}
                    placeholder="施設名（任意）"
                  />
                  {nearbyPlaces.length > 0 && (
                    <TouchableOpacity 
                      style={styles.dropdownButton}
                      onPress={() => setShowPlacesPicker(true)}
                    >
                      <Text style={styles.dropdownButtonText}>▼ 他の候補</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
                  <Text style={styles.refreshButtonText}>位置情報を再取得</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.favoriteButton} 
                  onPress={() => setShowFavoriteModal(true)}
                  disabled={!manualAddress.trim() || !facilityName.trim()}
                >
                  <View style={styles.buttonContent}>
                    <MaterialIcons name="favorite-border" size={16} color={colors.white} />
                    <Text style={styles.favoriteButtonText}>お気に入り登録</Text>
                  </View>
                </TouchableOpacity>
              </View>
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

      {/* 施設名選択モーダル */}
      <Modal
        visible={showPlacesPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlacesPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>施設を選択</Text>
            <FlatList
              data={nearbyPlaces}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.placeItem}
                  onPress={() => {
                    setFacilityName(item.name);
                    setShowPlacesPicker(false);
                  }}
                >
                  <View style={styles.placeItemHeader}>
                    <Text style={styles.placeName}>{item.name}</Text>
                    {item.isFavorite && (
                      <View style={styles.favoriteTag}>
                        <View style={styles.favoriteTagContent}>
                          <MaterialIcons name="favorite" size={12} color="#B8860B" />
                          <Text style={styles.favoriteTagText}>
                            お気に入り
                            {item.favoriteCategory && ` (${getCategoryLabel(item.favoriteCategory)})`}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                  <Text style={styles.placeAddress}>{item.address}</Text>
                </TouchableOpacity>
              )}
            />
            
            {/* さらに探すボタン */}
            {hasMorePlaces && (
              <TouchableOpacity
                style={[styles.loadMoreButton, isLoadingMorePlaces && styles.loadMoreButtonDisabled]}
                onPress={loadMorePlaces}
                disabled={isLoadingMorePlaces}
              >
                {isLoadingMorePlaces ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.buttonContent}>
                    <MaterialIcons name="add" size={16} color={colors.primary} />
                    <Text style={styles.loadMoreButtonText}>さらに探す</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPlacesPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* お気に入り登録モーダル */}
      <Modal
        visible={showFavoriteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFavoriteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>お気に入りに登録</Text>
            
            {/* 登録内容確認 */}
            <View style={styles.favoritePreview}>
              <Text style={styles.favoritePreviewLabel}>住所</Text>
              <Text style={styles.favoritePreviewValue}>{manualAddress}</Text>
              
              <Text style={styles.favoritePreviewLabel}>施設名</Text>
              <Text style={styles.favoritePreviewValue}>{facilityName}</Text>
            </View>

            {/* カテゴリ選択 */}
            <View style={styles.categorySection}>
              <Text style={styles.categoryLabel}>分類</Text>
              <View style={styles.categoryButtons}>
                {[
                  { key: 'delivery', label: '配送先', iconName: 'local-shipping', iconSet: 'MaterialIcons' },
                  { key: 'rest', label: '休憩場所', iconName: 'coffee', iconSet: 'FontAwesome5' },
                  { key: 'fuel', label: '燃料補給', iconName: 'local-gas-station', iconSet: 'MaterialIcons' },
                  { key: 'parking', label: '駐車場', iconName: 'local-parking', iconSet: 'MaterialIcons' },
                  { key: 'other', label: 'その他', iconName: 'place', iconSet: 'MaterialIcons' },
                ].map((category) => (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.categoryButton,
                      favoriteCategory === category.key && styles.categoryButtonSelected
                    ]}
                    onPress={() => setFavoriteCategory(category.key as any)}
                  >
                    <View style={styles.categoryIconContainer}>
                      {category.iconSet === 'MaterialIcons' ? (
                        <MaterialIcons 
                          name={category.iconName as any} 
                          size={16} 
                          color={favoriteCategory === category.key ? colors.white : colors.text}
                        />
                      ) : (
                        <FontAwesome5 
                          name={category.iconName as any} 
                          size={14} 
                          color={favoriteCategory === category.key ? colors.white : colors.text}
                        />
                      )}
                    </View>
                    <Text style={[
                      styles.categoryText,
                      favoriteCategory === category.key && styles.categoryTextSelected
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* メモ入力 */}
            <View style={styles.memoSection}>
              <Text style={styles.memoLabel}>メモ（任意）</Text>
              <TextInput
                style={styles.memoInput}
                value={favoriteMemo}
                onChangeText={setFavoriteMemo}
                placeholder="注意事項や特記事項があれば入力"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* ボタン */}
            <View style={styles.favoriteModalButtons}>
              <TouchableOpacity
                style={styles.favoriteCancelButton}
                onPress={() => setShowFavoriteModal(false)}
              >
                <Text style={styles.favoriteCancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.favoriteSaveButton, isSavingFavorite && styles.favoriteSaveButtonDisabled]}
                onPress={handleSaveFavorite}
                disabled={isSavingFavorite}
              >
                {isSavingFavorite ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.favoriteSaveButtonText}>登録する</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
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
  facilityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityInput: {
    flex: 1,
    marginRight: 8,
  },
  dropdownButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  dropdownButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  placeItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  placeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  placeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  placeAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  favoriteTag: {
    backgroundColor: '#FFE4B5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DAA520',
  },
  favoriteTagContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  favoriteTagText: {
    fontSize: 12,
    color: '#B8860B',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  loadMoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadMoreButtonDisabled: {
    opacity: 0.6,
  },
  loadMoreButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  favoriteButton: {
    flex: 1,
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favoriteButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  favoritePreview: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  favoritePreviewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  favoritePreviewValue: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIconContainer: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: colors.white,
  },
  memoSection: {
    marginBottom: 16,
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.lightGray,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  favoriteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  favoriteCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  favoriteCancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  favoriteSaveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  favoriteSaveButtonDisabled: {
    opacity: 0.6,
  },
  favoriteSaveButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
});

export default RecordConfirmScreen;