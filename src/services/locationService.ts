import * as Location from 'expo-location';
import { LocationData } from '../types';
import { GPS_TIMEOUT, GPS_HIGH_ACCURACY } from '../constants';

class LocationService {
  private isPermissionGranted = false;

  // 位置情報の権限を取得
  async requestPermission(): Promise<boolean> {
    try {
      // 既に権限がある場合はスキップ
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      if (existingStatus === 'granted') {
        this.isPermissionGranted = true;
        return true;
      }

      // カスタムアラートを表示
      const { Alert } = require('react-native');
      
      return new Promise((resolve) => {
        Alert.alert(
          '位置情報の使用許可',
          'FleetHubは日報の記録場所を自動的に取得するために、位置情報を使用します。\n\n以下の情報が記録されます：\n• 現在の住所\n• 近くの施設名\n\n位置情報を許可しますか？',
          [
            {
              text: 'キャンセル',
              onPress: () => {
                this.isPermissionGranted = false;
                resolve(false);
              },
              style: 'cancel',
            },
            {
              text: '許可する',
              onPress: async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                this.isPermissionGranted = status === 'granted';
                resolve(this.isPermissionGranted);
              },
            },
          ],
          { cancelable: false }
        );
      });
    } catch (error) {
      console.error('位置情報権限の取得に失敗:', error);
      return false;
    }
  }

  // 現在位置を取得
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      if (!this.isPermissionGranted) {
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
          const { Alert } = require('react-native');
          Alert.alert(
            '位置情報が必要です',
            '日報に記録場所を含めるには位置情報の許可が必要です。\n\n設定アプリから位置情報を許可するか、手動で住所を入力してください。',
            [{ text: '了解', style: 'default' }]
          );
          throw new Error('位置情報の権限が拒否されました');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: GPS_HIGH_ACCURACY ? Location.Accuracy.High : Location.Accuracy.Balanced,
        timeInterval: GPS_TIMEOUT,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      console.error('現在位置の取得に失敗:', error);
      return null;
    }
  }

  // 座標から住所を取得（Google Geocoding API使用）
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string | null> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === 'demo_maps_key') {
        console.warn('⚠️ Google Maps APIキーが設定されていません。位置情報の住所取得機能が制限されます。');
        return `緯度: ${latitude.toFixed(4)}, 経度: ${longitude.toFixed(4)}`;
      }

      // 位置情報の精度を制限（プライバシー保護）
      const limitedLat = parseFloat(latitude.toFixed(4));
      const limitedLng = parseFloat(longitude.toFixed(4));

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${limitedLat},${limitedLng}&key=${apiKey}&language=ja`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        return this.parseJapaneseAddress(data.results[0]);
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.warn('Google Maps API のクォータ制限に達しました');
        return `${limitedLat}, ${limitedLng}`;
      }

      return null;
    } catch (error) {
      console.error('住所の取得に失敗:', error);
      return `緯度: ${latitude.toFixed(4)}, 経度: ${longitude.toFixed(4)}`;
    }
  }

  // 近くの施設を取得（Google Places API使用）
  async getNearbyPlaces(latitude: number, longitude: number, radius: number = 100): Promise<Array<{ name: string; address: string }>> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === 'demo_maps_key') {
        console.warn('⚠️ Google Maps APIキーが設定されていません。施設名取得機能が制限されます。');
        return [];
      }

      // 位置情報の精度を制限（プライバシー保護）
      const limitedLat = parseFloat(latitude.toFixed(4));
      const limitedLng = parseFloat(longitude.toFixed(4));

      // 検索半径を制限（最大500m）
      const limitedRadius = Math.min(radius, 500);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${limitedLat},${limitedLng}&radius=${limitedRadius}&key=${apiKey}&language=ja`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK') {
        return data.results.slice(0, 5).map((place: any) => ({
          name: place.name,
          address: place.vicinity || place.formatted_address || '',
        }));
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.warn('Google Places API のクォータ制限に達しました');
        return [];
      }

      return [];
    } catch (error) {
      console.error('近くの施設の取得に失敗:', error);
      return [];
    }
  }

  // 位置情報と住所を同時に取得
  async getCurrentLocationWithAddress(): Promise<LocationData | null> {
    try {
      const location = await this.getCurrentLocation();
      if (!location) return null;

      const address = await this.getAddressFromCoordinates(location.latitude, location.longitude);
      const nearbyPlaces = await this.getNearbyPlaces(location.latitude, location.longitude);

      return {
        ...location,
        address: address || undefined,
        facilityName: nearbyPlaces.length > 0 ? nearbyPlaces[0].name : undefined,
      };
    } catch (error) {
      console.error('位置情報と住所の取得に失敗:', error);
      return null;
    }
  }

  // 日本の住所形式にパース
  private parseJapaneseAddress(result: any): string {
    try {
      const components = result.address_components;
      let address = '';

      // 都道府県、市区町村、町名を抽出
      const prefecture = components.find((c: any) => 
        c.types.includes('administrative_area_level_1'))?.long_name || '';
      const city = components.find((c: any) => 
        c.types.includes('locality') || c.types.includes('administrative_area_level_2'))?.long_name || '';
      const sublocality = components.find((c: any) => 
        c.types.includes('sublocality_level_1'))?.long_name || '';
      const streetNumber = components.find((c: any) => 
        c.types.includes('premise') || c.types.includes('street_number'))?.long_name || '';

      address = prefecture + city + sublocality + streetNumber;

      // 空の場合はformatted_addressを使用
      if (!address.trim()) {
        address = result.formatted_address;
      }

      return address;
    } catch (error) {
      console.error('住所のパースに失敗:', error);
      return result.formatted_address || '';
    }
  }

  // 2点間の距離を計算（メートル単位）
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // 地球の半径（メートル）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // ジオフェンシング：指定した場所の近くにいるかチェック
  isNearLocation(currentLat: number, currentLon: number, targetLat: number, targetLon: number, radius: number = 100): boolean {
    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon);
    return distance <= radius;
  }
}

export const locationService = new LocationService();