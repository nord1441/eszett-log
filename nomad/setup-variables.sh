#!/usr/bin/env bash
#
# eszett-log Nomad Variables セットアップスクリプト
#
# nomad var put で設定すべき変数を列挙している。
# 値を編集してから実行すること。
#
# 前提:
#   - nomad CLI がインストール済みであること
#   - NOMAD_ADDR / NOMAD_TOKEN が設定済みであること（ACL 有効時）

set -euo pipefail

nomad var put nomad/jobs/eszett-log \
  jwt_secret="CHANGE_ME"
