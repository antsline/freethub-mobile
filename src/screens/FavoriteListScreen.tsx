import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StackScreenProps } from '@react-navigation/stack';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { RootStackParamList, FavoriteLocation } from '../types';
import { useAppStore } from '../services/store';
import { databaseService } from '../services/databaseService';
import { colors } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'FavoriteList'>;

const FavoriteListScreen: React.FC<Props> = ({ navigation }) => {
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  
  const { user } = useAppStore();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const result = await databaseService.getFavoriteLocations(user.id, 100); // より多く取得
      if (result.error) {
        Alert.alert('エラー', result.error);
        return;
      }
      setFavorites(result.data || []);
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'お気に入りの取得に失敗しました');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFavorites();
  };

  const handleDelete = (item: FavoriteLocation) => {
    Alert.alert(
      '削除確認',
      `「${item.name}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => performDelete(item.id)
        }
      ]
    );
  };

  const performDelete = async (id: string) => {
    try {
      const result = await databaseService.deleteFavoriteLocation(id);
      if (result.error) {
        Alert.alert('エラー', result.error);
        return;
      }
      
      // 画面から削除
      setFavorites(prev => prev.filter(item => item.id !== id));
      Alert.alert('完了', 'お気に入りを削除しました');
    } catch (error: any) {
      Alert.alert('エラー', error.message || '削除に失敗しました');
    }
  };

  const handleEdit = (item: FavoriteLocation) => {
    navigation.navigate('FavoriteEdit', { favoriteId: item.id });
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'delivery': return 'local-shipping';
      case 'rest': return 'local-cafe';
      case 'fuel': return 'local-gas-station';
      case 'parking': return 'local-parking';
      default: return 'place';
    }
  };

  const getCategoryName = (category?: string) => {
    switch (category) {
      case 'delivery': return '配送先';
      case 'rest': return '休憩所';
      case 'fuel': return 'ガソリンスタンド';
      case 'parking': return '駐車場';
      default: return 'その他';
    }
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteLocation }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <MaterialIcons 
            name={getCategoryIcon(item.category)} 
            size={20} 
            color={colors.primary} 
            style={styles.categoryIcon}
          />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {getCategoryName(item.category)}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}
          >
            <MaterialIcons name="edit" size={18} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <MaterialIcons name="delete" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {item.address && (
        <Text style={styles.itemAddress} numberOfLines={2}>
          {item.address}
        </Text>
      )}

      <View style={styles.itemMeta}>
        <View style={styles.visitInfo}>
          <FontAwesome5 name="map-marker-alt" size={12} color={colors.textSecondary} />
          <Text style={styles.visitText}>
            訪問回数: {item.visit_count}回
          </Text>
        </View>
        
        {item.last_visited && (
          <Text style={styles.lastVisited}>
            最終訪問: {new Date(item.last_visited).toLocaleDateString('ja-JP')}
          </Text>
        )}
      </View>

      {item.memo && (
        <View style={styles.memoContainer}>
          <Text style={styles.memoLabel}>メモ:</Text>
          <Text style={styles.memoText} numberOfLines={2}>
            {item.memo}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="favorite-border" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>お気に入りがありません</Text>
      <Text style={styles.emptyText}>
        位置記録画面でお気に入りを登録してみましょう
      </Text>
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
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>お気に入り一覧</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer,
          favorites.length === 0 && styles.emptyListContainer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
  headerSpacer: {
    width: 40,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  itemContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  categoryBadge: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  deleteButton: {
    padding: 8,
  },
  itemAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  itemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  visitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  lastVisited: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  memoContainer: {
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  memoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  memoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default FavoriteListScreen;