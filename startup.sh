#!/bin/sh
set -eu
# The project root: /workspace on the app platform, wherever this file sits anywhere else.
cd /workspace 2>/dev/null || cd "$(dirname "$0")"
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
