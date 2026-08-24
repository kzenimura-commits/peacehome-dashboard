# 空のGitHubリポジトリに一発でpushする手順

前提：`peacehome-dashboard` フォルダを解凍済みで、その中にいるとします。

## Windows PowerShell の場合

```powershell
# フォルダ移動
cd "C:\path\to\peacehome-dashboard"

# git 初期化
git init
git branch -M main

# 全ファイルを追加してコミット
git add .
git commit -m "initial: Peace Home dashboard v1"

# GitHub空リポジトリに接続
git remote add origin https://github.com/kzenimura-commits/peacehome-dashboard.git

# push
git push -u origin main
```

## Mac / Linux の場合

```bash
cd ~/Downloads/peacehome-dashboard   # 解凍したパスに合わせる
git init
git branch -M main
git add .
git commit -m "initial: Peace Home dashboard v1"
git remote add origin https://github.com/kzenimura-commits/peacehome-dashboard.git
git push -u origin main
```

## push で認証エラーが出た場合

**方法1: GitHub CLI（推奨）**
1. https://cli.github.com/ から `gh` をインストール
2. `gh auth login` → 画面の案内通り進める
3. その後 `git push -u origin main` が通る

**方法2: Personal Access Token**
1. https://github.com/settings/tokens/new を開く
2. **repo** にチェック → **Generate token** → トークンをコピー
3. push時に User=`kzenimura-commits`、Password=トークン を入力

**方法3: SSH鍵**
- 既に設定済みなら `git remote set-url origin git@github.com:kzenimura-commits/peacehome-dashboard.git` で切替

## push成功後の確認

1. https://github.com/kzenimura-commits/peacehome-dashboard を開いてファイル一覧が見えることを確認
2. Vercelが接続済みなら自動でデプロイが始まる（Dashboard → Deployments で確認）
3. 未接続なら Vercel Dashboard → Add New → Project → GitHubからimport

## Vercel環境変数の設定

GitHub push とは別に、Vercel Dashboard → Settings → Environment Variables で以下を登録：

```
APP_PASSWORD          = お好きなパスワード
APP_USERNAME          = peacehome
GOOGLE_CLIENT_EMAIL   = サービスアカウントのメール（SETUP.md STEP 1参照）
GOOGLE_PRIVATE_KEY    = サービスアカウントの秘密鍵
PROJECTS_SHEET_ID     = 1TKuFVKpB9b6CcMHVxleMlslB9mNRgYid3N73t3xZV_I
BUDGET_SHEET_ID       = 17f1Go57v3aIhlj8VU0WbiVNX0hjo9McWce-lPf4vmpU
```

登録後 **Redeploy** ボタンを押すと環境変数が反映されます。

## デプロイ後の確認

```
https://peacehome-dashboard.vercel.app/api/health
```
を開いて以下のJSONが返ればOK：
```json
{
  "ok": true,
  "env": {
    "APP_PASSWORD": true,
    "GOOGLE_CLIENT_EMAIL": true,
    ...全部true
  }
}
```

全てtrueなのにダッシュボードにデータが出ない場合は、サービスアカウントメールに各スプレッドシートが**閲覧者権限で共有されているか**を確認。
