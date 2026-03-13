# Docker コンテナビルドパイプライン設定ガイド

eszett-log の Docker コンテナビルド・デプロイパイプラインの構成と設定方法について説明する。

## 目次

1. [全体構成](#全体構成)
2. [Dockerfile の構造](#dockerfile-の構造)
3. [ローカルでのビルドと実行](#ローカルでのビルドと実行)
4. [docker-compose による実行](#docker-compose-による実行)
5. [GitHub Actions CI/CD パイプライン](#github-actions-cicd-パイプライン)
6. [Kubernetes へのデプロイ](#kubernetes-へのデプロイ)
7. [Helm チャートによるデプロイ](#helm-チャートによるデプロイ)
8. [トラブルシューティング](#トラブルシューティング)

---

## 全体構成

```
eszett-log/
├── Dockerfile                              # マルチステージビルド定義
├── .dockerignore                           # ビルドコンテキスト除外設定
├── docker-compose.yaml                     # ローカル / ステージング用 compose
├── .github/workflows/docker-build.yaml     # GitHub Actions CI/CD
├── k8s/                                    # Kubernetes マニフェスト
│   ├── namespace.yaml
│   ├── secret.yaml
│   ├── pvc.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── charts/eszett-log/                      # Helm チャート
    ├── Chart.yaml
    ├── values.yaml
    └── templates/
        ├── _helpers.tpl
        ├── deployment.yaml
        ├── service.yaml
        ├── secret.yaml
        ├── pvc.yaml
        └── ingress.yaml
```

パイプラインの流れ:

```
ソースコード push
  → GitHub Actions がトリガー
    → Docker Buildx でマルチステージビルド
      → テスト実行 (vitest)
      → クライアントビルド (vite build)
      → サーバーコンパイル (tsc)
    → ghcr.io にイメージを push
      → Kubernetes / Helm でデプロイ
```

---

## Dockerfile の構造

マルチステージビルドを採用し、最終イメージにビルドツールを含めない軽量構成になっている。

### ステージ 1: build

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

- `node:20-alpine` をベースにビルド環境を構築
- `npm ci` で依存パッケージを再現可能な形でインストール
- `npm run build` は内部で以下を順に実行:
  1. `vitest run` — 全テスト実行（テスト失敗時はビルドも失敗する）
  2. `vite build` — React フロントエンドのバンドル（→ `dist/`）
  3. `tsc -p tsconfig.server.json` — Express サーバーのコンパイル（→ `dist-server/`）

### ステージ 2: runtime

```dockerfile
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

VOLUME ["/app/data", "/app/posts", "/app/uploads"]
EXPOSE 3001
CMD ["node", "dist-server/index.js"]
```

- 本番用の依存パッケージのみインストール（`--omit=dev`）
- build ステージからビルド成果物だけをコピー
- 3 つのデータディレクトリを `VOLUME` として宣言
- ポート 3001 を公開

### .dockerignore

ビルドコンテキストに含めないファイル:

```
node_modules
dist
dist-server
data
uploads
posts
.git
.github
*.md
```

---

## ローカルでのビルドと実行

### イメージのビルド

```bash
docker build -t eszett-log .
```

### コンテナの起動

```bash
docker run -d \
  --name eszett-log \
  -p 3001:3001 \
  -e JWT_SECRET=my-secret-key \
  -e SITE_TITLE="My Blog" \
  -e DEFAULT_THEME=dark \
  -e DEFAULT_FONT_SIZE=medium \
  -v eszett-posts:/app/posts \
  -v eszett-data:/app/data \
  -v eszett-uploads:/app/uploads \
  eszett-log
```

`http://localhost:3001` でアクセスできる。

### 利用可能な環境変数

| 変数名 | 説明 | デフォルト値 |
|---|---|---|
| `PORT` | リッスンポート | `3001` |
| `JWT_SECRET` | JWT 署名鍵 | `eszett-log-secret-change-in-production` |
| `NODE_ENV` | 実行環境 | `production`（Dockerfile で設定済み） |
| `SITE_TITLE` | サイトタイトル | `eszett-log` |
| `DEFAULT_THEME` | デフォルトテーマ (`light` / `dark`) | `light` |
| `DEFAULT_FONT_SIZE` | デフォルトフォントサイズ (`small` / `medium` / `large`) | `medium` |

---

## docker-compose による実行

### 基本的な起動

```bash
docker compose up -d
```

### docker-compose.yaml の構成

```yaml
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=change-me-in-production
      # - SITE_TITLE=eszett-log
      # - DEFAULT_THEME=light
      # - DEFAULT_FONT_SIZE=medium
    volumes:
      - posts-data:/app/posts
      - app-data:/app/data
      - uploads-data:/app/uploads
    restart: unless-stopped

volumes:
  posts-data:
  app-data:
  uploads-data:
```

### カスタマイズ

環境変数を変更するには、`docker-compose.yaml` の `environment` セクションを編集する。コメントアウトされた行を有効にし、値を変更する:

```yaml
    environment:
      - NODE_ENV=production
      - PORT=3001
      - JWT_SECRET=your-production-secret
      - SITE_TITLE=My Blog
      - DEFAULT_THEME=dark
      - DEFAULT_FONT_SIZE=large
```

または `.env` ファイルを使用する:

```yaml
    env_file:
      - .env
```

### 操作コマンド

```bash
# バックグラウンドで起動
docker compose up -d

# ログ確認
docker compose logs -f

# 再ビルドして起動
docker compose up -d --build

# 停止
docker compose down

# 停止 + ボリューム削除（データも削除される）
docker compose down -v
```

---

## GitHub Actions CI/CD パイプライン

### ワークフローファイル

`.github/workflows/docker-build.yaml` に定義されている。

### トリガー条件

| イベント | 条件 | 動作 |
|---|---|---|
| `push` | `main` ブランチ | ビルド + ghcr.io へプッシュ |
| `push` | `v*` タグ（例: `v1.0.0`） | ビルド + ghcr.io へプッシュ |
| `pull_request` | `main` ブランチ向け | ビルドのみ（プッシュしない） |

### パイプラインのステップ

```
1. Checkout          — リポジトリをクローン
2. Setup Buildx      — Docker Buildx をセットアップ（マルチプラットフォーム対応）
3. Login to GHCR     — GitHub Container Registry にログイン（PR 時はスキップ）
4. Extract metadata  — イメージタグとラベルを自動生成
5. Build and push    — イメージのビルドとプッシュ
```

### イメージタグの自動生成ルール

`docker/metadata-action` により、push イベントに応じて以下のタグが自動付与される:

| トリガー | 生成されるタグの例 |
|---|---|
| `main` ブランチへの push | `ghcr.io/OWNER/eszett-log:main` |
| `v1.2.3` タグの push | `ghcr.io/OWNER/eszett-log:1.2.3`, `ghcr.io/OWNER/eszett-log:1.2` |
| 全ての push | `ghcr.io/OWNER/eszett-log:sha-abc1234` |

### 必要なリポジトリ設定

GitHub Actions が ghcr.io にプッシュするために必要な設定:

1. **パッケージ権限**: ワークフロー内で `permissions.packages: write` を宣言済み
2. **GITHUB_TOKEN**: GitHub が自動提供するため、追加のシークレット設定は不要
3. **パッケージの公開設定**: デフォルトでプライベート。公開する場合は GitHub の Packages 設定から変更する

### ビルドキャッシュ

GitHub Actions Cache（`type=gha`）を使ったレイヤーキャッシュが有効になっている:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

これにより、変更のないレイヤーはキャッシュから再利用され、ビルド時間が短縮される。

### リリース手順

新しいバージョンをリリースするには:

```bash
# タグを作成して push
git tag v1.0.0
git push origin v1.0.0
```

これにより GitHub Actions が自動でビルド・プッシュし、`v1.0.0`、`1.0`、`sha-xxxxxxx` のタグが付いたイメージが ghcr.io に登録される。

---

## Kubernetes へのデプロイ

### 前提条件

- `kubectl` がインストールされ、クラスタに接続済みであること
- ghcr.io からイメージを pull できること（プライベートイメージの場合は imagePullSecrets の設定が必要）

### デプロイ手順

#### 1. イメージリポジトリの変更

```bash
sed -i 's|ghcr.io/OWNER/eszett-log|ghcr.io/your-org/eszett-log|' k8s/deployment.yaml
```

#### 2. Secret の編集

`k8s/secret.yaml` を開き、JWT_SECRET を base64 エンコードした値に置き換える:

```bash
echo -n 'your-production-secret' | base64
# → eW91ci1wcm9kdWN0aW9uLXNlY3JldA==
```

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: eszett-log-secret
  namespace: eszett-log
type: Opaque
data:
  JWT_SECRET: eW91ci1wcm9kdWN0aW9uLXNlY3JldA==
```

#### 3. Ingress ホスト名の変更

```bash
sed -i 's|eszett-log.example.com|blog.your-domain.com|' k8s/ingress.yaml
```

#### 4. マニフェストの適用

```bash
kubectl apply -f k8s/
```

#### 5. デプロイ確認

```bash
# Pod の状態確認
kubectl get pods -n eszett-log

# ログの確認
kubectl logs -n eszett-log -l app=eszett-log

# Service の確認
kubectl get svc -n eszett-log
```

### マニフェスト一覧

| ファイル | リソース | 説明 |
|---|---|---|
| `namespace.yaml` | Namespace | `eszett-log` namespace を作成 |
| `secret.yaml` | Secret | `JWT_SECRET` を格納 |
| `pvc.yaml` | PersistentVolumeClaim ×3 | posts (1Gi), data (256Mi), uploads (5Gi) |
| `deployment.yaml` | Deployment | アプリケーション Pod（liveness/readiness probe 付き） |
| `service.yaml` | Service | ClusterIP（ポート 80 → 3001） |
| `ingress.yaml` | Ingress | nginx Ingress Controller 用 |

### プライベートレジストリからの pull

ghcr.io のイメージがプライベートの場合、imagePullSecrets を設定する:

```bash
# Secret の作成
kubectl create secret docker-registry ghcr-secret \
  --namespace eszett-log \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_PAT

# deployment.yaml に追加
#   spec:
#     imagePullSecrets:
#       - name: ghcr-secret
```

---

## Helm チャートによるデプロイ

### 前提条件

- Helm 3 がインストールされていること

### 基本的なインストール

```bash
helm install my-blog charts/eszett-log \
  --set image.repository=ghcr.io/your-org/eszett-log \
  --set image.tag=v1.0.0 \
  --set secret.jwtSecret=your-production-secret
```

### values.yaml によるカスタマイズ

`charts/eszett-log/values.yaml` をコピーしてカスタム values ファイルを作成する:

```bash
cp charts/eszett-log/values.yaml my-values.yaml
```

`my-values.yaml` を編集:

```yaml
replicaCount: 1

image:
  repository: ghcr.io/your-org/eszett-log
  tag: v1.0.0
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  host: blog.your-domain.com
  annotations: {}
  tls: []

env:
  NODE_ENV: production
  PORT: "3001"
  SITE_TITLE: "My Blog"
  DEFAULT_THEME: dark
  DEFAULT_FONT_SIZE: medium

secret:
  jwtSecret: your-production-secret

persistence:
  posts:
    size: 1Gi
    storageClass: ""
  data:
    size: 256Mi
    storageClass: ""
  uploads:
    size: 5Gi
    storageClass: ""

resources:
  requests:
    cpu: 50m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

カスタム values ファイルを指定してインストール:

```bash
helm install my-blog charts/eszett-log -f my-values.yaml
```

### 主な values パラメータ

| キー | デフォルト | 説明 |
|---|---|---|
| `image.repository` | `ghcr.io/OWNER/eszett-log` | コンテナイメージリポジトリ |
| `image.tag` | `latest` | イメージタグ |
| `image.pullPolicy` | `IfNotPresent` | イメージ pull ポリシー |
| `service.type` | `ClusterIP` | Service タイプ |
| `service.port` | `80` | Service ポート |
| `ingress.enabled` | `false` | Ingress を作成するか |
| `ingress.className` | `nginx` | IngressClass 名 |
| `ingress.host` | `eszett-log.example.com` | Ingress ホスト名 |
| `secret.jwtSecret` | `change-me-in-production` | JWT 署名鍵 |
| `persistence.posts.size` | `1Gi` | 記事ボリュームサイズ |
| `persistence.data.size` | `256Mi` | 設定ボリュームサイズ |
| `persistence.uploads.size` | `5Gi` | 画像ボリュームサイズ |
| `env.*` | — | 任意の環境変数 |

### Helm 操作コマンド

```bash
# インストール
helm install my-blog charts/eszett-log -f my-values.yaml

# アップグレード（設定変更やイメージ更新時）
helm upgrade my-blog charts/eszett-log -f my-values.yaml

# 状態確認
helm status my-blog

# アンインストール
helm uninstall my-blog

# テンプレートのプレビュー（実際には適用しない）
helm template my-blog charts/eszett-log -f my-values.yaml
```

---

## トラブルシューティング

### ビルドが失敗する

```bash
# テストが失敗している場合
# ローカルでテストを実行して原因を確認
npm test

# Docker ビルドのデバッグ（build ステージまで）
docker build --target build -t eszett-log-debug .
docker run --rm eszett-log-debug ls -la dist/
```

### コンテナが起動しない

```bash
# ログを確認
docker logs eszett-log

# Kubernetes の場合
kubectl logs -n eszett-log -l app=eszett-log
kubectl describe pod -n eszett-log -l app=eszett-log
```

### データが消える

- `docker compose down -v` を使うとボリュームも削除される。データを残す場合は `-v` を付けない
- Kubernetes の場合、PVC が `Retain` ポリシーでない場合、Pod 削除時にデータが消える可能性がある。`storageClass` の `reclaimPolicy` を確認する

### ghcr.io にプッシュできない

- リポジトリの Settings → Actions → General で "Read and write permissions" が有効か確認
- プライベートリポジトリの場合、Packages 設定でワークフローからのアクセスが許可されているか確認

### Ingress にアクセスできない

- Ingress Controller（nginx-ingress-controller 等）がクラスタにインストールされているか確認
- ホスト名の DNS が Ingress Controller の外部 IP を指しているか確認

```bash
# Ingress Controller の状態確認
kubectl get pods -n ingress-nginx

# Ingress リソースの状態確認
kubectl describe ingress -n eszett-log
```
