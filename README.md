# Peace Home Dashboard

ピースホーム様の業務プロセス＆着工完工 統合ダッシュボード（Vercel + Google Sheets）

## 概要

- **ソース**：Google Sheets（社員が普段運用しているシート）
- **バックエンド**：Vercel Serverless Function が5分キャッシュで読み取り
- **フロント**：静的HTML（Vanilla JS） — フレームワークなし
- **認証**：Basic Auth（共通パスワード1つ）
- **費用**：Vercel Hobby プランで **月額無料**

## セットアップ

**→ [SETUP.md](./SETUP.md) を参照**（GCP未経験者向けに段階的に記載）

## ローカル開発

```bash
npm install
cp .env.example .env.local
# .env.local を編集して環境変数を入れる
npm run dev
```

`http://localhost:3000` で確認。

## プロジェクト構成

```
peacehome-dashboard/
├── README.md              # このファイル
├── SETUP.md               # デプロイ手順書
├── package.json
├── vercel.json
├── middleware.ts          # Basic認証（Vercel Edge Middleware）
├── .env.example           # 環境変数テンプレート
├── public/
│   ├── index.html         # ダッシュボード本体
│   └── app.js             # フロントエンドロジック
├── api/
│   ├── data.ts            # /api/data — Google Sheets → JSON
│   └── health.ts          # /api/health — 疎通確認
└── lib/
    ├── sheets.ts          # Google Sheets API クライアント
    └── parsers.ts         # シート行 → Project オブジェクト変換
```

## 機能一覧

### タブ1: 業務プロセス（契約→着工90日）
- 8マイルストーンKPI（図面確定〜着工）
- 図面確定14日超過アラート（ADV向け）
- ブランド／ADV／設計担当別の平均着工日数比較

### タブ2: 着工・完工管理
- **ヒーロー**：現在工事中棟数、6ヶ月完工予定と売上予測
- 期の対象物件／着工予定・実績／完工予定・実績
- ADV別 受注→着工→完工歩留り

### タブ3: 工務・実行予算
- 実行予算作成率、社内打合〜予算〆リードタイム
- 完工物件 平均損益率（契約時 vs 実際）
- 実行予算未作成アラート

### タブ4: 来期予測
- **来期完工予測 = 既存パイプ ＋ 新規受注**
- リードタイム前提を編集して What-If シミュレーション
- ADV別 月次受注目標グリッド（編集可）
- 期内完工予測／翌期繰越／売上見込み／営業への示唆

## データ更新の流れ

1. 現場社員がスプレッドシートを更新（今まで通り）
2. 最大5分後、ダッシュボードのAPIキャッシュが失効
3. 次のアクセスで自動的に最新データが表示される

## ライセンス

Private (Peace Home × Pure Growth)
