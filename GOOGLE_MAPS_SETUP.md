# Google Maps API セットアップガイド

## 概要
FleetHubアプリで位置情報の住所変換と施設名取得を行うために、Google Maps APIを設定します。

## 必要なAPI
- **Geocoding API** - 座標から住所を取得
- **Places API** - 近くの施設名を取得

## セットアップ手順

### 1. Google Cloud Consoleにアクセス
1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. Googleアカウントでログイン

### 2. プロジェクトの作成
1. 上部のプロジェクトセレクターをクリック
2. 「新しいプロジェクト」をクリック
3. プロジェクト名: `FleetHub-Mobile`（任意）
4. 「作成」をクリック

### 3. APIの有効化
1. 左メニューから「APIとサービス」→「ライブラリ」
2. 以下のAPIを検索して有効化：
   - **Geocoding API**
   - **Places API**

### 4. APIキーの作成
1. 「APIとサービス」→「認証情報」
2. 「+ 認証情報を作成」→「APIキー」
3. APIキーが生成される

### 5. APIキーの制限（重要！）
1. 作成したAPIキーをクリック
2. 「APIキーを制限」をクリック

#### アプリケーションの制限
- **iOS**: 「iOSアプリ」を選択
  - バンドルID: `com.fleethub.mobile`
  
- **Android**: 「Androidアプリ」を選択
  - パッケージ名: `com.fleethub.mobile`
  - SHA-1証明書フィンガープリント: 後で追加

#### API制限
「キーを制限」セクションで以下のAPIのみ選択：
- Geocoding API
- Places API

### 6. 料金設定の確認
- 月間$200分の無料クレジット付き
- Geocoding API: 1,000リクエストあたり$5
- Places API: 1,000リクエストあたり$17

**推定使用量（100人のドライバーの場合）**:
- 1日10回の記録 × 100人 = 1,000リクエスト/日
- 月間約30,000リクエスト
- 推定月額: 約$150-200（無料枠内）

## アプリへの設定

### 1. `.env`ファイルの更新
```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 2. アプリの再起動
```bash
# Expo開発サーバーを再起動
npm start
```

## セキュリティのベストプラクティス

### ✅ 必須設定
1. **APIキーの制限**
   - アプリケーション制限（iOS/Android）
   - API制限（必要なAPIのみ）

2. **使用量の監視**
   - Cloud Consoleで日次使用量を確認
   - 予算アラートの設定

3. **本番環境での追加設定**
   - SHA-1フィンガープリントの追加（Android）
   - 本番用バンドルIDの設定

### ⚠️ 注意事項
- APIキーを公開リポジトリにコミットしない
- `.env`ファイルは`.gitignore`に含める
- 定期的に使用量を確認

## トラブルシューティング

### よくあるエラー

**1. "You have exceeded your daily request quota"**
- 原因: API使用量制限に到達
- 対処: Cloud Consoleで割り当てを確認・増加

**2. "This API key is not authorized"**
- 原因: APIキーの制限設定が正しくない
- 対処: バンドルID/パッケージ名を確認

**3. "API not enabled"**
- 原因: 必要なAPIが有効化されていない
- 対処: Cloud ConsoleでAPIを有効化

## 開発時のテスト

### 位置情報機能の確認
1. アプリで「出発」などのアクションを実行
2. 住所と施設名が自動取得されることを確認
3. コンソールログでエラーがないか確認

### デバッグ方法
```javascript
// src/services/locationService.ts
console.log('Google Maps API Response:', data);
```

## 関連リンク
- [Google Cloud Console](https://console.cloud.google.com/)
- [Geocoding API ドキュメント](https://developers.google.com/maps/documentation/geocoding)
- [Places API ドキュメント](https://developers.google.com/maps/documentation/places/web-service)
- [料金計算ツール](https://cloud.google.com/products/calculator)