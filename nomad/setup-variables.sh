#!/usr/bin/env bash
#
# eszett-log Nomad 環境セットアップスクリプト
#
# 特定環境向けのコンフィグとシークレットを一括で設定し、ジョブを投入する。
# 値を編集してから実行すること。
#
# 前提:
#   - nomad CLI がインストール済みであること
#   - NOMAD_ADDR / NOMAD_TOKEN が設定済みであること（ACL 有効時）

set -euo pipefail

# =============================================================================
# Secrets (Nomad Variables)
# =============================================================================
JWT_SECRET="CHANGE_ME"

# =============================================================================
# Config (HCL Variables)
# =============================================================================
IMAGE="ghcr.io/OWNER/eszett-log:latest"
SITE_TITLE="eszett-log"
DEFAULT_THEME="light"          # light | dark
DEFAULT_FONT_SIZE="medium"     # small | medium | large
DATACENTERS='["dc1"]'
NAMESPACE="default"

# =============================================================================
# Apply
# =============================================================================

echo "==> Putting Nomad Variables..."
nomad var put nomad/jobs/eszett-log \
  jwt_secret="${JWT_SECRET}"

echo "==> Running job..."
nomad job run \
  -var="image=${IMAGE}" \
  -var="site_title=${SITE_TITLE}" \
  -var="default_theme=${DEFAULT_THEME}" \
  -var="default_font_size=${DEFAULT_FONT_SIZE}" \
  -var="datacenters=${DATACENTERS}" \
  -var="namespace=${NAMESPACE}" \
  nomad/eszett-log.nomad.hcl
