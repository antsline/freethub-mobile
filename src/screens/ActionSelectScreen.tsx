import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList, ActionType } from '../types';
import { useAppStore } from '../services/store';
import { colors, ACTION_GROUPS } from '../constants';

type Props = StackScreenProps<RootStackParamList, 'ActionSelect'>;

const ActionSelectScreen: React.FC<Props> = ({ navigation, route }) => {
  const { actionGroup } = route.params;
  const { currentVehicle } = useAppStore();

  const getActions = (): ActionType[] => {
    switch (actionGroup) {
      case 'MOVE':
        return ACTION_GROUPS.MOVE as ActionType[];
      case 'WORK':
        return ACTION_GROUPS.WORK as ActionType[];
      case 'REST':
        return ACTION_GROUPS.REST as ActionType[];
      default:
        return [];
    }
  };

  const getActionColor = () => {
    switch (actionGroup) {
      case 'MOVE':
        return colors.move;
      case 'WORK':
        return colors.work;
      case 'REST':
        return colors.rest;
      default:
        return colors.primary;
    }
  };

  const getActionTitle = () => {
    switch (actionGroup) {
      case 'MOVE':
        return '移動記録';
      case 'WORK':
        return '作業記録';
      case 'REST':
        return '休憩記録';
      default:
        return '記録';
    }
  };

  const handleActionSelect = (actionType: ActionType) => {
    if (!currentVehicle) {
      return;
    }

    navigation.navigate('RecordConfirm', {
      actionType,
      vehicle: currentVehicle,
    });
  };

  const actions = getActions();
  const actionColor = getActionColor();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: actionColor }]}>
        <Text style={styles.headerTitle}>{getActionTitle()}</Text>
        <Text style={styles.headerSubtitle}>記録するアクションを選択してください</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.actionContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={action}
              style={[styles.actionButton, { borderColor: actionColor }]}
              onPress={() => handleActionSelect(action)}
            >
              <Text style={[styles.actionText, { color: actionColor }]}>
                {action}
              </Text>
              <View style={styles.actionDescription}>
                <Text style={styles.descriptionText}>
                  {getActionDescription(action)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const getActionDescription = (action: ActionType): string => {
  switch (action) {
    case '出発':
      return '車庫や営業所から出発する時に記録';
    case '到着':
      return '目的地に到着した時に記録（走行距離入力必須）';
    case '通過':
      return '経由地を通過する時に記録';
    case '積込開始':
      return '荷物の積み込みを開始する時に記録';
    case '積込完了':
      return '荷物の積み込みが完了した時に記録';
    case '荷降し開始':
      return '荷物の荷降しを開始する時に記録';
    case '荷降し完了':
      return '荷物の荷降しが完了した時に記録';
    case '休憩開始':
      return '休憩を開始する時に記録';
    case '休憩終了':
      return '休憩を終了する時に記録';
    case '待機開始':
      return '待機を開始する時に記録';
    case '待機終了':
      return '待機を終了する時に記録';
    default:
      return '';
  }
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
  scrollView: {
    flex: 1,
  },
  actionContainer: {
    padding: 16,
  },
  actionButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionDescription: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ActionSelectScreen;