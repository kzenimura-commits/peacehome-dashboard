# Peace Home Dashboard セットアップ手順

このダッシュボードは以下の構成で動きます：

```
[Google Sheets]  ←── Peace Home社員が普段通り更新
      ↓ Sheets API
[Vercel Serverless]  ←── 5分キャッシュで負荷ゼロ
      ↓
[静的ダッシュボード]  ←── お客様がURL＋パスワードでアクセス
```

**所要時間の目安：** 初回設定 30〜60分（GCP未経験者）

---

## 全体の流れ

1. **Google Cloud** でサービスアカウントを作成し、Sheets API を有効化
2. **Google Sheets** をサービスアカウントに共有
3. **GitHub** にコードをアップロード
4. **Vercel** で GitHub 連携してデプロイ
5. **Vercel** の環境変数に鍵とパスワードを登録
6. **お客様** にURL＋パスワードを共有

---

## STEP 1. Google Cloud サービスアカウント作成（10分）

### 1-1. プロジェクトを作る

1. https://console.cloud.google.com/ を開く（Googleアカウントでログイン）
2. 左上の **プロジェクト選択メニュー** → **新しいプロジェクト**
3. プロジェクト名：`peacehome-dashboard`（任意）
4. **作成** をクリック → 完了通知が出たら選択

### 1-2. Google Sheets API を有効化

1. 左のメニュー（三本線） → **APIとサービス** → **ライブラリ**
2. 検索欄に `Google Sheets API` と入力
3. 表示された「Google Sheets API」をクリック → **有効にする** ボタン

### 1-3. サービスアカウントを作る

1. 左メニュー → **APIとサービス** → **認証情報**
2. 上の **＋認証情報を作成** → **サービスアカウント** を選択
3. 入力：
   - サービスアカウント名：`sheets-reader`
   - IDは自動生成でOK
   - 説明：`Peace Home dashboard readonly`（任意）
4. **作成して続行** → 「ロール」は選ばず **続行** → **完了**

### 1-4. 秘密鍵JSONをダウンロード

1. 作ったサービスアカウントをクリック（メール `sheets-reader@...iam.gserviceaccount.com` が表示されます — このメールは後で使うのでコピーしておく）
2. 上の **キー** タブ → **鍵を追加** → **新しい鍵を作成**
3. **JSON** を選んで **作成** → ローカルに `.json` ファイルがダウンロードされる
4. **このJSONファイルは絶対に公開・GitHubにアップロードしない**

JSONの中身：
```json
{
  "type": "service_account",
  "client_email": "sheets-reader@peacehome-dashboard.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",
  ...
}
```
→ `client_email` と `private_key` を後で使います。

---

## STEP 2. Google Sheets をサービスアカウントに共有（3分）

以下の各スプレッドシートを開き、右上の **共有** ボタンから、STEP 1-3でコピーしたメール（例：`sheets-reader@peacehome-dashboard.iam.gserviceaccount.com`）を追加します。

**権限：閲覧者**（Viewer）でOK。編集権限は不要です。

| シート | URL |
|---|---|
| 44期 工事管理チェックシート | https://docs.google.com/spreadsheets/d/**1TKuFVKpB9b6CcMHVxleMlslB9mNRgYid3N73t3xZV_I**/edit |
| 管理部実績管理（原価） | https://docs.google.com/spreadsheets/d/**17f1Go57v3aIhlj8VU0WbiVNX0hjo9McWce-lPf4vmpU**/edit |

**URLの太字部分がスプレッドシートIDです。** 後で環境変数に入れます。

---

## STEP 3. GitHubにコードを上げる（10分）

### 3-1. リポジトリ作成

1. https://github.com/new を開く
2. リポジトリ名：`peacehome-dashboard`
3. **Private** を選ぶ（コードには何も秘密は含まれませんが、念のため）
4. **README を追加** はチェックしない
5. **Create repository**

### 3-2. コードをアップロード

PC上のこのフォルダ（`peacehome-dashboard/`）で以下を実行：

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/peacehome-dashboard.git
git push -u origin main
```

`YOUR_USERNAME` はご自身のGitHubユーザー名に置き換え。

`.gitignore` に `.env` `.env.local` `service-account.json` が入っているので、これらは自動で除外されます。

---

## STEP 4. Vercel でデプロイ（10分）

### 4-1. GitHubリポジトリを連携

1. https://vercel.com/dashboard を開く
2. **Add New...** → **Project**
3. **Import Git Repository** で `peacehome-dashboard` を選択 → **Import**

### 4-2. 環境変数の設定

**Deploy を押す前に**、下部の **Environment Variables** セクションで以下を全て追加します：

| Name | Value |
|---|---|
| `APP_PASSWORD` | 任意のパスワード（例：`peace2026!`）— お客様に共有するもの |
| `APP_USERNAME` | `peacehome`（お好みで変更可） |
| `GOOGLE_CLIENT_EMAIL` | STEP 1-4でコピーした `client_email` の値 |
| `GOOGLE_PRIVATE_KEY` | STEP 1-4の `private_key` の値（**"-----BEGIN..." から "...-----\n" まで全部**） |
| `PROJECTS_SHEET_ID` | `1TKuFVKpB9b6CcMHVxleMlslB9mNRgYid3N73t3xZV_I` |
| `BUDGET_SHEET_ID` | `17f1Go57v3aIhlj8VU0WbiVNX0hjo9McWce-lPf4vmpU` |

**`GOOGLE_PRIVATE_KEY` の入力のコツ：**
- JSONの `"private_key": "..."` の値部分（ダブルクォート内の全て）をコピー
- Vercelの入力欄に貼り付ける
- `\n` はそのまま残す（Vercelが自動で改行に復元してくれる）

### 4-3. デプロイ

**Deploy** をクリック → 2〜3分待つと `https://peacehome-dashboard-xxxx.vercel.app` のようなURLが発行されます。

---

## STEP 5. 動作確認

1. 発行されたURLを開く
2. ブラウザがユーザー名・パスワードを聞いてくる（Basic認証）
   - ユーザー名：`peacehome`（または `APP_USERNAME` で設定した値）
   - パスワード：`APP_PASSWORD` で設定した値
3. ダッシュボードが表示されればOK
4. `https://your-url.vercel.app/api/health` で環境変数のセット状況を確認できます

**トラブル時：**
- 「500 GOOGLE_CLIENT_EMAIL 未設定」→ Vercelの環境変数を再確認
- 「Sheets読取エラー」→ サービスアカウントメールにシート共有できているか確認
- 「Basic認証で拒否される」→ `APP_PASSWORD` の綴りチェック

---

## STEP 6. お客様への共有

以下を伝えます：

> Peace Home ダッシュボード
> URL: https://peacehome-dashboard-xxxx.vercel.app
> ユーザー名: peacehome
> パスワード: peace2026!
> 
> スプレッドシートを更新すると、最大5分後にダッシュボードに反映されます。ブラウザは Chrome / Edge / Safari で動作確認済み。

---

## カスタムドメインを付けたい場合（任意）

Vercel Dashboard → プロジェクト → **Settings** → **Domains** から `dashboard.peace-home.com` のような独自ドメインを設定できます。DNSレコード追加が必要。

---

## 期を切り替えるとき（45期→46期など）

Vercel の Environment Variables で以下を更新して **Redeploy**：

```
PROJECTS_SHEET_TABS=【注文】45期,【ひなた】45期,【建売・モデル】45期
```

---

## パスワードを変えたいとき

Vercel → プロジェクト → **Settings** → **Environment Variables** → `APP_PASSWORD` を編集 → **Redeploy**

---

## トラブルシューティング

### `/api/health` で全てtrueなのにデータが出ない

サービスアカウントにスプシが共有されていない可能性大。共有ダイアログでメール検索して確認。

### 「Bad Request 400」が返る

シートタブ名に全角空白などが混ざっている可能性。`PROJECTS_SHEET_TABS` の値を確認。

### 認証を強化したい

Vercel のプランをPro以上にすると、SSO/Google OAuth ゲートが有効化できます。Basic認証だとブラウザに保存されっぱなしになるのでセキュリティを上げたい場合はProプラン検討。
