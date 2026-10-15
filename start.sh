#!/bin/bash
# Muat variabel dari .env jika ada
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

PORT=${PORT:-3000}

# Cek apakah port sedang digunakan oleh proses lain
PID=$(lsof -ti :$PORT 2>/dev/null)
if [ -n "$PID" ]; then
  echo "⚠️  Port $PORT sedang digunakan (PID: $PID)."
  echo "👉 Menghentikan proses lama untuk restart bersih..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
fi

echo "🌸 ====================================================="
echo "🌸 Menjalankan SakuraSensei AI - Belajar Bahasa Jepang"
echo "🌸 Buka Browser: http://localhost:$PORT"
echo "🌸 ====================================================="
python3 server.py
