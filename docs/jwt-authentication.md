# JWT 認証ガイド

eszett-log における JWT (JSON Web Token) を用いた認証の仕組みと設定方法について説明する。

## 目次

1. [概要](#概要)
2. [認証フロー](#認証フロー)
3. [JWT_SECRET の設定](#jwt_secret-の設定)
4. [トークンの仕様](#トークンの仕様)
5. [API エンドポイント](#api-エンドポイント)
6. [クライアント側の実装](#クライアント側の実装)
7. [認証が必要なエンドポイント一覧](#認証が必要なエンドポイント一覧)
8. [セキュリティに関する注意事項](#セキュリティに関する注意事項)
9. [トラブルシューティング](#トラブルシューティング)

---

## 概要

eszett-log は [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) ライブラリを使用した Bearer トークン方式の認証を採用している。

- パスワードは [bcryptjs](https://www.npmjs.com/package/bcryptjs) でハッシュ化して `data/users.json` に保存
- ログイン成功時にサーバーが JWT を発行し、クライアントは `localStorage` に保存
- 以降のリクエストでは `Authorization: Bearer <token>` ヘッダーでトークンを送信
- サーバーはリクエストごとにトークンを検証し、認証済みユーザーを識別

---

## 認証フロー

```
┌──────────┐                              ┌──────────┐
│ クライアント │                              │  サーバー  │
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1. POST /api/auth/login                │
     │     { username, password }               │
     │ ──────────────────────────────────────>  │
     │                                         │
     │         2. パスワードを bcrypt で検証       │
     │                                         │
     │  3. { token, username }                  │
     │ <──────────────────────────────────────  │
     │                                         │
     │  4. token を localStorage に保存          │
     │                                         │
     │  5. GET /api/posts (認証不要)             │
     │     ヘッダーなし                          │
     │ ──────────────────────────────────────>  │
     │                                         │
     │  6. POST /api/posts (認証必須)            │
     │     Authorization: Bearer <token>        │
     │ ──────────────────────────────────────>  │
     │                                         │
     │         7. JWT を検証、ユーザーを識別       │
     │                                         │
     │  8. { slug: "new-post" }                 │
     │ <──────────────────────────────────────  │
```

---

## JWT_SECRET の設定

JWT の署名に使用する秘密鍵は `JWT_SECRET` 環境変数で設定する。

### デフォルト値

```
eszett-log-secret-change-in-production
```

**本番環境では必ず変更すること。** デフォルト値のままでは第三者がトークンを偽造できる。

### 設定方法

#### 環境変数で直接指定

```bash
JWT_SECRET=my-secure-random-secret node dist-server/index.js
```

#### .env ファイル

```
JWT_SECRET=my-secure-random-secret
```

#### docker-compose.yaml

```yaml
services:
  app:
    environment:
      - JWT_SECRET=my-secure-random-secret
```

#### Kubernetes Secret

```bash
# base64 エンコード
echo -n 'my-secure-random-secret' | base64
# → bXktc2VjdXJlLXJhbmRvbS1zZWNyZXQ=

# k8s/secret.yaml に設定
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: eszett-log-secret
  namespace: eszett-log
type: Opaque
data:
  JWT_SECRET: bXktc2VjdXJlLXJhbmRvbS1zZWNyZXQ=
```

#### Helm chart

```bash
helm install my-blog charts/eszett-log \
  --set secret.jwtSecret=my-secure-random-secret
```

### 安全な秘密鍵の生成方法

```bash
# OpenSSL を使用（推奨）
openssl rand -base64 32

# Node.js を使用
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# /dev/urandom を使用 (Linux/macOS)
head -c 32 /dev/urandom | base64
```

32 バイト以上のランダムな文字列を推奨する。

---

## トークンの仕様

### ペイロード

```json
{
  "username": "admin",
  "iat": 1708900000,
  "exp": 1708986400
}
```

| フィールド | 説明 |
|---|---|
| `username` | 認証されたユーザー名 |
| `iat` | トークン発行時刻 (Issued At) — 自動付与 |
| `exp` | トークン有効期限 (Expiration) — 発行から 24 時間後 |

### 署名アルゴリズム

jsonwebtoken ライブラリのデフォルトである **HS256** (HMAC-SHA256) を使用する。

### 有効期限

トークンは発行から **24 時間** で失効する。失効後は再ログインが必要。

```typescript
const token = jwt.sign({ username: user.username }, JWT_SECRET, {
  expiresIn: '24h',
})
```

---

## API エンドポイント

### ログイン — `POST /api/auth/login`

ユーザー名とパスワードを送信し、JWT トークンを取得する。

**リクエスト:**

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "admin", "password": "admin"}'
```

**成功レスポンス (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "admin"
}
```

**エラーレスポンス:**

| ステータス | レスポンス | 原因 |
|---|---|---|
| 400 | `{"error": "username and password required"}` | リクエストボディが不足 |
| 401 | `{"error": "invalid credentials"}` | ユーザー名またはパスワードが不正 |

### 認証確認 — `GET /api/auth/me`

現在のトークンが有効かどうかを確認する。

**リクエスト:**

```bash
curl http://localhost:3001/api/auth/me \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...'
```

**成功レスポンス (200):**

```json
{
  "username": "admin"
}
```

**エラーレスポンス:**

| ステータス | レスポンス | 原因 |
|---|---|---|
| 401 | `{"error": "no token"}` | Authorization ヘッダーがない |
| 401 | `{"error": "invalid token"}` | トークンが無効または期限切れ |

### パスワード変更 — `PUT /api/settings/password`

現在のパスワードを確認した上で、新しいパスワードに変更する。

**リクエスト:**

```bash
curl -X PUT http://localhost:3001/api/settings/password \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...' \
  -d '{"currentPassword": "admin", "newPassword": "new-secure-password"}'
```

**成功レスポンス (200):**

```json
{
  "ok": true
}
```

**エラーレスポンス:**

| ステータス | レスポンス | 原因 |
|---|---|---|
| 400 | `{"error": "currentPassword and newPassword required"}` | 必須フィールドの不足 |
| 400 | `{"error": "password must be at least 4 characters"}` | 新パスワードが短すぎる |
| 401 | `{"error": "authentication required"}` | トークンがない |
| 401 | `{"error": "current password is incorrect"}` | 現在のパスワードが不正 |

---

## クライアント側の実装

### トークンの保存

ログイン成功後、トークンは `localStorage` に `token` キーで保存される。

```typescript
const { token, username } = await login('admin', 'admin')
localStorage.setItem('token', token)
```

### リクエスト時のトークン送信

認証が必要な API 呼び出しでは、`Authorization: Bearer <token>` ヘッダーを自動付与する。

```typescript
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}
```

### 認証状態の確認

アプリケーション起動時に `GET /api/auth/me` を呼び出し、保存済みトークンの有効性を確認する。無効な場合は未ログイン状態として扱う。

```typescript
async function checkAuth(): Promise<{ username: string } | null> {
  const token = localStorage.getItem('token')
  if (!token) return null
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}
```

### ログアウト

`localStorage` からトークンを削除するだけで完了する。サーバー側にログアウト API はない（JWT はステートレスなため）。

```typescript
localStorage.removeItem('token')
```

---

## 認証が必要なエンドポイント一覧

以下のエンドポイントは `Authorization: Bearer <token>` ヘッダーが必須。ヘッダーがない場合やトークンが無効な場合は `401` が返される。

| メソッド | パス | 説明 |
|---|---|---|
| `POST` | `/api/posts` | 記事作成 |
| `PUT` | `/api/posts/:slug` | 記事更新 |
| `DELETE` | `/api/posts/:slug` | 記事削除 |
| `POST` | `/api/posts/upload` | Markdown ファイルアップロード |
| `POST` | `/api/images` | 画像アップロード |
| `PUT` | `/api/settings` | サイト設定更新 |
| `PUT` | `/api/settings/password` | パスワード変更 |

認証不要のエンドポイント:

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/api/posts` | 記事一覧 |
| `GET` | `/api/posts/:slug` | 記事取得 |
| `GET` | `/api/settings` | サイト設定取得 |
| `GET` | `/api/images/:filename` | 画像取得 |
| `POST` | `/api/auth/login` | ログイン |
| `GET` | `/api/auth/me` | 認証確認 |

---

## セキュリティに関する注意事項

### JWT_SECRET

- **本番環境ではデフォルト値を絶対に使用しない**。デフォルトの `eszett-log-secret-change-in-production` はソースコードに含まれており、誰でもトークンを偽造できる
- 32 バイト以上のランダム文字列を使用する
- 秘密鍵を Git リポジトリにコミットしない（`.env` ファイルは `.gitignore` に追加済み）

### パスワード

- パスワードは bcrypt（コスト係数 10）でハッシュ化して保存される
- 平文パスワードがディスクに書き込まれることはない
- 初期パスワード `admin` は初回ログイン後に速やかに変更すること

### トークンの保管

- トークンは `localStorage` に保存される。XSS 攻撃に対する脆弱性がある点に留意する
- より高いセキュリティが必要な場合は、HttpOnly Cookie への変更を検討する

### HTTPS

- 本番環境では必ず HTTPS を使用する。HTTP ではトークンが平文で送信され、中間者攻撃のリスクがある
- Kubernetes Ingress の場合、TLS 設定を有効にする:

```yaml
# k8s/ingress.yaml または Helm values
ingress:
  tls:
    - hosts:
        - blog.example.com
      secretName: blog-tls-secret
```

### JWT_SECRET の変更

`JWT_SECRET` を変更すると、その時点で発行済みのすべてのトークンが無効になる。全ユーザーが再ログインを求められる。計画的に実施すること。

---

## トラブルシューティング

### ログインできない

```bash
# サーバーログを確認
docker logs eszett-log

# data/users.json の存在を確認
ls -la data/users.json

# ユーザーファイルが壊れている場合は削除して再起動（admin/admin で再作成される）
rm data/users.json
```

### トークンが無効と言われる

- トークンの有効期限（24 時間）が切れていないか確認
- `JWT_SECRET` がトークン発行時と同じか確認（サーバー再起動や環境変数の変更で変わっていないか）
- トークンの形式を確認:

```bash
# トークンのペイロードをデコード（署名検証なし）
echo 'eyJhbGciOi...' | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

### 初期パスワードを忘れた

初期ユーザー名: `admin`、初期パスワード: `admin`

パスワードを変更済みで忘れた場合:

```bash
# users.json を削除してサーバーを再起動
rm data/users.json
# → admin/admin で再作成される
```

**注意:** これにより既存のパスワード設定はリセットされる。

### curl でのテスト方法

```bash
# 1. ログインしてトークンを取得
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# 2. トークンを使って認証済みリクエスト
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 3. 記事を作成
curl -X POST http://localhost:3001/api/posts \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"slug":"test","title":"Test Post","content":"Hello world"}'
```
