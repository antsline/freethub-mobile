import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, FavoriteLocation } from '../types';
import { useAppStore } from '../services/store';
import { databaseService } from '../services/databaseService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'FavoriteEdit'>;

const categories = [
  { value: 'delivery', label: '配送先', icon: 'local-shipping' },
  { value: 'rest', label: '休憩所', icon: 'local-cafe' },
  { value: 'fuel', label: 'ガソリンスタンド', icon: 'local-gas-station' },
  { value: 'parking', label: '駐車場', icon: 'local-parking' },
  { value: 'other', label: 'その他', icon: 'place' },
];

const FavoriteEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { favoriteId } = route.params;
  const [favorite, setFavorite] = useState<FavoriteLocation | null>(null);
  const [name, setName] = useState('');
  const [memo, setMemo] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { user } = useAppStore();

  useEffect(() => {
    loadFavorite();
  }, []);

  const loadFavorite = async () => {
    if (!user) {
      Alert.alert('エラー', 'ユーザー情報が見つかりません');
      navigation.goBack();
      return;
    }

    try {
      // お気に入り一覧から該当アイテムを取得
      const result = await databaseService.getFavoriteLocations(user.id, 100);
      if (result.error) {
        Alert.alert('エラー', result.error);
        navigation.goBack();
        return;
      }

      const favoriteItem = result.data?.find(item => item.id === favoriteId);
      if (!favoriteItem) {
        Alert.alert('エラー', 'お気に入りが見つかりません');
        navigation.goBack();
        return;
      }

      setFavorite(favoriteItem);
      setName(favoriteItem.name);
      setMemo(favoriteItem.memo || '');
      setCategory(favoriteItem.category || 'other');
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'データの取得に失敗しました');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '名前を入力してください');
      return;
    }

    if (!favorite) {
      Alert.alert('エラー', 'お気に入り情報が見つかりません');
      return;
    }

    setIsSaving(true);

    try {
      const updates = {
        name: name.trim(),
        memo: memo.trim() || null,
        category: category as FavoriteLocation['category'],
      };

      const result = await databaseService.updateFavoriteLocation(favoriteId, updates);
      if (result.error) {
        Alert.alert('エラー', result.error);
        return;
      }

      Alert.alert(
        '更新完了',
        'お気に入りを更新しました',
        [{ 
          text: 'OK', 
          onPress: () => navigation.goBack()
        }]
      );
    } catch (error: any) {
      Alert.alert('エラー', error.message || '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCategorySelector = () => (
    <View style={styles.categoryContainer}>
      <Text style={styles.label}>カテゴリ</Text>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryItem,
              category === cat.value && styles.categoryItemSelected
            ]}
            onPress={() => setCategory(cat.value)}
          >
            <MaterialIcons 
              name={cat.icon as any} 
              size={24} 
              color={category === cat.value ? colors.white : colors.primary} 
            />
            <Text style={[
              styles.categoryLabel,
              category === cat.value && styles.categoryLabelSelected
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

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
        <Text style={styles.title}>お気に入り編集</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <MaterialIcons name="check" size={24} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          {/* 現在の住所表示 */}
          {favorite?.address && (
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>住所</Text>
              <Text style={styles.addressText}>{favorite.address}</Text>
            </View>
          )}

          {/* 名前入力 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>名前 *</Text>
            <TextInput
              style={styles.input}
              placeholder="お気に入りの名前を入力"
              value={name}
              onChangeText={setName}
              maxLength={50}
              editable={!isSaving}
            />
          </View>

          {/* カテゴリ選択 */}
          {renderCategorySelector()}

          {/* メモ入力 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>メモ</Text>
            <TextInput
              style={styles.memoInput}
              placeholder="メモや注意事項を入力（任意）"
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
              editable={!isSaving}
            />
            <Text style={styles.charCount}>
              {memo.length}/200文字
            </Text>
          </View>

          {/* 統計情報表示 */}
          {favorite && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>統計情報</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>訪問回数:</Text>
                <Text style={styles.statsValue}>{favorite.visit_count}回</Text>
              </View>
              {favorite.last_visited && (
                <View style={styles.statsRow}>
                  <Text style={styles.statsLabel}>最終訪問:</Text>
                  <Text style={styles.statsValue}>
                    {new Date(favorite.last_visited).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
              )}
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>登録日:</Text>
                <Text style={styles.statsValue}>
                  {new Date(favorite.created_at).toLocaleDateString('ja-JP')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
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
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  addressContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: colors.white,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 80,
  },
  categoryItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: colors.white,
  },
  statsContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  statsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
});

export default FavoriteEditScreen;