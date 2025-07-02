# FleetHub Mobile

運送業界向けデジタル日報アプリのモバイル版

## 📖 関連ドキュメント

- [デザインガイドライン](./DESIGN_GUIDELINES.md) - アイコン・UI設計規則
- [Google Maps API セットアップ](./GOOGLE_MAPS_SETUP.md) - 位置情報機能の設定

## 🚀 開発環境

### 必要な環境
- Node.js 18+
- Expo CLI
- iOS Simulator または Android Emulator

### セットアップ
```bash
npm install
npm start
```

### 主要な依存関係
- **React Native & Expo**: モバイルアプリ開発
- **Supabase**: バックエンド・データベース
- **@expo/vector-icons**: アイコンライブラリ
- **React Navigation**: ナビゲーション

## 📱 機能

### 基本機能
- ✅ ドライバー認証・セッション管理
- ✅ 車両選択・業務開始
- ✅ 行動記録（出発・到着・休憩等）
- ✅ 位置情報自動取得
- ✅ 走行距離記録

### 位置情報機能
- ✅ GPS位置情報取得
- ✅ Google Maps API連携
- ✅ 住所自動取得（町名まで表示）
- ✅ 近隣施設検索

### お気に入り機能
- ✅ お気に入り場所登録
- ✅ カテゴリ分類（配送先・休憩場所・燃料補給・駐車場・その他）
- ✅ 優先表示（500m以内自動表示）
- ✅ お気に入りタグ表示
- ✅ 訪問回数カウント

## 🎨 デザインシステム

### アイコン使用規則
- **推奨ライブラリ**: `@expo/vector-icons`
- **主要アイコンセット**: Material Icons, FontAwesome5
- **標準サイズ**: 12px (small), 16px (medium), 24px (large)

### 再利用可能コンポーネント
- `IconButton`: アイコン付きボタンコンポーネント

詳細は [デザインガイドライン](./DESIGN_GUIDELINES.md) を参照

## 🗂️ プロジェクト構造

```
src/
├── components/          # 再利用可能コンポーネント
├── constants/          # 定数・カラー・アイコン定義
├── navigation/         # ナビゲーション設定
├── screens/           # 画面コンポーネント
├── services/          # API・データベース・状態管理
├── types/            # TypeScript型定義
└── utils/            # ユーティリティ関数
```

## 🔧 設定ファイル

### 環境変数 (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 重要な設定
- `.gitignore`: `.env`ファイルは除外済み
- `app.json`: Expo設定
- `tsconfig.json`: TypeScript設定

## 📝 開発ガイドライン

### コーディング規則
- TypeScriptを使用
- 絵文字・記号文字の使用禁止
- Material Design iconとFontAwesome5のみ使用
- カラーパレットは`src/constants/colors.ts`で管理

### Git運用
- `.env`ファイルはコミット禁止
- フィーチャーブランチでの開発推奨
- コミットメッセージは日本語OK

## 🔍 デバッグ・テスト

### Expo Go でのテスト
```bash
npm start
# QRコードをExpo Goアプリでスキャン
```

### デモデータ
- 会社コード: `デモ運輸`
- 招待コード: `DEMO001`

## 📋 TODO

優先度順のタスクリスト：

### 高優先度
- [ ] お気に入り管理機能（削除・編集）

### 中優先度
- [ ] 写真添付・音声メモ機能
- [ ] オフライン対応・自動同期
- [ ] エラーハンドリング改善

### 低優先度
- [ ] プッシュ通知
- [ ] データエクスポート機能
- [ ] 統計・分析機能