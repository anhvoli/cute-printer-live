# Cute Printer Live

Game TikTok LIVE: máy in mini tai mèo dễ thương, viewer tặng quà / comment là
máy in ra giấy ngay trên sân khấu 9:16. Viết bằng React 19 + TypeScript +
Node.js + Vite, chia 2 trang: **Game** (sân khấu) và **Admin** (quản lý kênh
TikTok LIVE).

- **Trang Game (`#/`):** sân khấu 9:16 trên bàn gỗ, máy in trắng-xanh tai mèo
  (nháy mắt, wink khi có quà), banner đen hiện sự kiện live, giấy in cuộn liên
  tục (dòng chat / vào live / thẻ cảm ơn quà), thẻ **PRINT MENU** nền trắng mờ
  với ảnh thật của quà TikTok, live mô phỏng tự chạy.
- **Trang Admin (`#/admin`):** phong cách trang điều khiển Thắp Sáng Bản Đồ
  (nền tối, nút amber). Quản lý kênh TikTok: thêm kênh, Kết nối/Ngắt, chuyển
  kênh đang phát, kết nối lại, xóa kênh; link thật cho TikTok LIVE Studio kèm
  nút Sao chép; giọng đọc trên stage (Nữ Hoài My / Nam Nam Minh, tốc độ
  0.85x-1.3x, Reset game); chữ & âm thanh; giả lập sự kiện và Live tự động
  10/50/100 người. Kênh và cài đặt lưu ở server nên tải lại trang vẫn còn.

## Yêu cầu

- Node.js >= 20 và npm >= 10
- Git

## Cài đặt

```bash
git clone https://github.com/anhvoli/cute-printer-live.git
cd cute-printer-live

# Tải ảnh thật của 4 món quà TikTok vào client/src/assets/
# (Rose, Finger Heart, Doughnut, Love you so much — nguồn BeetGames,
# xem scripts/download-gift-images.sh)
bash scripts/download-gift-images.sh

npm install
```

## Chạy

```bash
npm run build   # build client -> client/dist (chỉ cần chạy 1 lần, và sau mỗi lần sửa code)
npm start       # chạy server ở http://localhost:3000 (đổi cổng bằng PORT=4000 npm start)
```

Mở http://localhost:3000 — trang Game mặc định (`#/`), trang Admin ở
`#/admin`.

Chạy dev (tự reload khi sửa code):

```bash
npm run dev     # Vite ở http://localhost:5173, API ở http://localhost:3000
```

> **Dữ liệu lưu ở đâu:** kênh TikTok và cài đặt lưu trong file `data.json`
> ở thư mục gốc của repo (tự tạo khi có thay đổi đầu tiên, đã cho vào
> `.gitignore`). Xóa file này là reset về mặc định (kênh trống, chữ cảm ơn
> "Cảm ơn bạn!", giọng nữ, tốc độ 1x).
>
> **Bản chạy trên Muse:** repo này là bản standalone chạy bằng Node.js/npm.
> Bản gốc chạy trên Muse (Hatch runtime, lưu dữ liệu vào SQLite) vẫn riêng
> biệt — code tham chiếu của nó nằm ở `server/src/actions.ts`,
> `server/src/schema.ts` và `drizzle/`, không dùng để chạy bản này.

## Mở các trang

- Trang Game: mở app (mặc định, `#/game`)
- Trang Admin: thêm `#/admin` vào cuối URL, ví dụ
  `http://localhost:3000/#/admin`
- Link cho TikTok LIVE Studio: lấy URL trang Game trong thẻ
  **Kết nối TikTok LIVE** ở trang Admin (nút **Sao chép link**), dán vào
  LIVE Studio làm nguồn trình duyệt 1080 x 1920.

## Cấu trúc

```
client/                 React 19 + Tailwind CSS 4 (build bằng Vite)
  src/App.tsx           Hash routing (#/game, #/admin), state dùng chung
  src/pages/GamePage.tsx    Trang Game — sân khấu máy in
  src/pages/AdminPage.tsx   Trang Admin — quản lý kênh, giọng đọc, giả lập
  src/components/PrinterStage.tsx   Sân khấu máy in + giấy in + PRINT MENU
  src/lib/live.ts       Engine live mô phỏng, bảng quà, hiệu ứng in
  src/assets/           Ảnh thật 4 món quà TikTok (tải bằng script, xem dưới)
server/
  standalone/server.mjs   Server Node.js: phục vụ client/dist + API /api/actions,
                          lưu kênh/cài đặt vào data.json (bản standalone)
  src/actions.ts        Server actions bản Muse (chỉ để tham chiếu, không dùng ở đây)
  src/schema.ts         Drizzle schema bản Muse (chỉ để tham chiếu)
drizzle/                SQL migration bản Muse (chỉ để tham chiếu)
scripts/
  download-gift-images.sh   Tải ảnh quà TikTok từ BeetGames
  dev.mjs               Chạy Vite dev + API server cùng lúc (npm run dev)
vite.config.ts          Cấu hình Vite (root client/, proxy /api -> :3000)
data.json               Kênh + cài đặt đã lưu (tự tạo, không commit)
```

## Ảnh quà TikTok

Ảnh thật của 4 món quà trong PRINT MENU và thẻ quà trên giấy in, nguồn từ
trang tổng hợp icon quà TikTok của BeetGames:

| Quà | Xu | Ảnh |
| --- | --- | --- |
| Rose | 1 | beetgames.com/images/gifts/rose.webp |
| Finger Heart | 5 | beetgames.com/images/gifts/finger_heart.webp |
| Doughnut | 30 | beetgames.com/images/gifts/doughnut.webp |
| Love you so much | — | beetgames.com/images/gifts/love_you_so_much.webp |

Ảnh quà là tài sản của TikTok, chỉ dùng làm icon minh họa trong game này.
File ảnh không commit kèm repo — chạy `scripts/download-gift-images.sh`
trước khi build (script tải đúng 4 file trên về `client/src/assets/`).

## Giấy phép

Chưa có giấy phép — mọi quyền được bảo lưu. Nếu anh muốn mở source, thêm
file `LICENSE` (ví dụ MIT) rồi hãy public rộng rãi.
