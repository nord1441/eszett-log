# eszett-log

Markdown ベースのミニマルなブログ SPA。React フロントエンドと Express バックエンドで構成され、記事・画像・設定をすべてファイルシステムに保存する。データベース不要。

## 主な機能

- Markdown 記事の作成・編集・削除
- Markdown ファイルのアップロード（画像参照の自動解決付き）
- 画像アップロードとインライン表示
- JWT ベースの認証
- 管理者設定画面（サイトタイトル・デフォルトテーマ・デフォルトフォントサイズ・パスワード変更）
- ライト / ダークテーマ切り替え
- フォントサイズ切り替え（small / medium / large）

## 実行方法

### 必要なもの

- Node.js 18 以上

### 開発サーバー

```bash
npm install
npm run dev
```

フロントエンド（Vite）が `http://localhost:5173` で、バックエンドが `http://localhost:3001` で起動する。Vite の開発プロキシにより、フロントエンドからの `/api` リクエストはバックエンドに自動転送される。

### プロダクションビルド

```bash
npm run build
npm start
```

`npm run build` はテスト実行 → クライアントビルド → サーバーコンパイルの順に実行される。`npm start` でビルド済みサーバーが起動し、静的ファイルの配信もサーバーが行う。

### テスト

```bash
npm test            # 全テスト実行
npm run test:watch  # ウォッチモード
```

### 初期ログイン

初回起動時にデフォルトの管理者ユーザーが自動作成される。

- **ユーザー名**: `admin`
- **パスワード**: `admin`

ログイン後、管理者設定画面（ヘッダーの `settings` リンク）からパスワードを変更できる。

認証の仕組みと JWT_SECRET の設定方法については [docs/jwt-authentication.md](docs/jwt-authentication.md) を参照。

## 環境変数

| 変数名 | 説明 | デフォルト値 | 値の例 |
|---|---|---|---|
| `PORT` | サーバーのリッスンポート | `3001` | `8080` |
| `JWT_SECRET` | JWT トークンの署名に使用する秘密鍵 | `eszett-log-secret-change-in-production` | `my-super-secret-key` |
| `SITE_TITLE` | サイトタイトル（ヘッダー・フッターに表示） | `eszett-log` | `My Blog` |
| `DEFAULT_THEME` | 新規訪問者のデフォルトテーマ | `light` | `dark` |
| `DEFAULT_FONT_SIZE` | 新規訪問者のデフォルトフォントサイズ | `medium` | `small`, `large` |
| `DEFAULT_FONT_FAMILY` | 新規訪問者のデフォルトフォント | `doto` | `bebas-neue` |
| `NODE_ENV` | `production` でビルド済み静的ファイルを配信 | ―| `production` |

環境変数は管理者設定画面で保存した値（`data/settings.json`）のフォールバックとして機能する。優先順位: **管理者設定画面 > 環境変数 > ハードコードデフォルト**

`.env` ファイルの例:

```
PORT=3001
JWT_SECRET=change-me-in-production
SITE_TITLE=My Blog
DEFAULT_THEME=dark
DEFAULT_FONT_SIZE=medium
DEFAULT_FONT_FAMILY=doto
```

## データの永続化

すべてのデータはファイルシステムに保存される。データベースは使用しない。

```
eszett-log/
├── posts/              # 記事データ
│   └── hello-world.md
├── data/               # アプリケーション設定
│   ├── users.json
│   └── settings.json
└── uploads/            # アップロード画像
    └── 073a6aac71dd6438.png
```

### `posts/` — 記事

各記事は 1 つの Markdown ファイルとして保存される。ファイル名（拡張子除く）がスラッグになる。

```markdown
---
title: Hello World
date: '2026-02-20'
tags:
  - blog
  - first
---

記事の本文をMarkdownで記述する。
```

- **形式**: YAML フロントマター付き Markdown
- **ファイル名規則**: `{slug}.md`（英数字・ハイフン・アンダースコア）
- **フロントマター**: `title`（必須）、`date`（YYYY-MM-DD）、`tags`（文字列配列）、`excerpt`（省略時は本文先頭160文字から自動生成）

### `data/users.json` — ユーザー情報

```json
[
  {
    "username": "admin",
    "passwordHash": "$2a$10$..."
  }
]
```

- **形式**: JSON 配列
- **パスワード**: bcrypt でハッシュ化して保存
- 初回起動時に `admin` / `admin` で自動作成される

### `data/settings.json` — サイト設定

```json
{
  "siteTitle": "eszett-log",
  "defaultTheme": "light",
  "defaultFontSize": "medium",
  "defaultFontFamily": "doto"
}
```

- **形式**: JSON オブジェクト
- 管理者設定画面から変更可能
- ファイルが存在しない場合は環境変数またはハードコードデフォルトが使用される

### `uploads/` — 画像ファイル

- **ファイル名**: ランダムな16桁の16進数ハッシュ + 元の拡張子（例: `073a6aac71dd6438.png`）
- **サイズ上限**: 10 MB / ファイル
- **対応形式**: 画像ファイルのみ（MIME タイプが `image/*` であること）
- ディレクトリは初回アップロード時に自動作成される

## API エンドポイント

### 公開

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/api/posts` | 記事一覧（日付降順） |
| `GET` | `/api/posts/:slug` | 記事取得 |
| `GET` | `/api/settings` | サイト設定取得 |
| `GET` | `/api/images/:filename` | 画像取得 |
| `POST` | `/api/auth/login` | ログイン（JWT トークン取得） |
| `GET` | `/api/auth/me` | 認証確認 |

### 認証必須

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/api/posts` | 記事作成 |
| `PUT` | `/api/posts/:slug` | 記事更新 |
| `DELETE` | `/api/posts/:slug` | 記事削除 |
| `POST` | `/api/posts/upload` | Markdown ファイルアップロード |
| `POST` | `/api/images` | 画像アップロード |
| `PUT` | `/api/settings` | サイト設定更新 |
| `PUT` | `/api/settings/password` | パスワード変更 |

## Docker

### docker-compose（推奨）

```bash
docker compose up -d
```

`http://localhost:3001` でアクセスできる。データは Docker ボリューム（`posts-data`, `app-data`, `uploads-data`）に永続化される。

環境変数は `docker-compose.yaml` 内の `environment` セクションで設定する。

### 手動ビルド・実行

```bash
docker build -t eszett-log .
docker run -d \
  -p 3001:3001 \
  -e JWT_SECRET=my-secret \
  -v eszett-posts:/app/posts \
  -v eszett-data:/app/data \
  -v eszett-uploads:/app/uploads \
  eszett-log
```

### CI/CD

GitHub Actions (`.github/workflows/docker-build.yaml`) が設定済み。

- `main` ブランチへの push / タグ push で自動ビルドし、GitHub Container Registry (`ghcr.io`) にプッシュ
- Pull Request ではビルドのみ（プッシュなし）
- Buildx によるレイヤーキャッシュ対応

パイプラインの詳細な設定方法については [docs/ci-cd-pipeline.md](docs/ci-cd-pipeline.md) を参照。

## Kubernetes

### 素の Kubernetes マニフェスト

`k8s/` ディレクトリに一式格納されている。

```bash
# イメージを自身のレジストリに変更
sed -i 's|ghcr.io/OWNER/eszett-log|ghcr.io/your-org/eszett-log|' k8s/deployment.yaml

# 適用
kubectl apply -f k8s/
```

| ファイル | 内容 |
|---|---|
| `namespace.yaml` | `eszett-log` Namespace |
| `secret.yaml` | JWT_SECRET を格納する Secret |
| `pvc.yaml` | posts (1Gi), data (256Mi), uploads (5Gi) の PVC |
| `deployment.yaml` | Deployment（liveness/readiness probe 付き） |
| `service.yaml` | ClusterIP Service (80 → 3001) |
| `ingress.yaml` | nginx Ingress（ホスト名を要変更） |

### Helm チャート

`charts/eszett-log/` に Helm チャートが格納されている。

```bash
helm install my-blog charts/eszett-log \
  --set image.repository=ghcr.io/your-org/eszett-log \
  --set image.tag=v1.0.0 \
  --set secret.jwtSecret=my-secret \
  --set ingress.enabled=true \
  --set ingress.host=blog.example.com
```

主な values:

| キー | デフォルト | 説明 |
|---|---|---|
| `image.repository` | `ghcr.io/OWNER/eszett-log` | コンテナイメージ |
| `image.tag` | `latest` | イメージタグ |
| `secret.jwtSecret` | `change-me-in-production` | JWT 署名鍵 |
| `ingress.enabled` | `false` | Ingress を作成するか |
| `ingress.host` | `eszett-log.example.com` | Ingress ホスト名 |
| `persistence.posts.size` | `1Gi` | 記事ボリュームサイズ |
| `persistence.data.size` | `256Mi` | 設定ボリュームサイズ |
| `persistence.uploads.size` | `5Gi` | 画像ボリュームサイズ |
| `env.*` | - | 任意の環境変数を追加可能 |

### HashiCorp Nomad

`nomad/eszett-log.nomad.hcl` に Nomad ジョブ定義が格納されている。

```bash
# Nomad クライアントに host_volume を設定（client 設定ファイルに追記）
# host_volume "eszett-log-posts"   { path = "/opt/eszett-log/posts" }
# host_volume "eszett-log-data"    { path = "/opt/eszett-log/data" }
# host_volume "eszett-log-uploads" { path = "/opt/eszett-log/uploads" }

# ジョブ実行
nomad job run \
  -var="image=ghcr.io/your-org/eszett-log:v1.0.0" \
  -var="jwt_secret=my-secret" \
  nomad/eszett-log.nomad.hcl
```

主な変数:

| 変数名 | デフォルト | 説明 |
|---|---|---|
| `image` | `ghcr.io/OWNER/eszett-log:latest` | コンテナイメージ |
| `jwt_secret` | `change-me-in-production` | JWT 署名鍵 |
| `site_title` | `eszett-log` | サイトタイトル |
| `default_theme` | `light` | デフォルトテーマ |
| `default_font_size` | `medium` | デフォルトフォントサイズ |
| `default_font_family` | `doto` | デフォルトフォント |
| `datacenters` | `["dc1"]` | デプロイ先データセンター |
| `host_data_dir` | `/opt/eszett-log` | ホスト側データディレクトリ |
