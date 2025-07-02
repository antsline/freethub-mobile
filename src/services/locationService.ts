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
  async getNearbyPlaces(
    latitude: number, 
    longitude: number, 
    radius: number = 200, 
    pageToken?: string
  ): Promise<{ 
    places: Array<{ name: string; address: string; types?: string[]; distance?: number }>;
    nextPageToken?: string;
    hasMore: boolean;
  }> {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey || apiKey === 'demo_maps_key') {
        console.warn('⚠️ Google Maps APIキーが設定されていません。施設名取得機能が制限されます。');
        return { places: [], hasMore: false };
      }

      // 位置情報の精度を制限（プライバシー保護）
      const limitedLat = parseFloat(latitude.toFixed(4));
      const limitedLng = parseFloat(longitude.toFixed(4));

      // 検索半径を制限（最大500m）
      const limitedRadius = Math.min(radius, 500);

      // URLを構築（pageTokenがある場合は追加）
      let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${limitedLat},${limitedLng}&radius=${limitedRadius}&key=${apiKey}&language=ja`;
      if (pageToken) {
        url += `&pagetoken=${pageToken}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'OK') {
        const places = data.results.map((place: any) => {
          // 施設の住所も番・号以降を除去してパース（丁目は残す）
          let address = place.vicinity || place.formatted_address || '';
          if (address) {
            address = address
              .replace(/^\s*日本\s*,?\s*/, '') // 日本を除去
              .replace(/〒\d{3}-\d{4}\s*/, '') // 郵便番号を除去
              .split(/\d+番/)[0] // 番で分割して前半部分のみ取得（丁目は残す）
              .split(/\d+-\d+/)[0] // ハイフンで分割して前半部分のみ取得
              .replace(/\d+−\d+.*$/, '') // 全角ハイフン以降を除去
              .replace(/（.*?）/g, '') // 括弧内を除去
              .replace(/\(.*?\)/g, '') // 半角括弧内を除去
              .trim();
          }
          
          return {
            name: place.name,
            address,
            types: place.types || [],
            distance: 0, // 後で計算
          };
        });

        return {
          places,
          nextPageToken: data.next_page_token,
          hasMore: !!data.next_page_token,
        };
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        console.warn('Google Places API のクォータ制限に達しました');
        return { places: [], hasMore: false };
      }

      return { places: [], hasMore: false };
    } catch (error) {
      console.error('近くの施設の取得に失敗:', error);
      return { places: [], hasMore: false };
    }
  }

  // 位置情報と住所を同時に取得
  async getCurrentLocationWithAddress(): Promise<LocationData | null> {
    try {
      const location = await this.getCurrentLocation();
      if (!location) return null;

      const address = await this.getAddressFromCoordinates(location.latitude, location.longitude);
      const placesResult = await this.getNearbyPlaces(location.latitude, location.longitude);

      return {
        ...location,
        address: address || undefined,
        facilityName: placesResult.places.length > 0 ? placesResult.places[0].name : undefined,
        nearbyPlaces: placesResult.places,
        nextPageToken: placesResult.nextPageToken,
        hasMorePlaces: placesResult.hasMore,
      };
    } catch (error) {
      console.error('位置情報と住所の取得に失敗:', error);
      return null;
    }
  }

  // 日本の住所形式にパース（県市区町まで、丁目は完全除外）
  private parseJapaneseAddress(result: any): string {
    try {
      const components = result.address_components;
      
      console.log('=== 住所解析開始 ===');
      console.log('元のformatted_address:', result.formatted_address);
      console.log('全コンポーネント:', components.map((c: any) => ({ name: c.long_name, types: c.types })));

      // 丁目を含まない住所コンポーネントのみを抽出
      const prefecture = components.find((c: any) => 
        c.types.includes('administrative_area_level_1'))?.long_name || '';
      const city = components.find((c: any) => 
        c.types.includes('locality') || c.types.includes('administrative_area_level_2'))?.long_name || '';
      
      // 区レベルの情報を取得
      const ward = components.find((c: any) => 
        c.types.includes('sublocality_level_1') || c.types.includes('ward'))?.long_name || '';
      
      // 町名レベルの情報を取得
      const town = components.find((c: any) => 
        c.types.includes('sublocality_level_2'))?.long_name || '';
      
      // 丁目レベルの情報を取得
      const chome = components.find((c: any) => 
        c.types.includes('sublocality_level_3'))?.long_name || '';
      
      // 地域名を組み立て（丁目まで含める）
      let address = '';
      const addressParts = [];
      
      if (prefecture) addressParts.push(prefecture);
      if (city) addressParts.push(city);
      if (ward) addressParts.push(ward);
      if (town) addressParts.push(town);
      if (chome && chome.match(/\d+丁目/)) {
        addressParts.push(chome);
      }
      
      address = addressParts.join('');
      
      // 番・号以降を除去（丁目は残す）
      address = address
        .replace(/\d+番.*$/, '')
        .replace(/\d+-\d+.*$/, '')
        .replace(/\d+−\d+.*$/, '') // 全角ハイフン
        .replace(/（.*?）/g, '') // 括弧内を除去
        .replace(/\(.*?\)/g, '') // 半角括弧内を除去
        .trim();

      // まだ空の場合は、formatted_addressから抽出
      if (!address && result.formatted_address) {
        address = result.formatted_address
          .replace(/^\s*日本\s*,?\s*/, '') // 日本を除去
          .replace(/〒\d{3}-\d{4}\s*/, '') // 郵便番号を除去
          .split(/\d+番/)[0] // 番で分割して前半部分のみ取得（丁目は残す）
          .split(/\d+-\d+/)[0] // ハイフンで分割して前半部分のみ取得
          .trim();
      }

      console.log('抽出結果:', { prefecture, city, ward, town, chome });
      console.log('最終住所:', address);
      console.log('=== 住所解析終了 ===');
      
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