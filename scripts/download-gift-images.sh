#!/usr/bin/env bash
# Tải ảnh thật của 4 món quà TikTok về client/src/assets/.
# Nguồn: BeetGames — trang tổng hợp icon quà TikTok
# https://beetgames.com/tiktok-gifts/icons/
# Chạy 1 lần sau khi clone repo (ảnh không commit kèm repo).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p client/src/assets
BASE="https://beetgames.com/images/gifts"
curl -fsSL -o client/src/assets/gift-rose.webp "$BASE/rose.webp"
curl -fsSL -o client/src/assets/gift-finger_heart.webp "$BASE/finger_heart.webp"
curl -fsSL -o client/src/assets/gift-doughnut.webp "$BASE/doughnut.webp"
curl -fsSL -o client/src/assets/gift-love_you_so_much.webp "$BASE/love_you_so_much.webp"
echo "Da tai xong 4 anh qua vao client/src/assets/"
