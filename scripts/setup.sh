#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'EOF'
Info Collector 0.2 supports production-pilot installation on Windows 11 only.
Use scripts/setup.ps1 on Windows. macOS support requires a
Keychain-backed installer with equivalent security and integration tests.
EOF
exit 1
