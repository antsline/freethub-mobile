# FleetHub Mobile - デザインガイドライン

## アイコン使用規則

### 使用ライブラリ
- **推奨**: `@expo/vector-icons` (Expoプロジェクト標準)
- **アイコンセット**: Material Icons, FontAwesome5

### インポート方法
```typescript
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
```

### 標準サイズ
- **小**: 12-14px (タグ、補助的な要素)
- **中**: 16px (ボタン、リスト項目)
- **大**: 24px (ヘッダー、重要なアクション)

### カテゴリ別アイコン定義

#### お気に入り機能
- **お気に入り登録**: `MaterialIcons` - `favorite-border`
- **お気に入り済み**: `MaterialIcons` - `favorite`

#### 施設・場所カテゴリ
- **配送先**: `MaterialIcons` - `local-shipping` (トラック)
- **休憩場所**: `FontAwesome5` - `coffee` (コーヒーカップ)
- **燃料補給**: `MaterialIcons` - `local-gas-station` (ガソリンスタンド)
- **駐車場**: `MaterialIcons` - `local-parking` (P マーク)
- **その他**: `MaterialIcons` - `place` (ピン)

#### アクション
- **追加/さらに探す**: `MaterialIcons` - `add`
- **更新/再取得**: `MaterialIcons` - `refresh`
- **編集**: `MaterialIcons` - `edit`
- **削除**: `MaterialIcons` - `delete`
- **戻る**: `MaterialIcons` - `arrow-back`
- **次へ**: `MaterialIcons` - `arrow-forward`

#### ナビゲーション
- **ホーム**: `MaterialIcons` - `home`
- **設定**: `MaterialIcons` - `settings`
- **ログアウト**: `MaterialIcons` - `logout`

#### 車両・業務
- **車両**: `MaterialIcons` - `directions-car`
- **出発**: `MaterialIcons` - `play-arrow`
- **到着**: `MaterialIcons` - `stop`
- **休憩**: `MaterialIcons` - `pause`

### 色の使用規則

#### 状態による色分け
```typescript
// 通常状態
color: colors.text (#333333)

// 選択状態
color: colors.white (#FFFFFF)

// 無効状態
color: colors.textSecondary (#666666)

// エラー状態
color: colors.error (#FF6B6B)

// 成功状態
color: colors.success (#51CF66)
```

#### 特殊な色指定
- **お気に入りタグ**: `#B8860B` (ゴールド)
- **警告**: `#FFB84D` (オレンジ)

### 実装例

#### 基本的な使用方法
```typescript
// アイコンのみ
<MaterialIcons name="favorite" size={16} color={colors.primary} />

// アイコン + テキスト (横並び)
<View style={styles.buttonContent}>
  <MaterialIcons name="favorite-border" size={16} color={colors.white} />
  <Text style={styles.buttonText}>お気に入り登録</Text>
</View>
```

#### カテゴリボタンの実装
```typescript
const categories = [
  { key: 'delivery', label: '配送先', iconName: 'local-shipping', iconSet: 'MaterialIcons' },
  { key: 'rest', label: '休憩場所', iconName: 'coffee', iconSet: 'FontAwesome5' },
  { key: 'fuel', label: '燃料補給', iconName: 'local-gas-station', iconSet: 'MaterialIcons' },
  { key: 'parking', label: '駐車場', iconName: 'local-parking', iconSet: 'MaterialIcons' },
  { key: 'other', label: 'その他', iconName: 'place', iconSet: 'MaterialIcons' },
];

// 動的レンダリング
{category.iconSet === 'MaterialIcons' ? (
  <MaterialIcons 
    name={category.iconName} 
    size={16} 
    color={isSelected ? colors.white : colors.text}
  />
) : (
  <FontAwesome5 
    name={category.iconName} 
    size={14} 
    color={isSelected ? colors.white : colors.text}
  />
)}
```

### スタイル規則

#### アイコンとテキストの組み合わせ
```typescript
buttonContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6, // アイコンとテキストの間隔
},

categoryIconContainer: {
  marginRight: 6,
  alignItems: 'center',
  justifyContent: 'center',
},
```

#### タグスタイル
```typescript
favoriteTagContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4, // 小さなアイコンの場合は狭い間隔
},
```

### 禁止事項
- ❌ 絵文字の使用（📦, ⭐, ☕ など）
- ❌ 記号文字の使用（■, ◆, ● など）
- ❌ 異なるアイコンライブラリの混在（react-native-vector-icons との併用など）
- ❌ 非標準のサイズ（13px, 15px, 23px など）

### 新しいアイコンの追加
1. [Material Icons](https://fonts.google.com/icons) または [FontAwesome5](https://fontawesome.com/v5/search) から選択
2. このガイドラインに追記
3. 関連するコンポーネントで統一的に使用

### 参考リンク
- [Expo Vector Icons Directory](https://icons.expo.fyi/)
- [Material Design Icons](https://fonts.google.com/icons)
- [FontAwesome 5 Icons](https://fontawesome.com/v5/search)