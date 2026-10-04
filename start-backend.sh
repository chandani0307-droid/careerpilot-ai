#!/usr/bin/env bash
# Usage: ./start-backend.sh   (creates venv on first run)
set -e
cd "$(dirname "$0")/backend"
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
uvicorn app.main:app --reload --port 8000
