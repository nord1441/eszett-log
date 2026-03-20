#!/usr/bin/env bash
#
# eszett-log Nomad Variables セットアップスクリプト
#
# Nomad Variables にシークレットを登録する。
# ジョブを実行する前に一度だけ実行すればよい。
#
# 使い方:
#   ./nomad/setup-variables.sh
#   ./nomad/setup-variables.sh --jwt-secret "my-secret"
#   JWT_SECRET=my-secret ./nomad/setup-variables.sh
#
# 前提:
#   - nomad CLI がインストール済みであること
#   - NOMAD_ADDR / NOMAD_TOKEN が設定済みであること（ACL 有効時）

set -euo pipefail

VAR_PATH="nomad/jobs/eszett-log"

# --- Parse arguments ---
JWT_SECRET="${JWT_SECRET:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --jwt-secret)
      JWT_SECRET="$2"
      shift 2
      ;;
    --jwt-secret=*)
      JWT_SECRET="${1#*=}"
      shift
      ;;
    -h|--help)
      cat <<HELP
Usage: $0 [OPTIONS]

Options:
  --jwt-secret <value>   JWT signing secret (or set JWT_SECRET env var)
  -h, --help             Show this help

Environment variables:
  NOMAD_ADDR    Nomad server address (default: http://127.0.0.1:4646)
  NOMAD_TOKEN   Nomad ACL token (required if ACL is enabled)
  JWT_SECRET    JWT signing secret (alternative to --jwt-secret flag)

Examples:
  $0 --jwt-secret "my-production-secret"
  JWT_SECRET=\$(openssl rand -base64 32) $0
HELP
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# --- Prompt for secret if not provided ---
if [[ -z "$JWT_SECRET" ]]; then
  echo "JWT_SECRET is not set."
  echo "You can generate one with: openssl rand -base64 32"
  echo ""
  read -rsp "Enter JWT_SECRET: " JWT_SECRET
  echo ""

  if [[ -z "$JWT_SECRET" ]]; then
    echo "Error: JWT_SECRET cannot be empty." >&2
    exit 1
  fi
fi

# --- Put Nomad Variable ---
echo "Putting Nomad Variable at path: ${VAR_PATH}"

nomad var put "${VAR_PATH}" \
  jwt_secret="${JWT_SECRET}"

echo ""
echo "Done. Nomad Variable '${VAR_PATH}' has been set."
echo ""
echo "You can now run the job:"
echo "  nomad job run nomad/eszett-log.nomad.hcl"
echo ""
echo "To verify the variable:"
echo "  nomad var get ${VAR_PATH}"
