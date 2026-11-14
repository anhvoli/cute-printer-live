# Cute Printer Live

Game TikTok LIVE: may in mini tai meo de thuong.

Game TikTok LIVE: máy in mini tai mèo dễ thương, viewer tặng quà / comment là
máy in ra giấy ngay trên sân khấu 9:16. Viết bằng React 19 + TypeScript + Bun,
chia 2 trang: **Game** (sân khấu) và **Admin** (quản lý kênh TikTok LIVE).

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

- Bun >= 1.3 (cài từ trang chủ Bun)
- Git

## Cài đặt

```bash
git clone https://github.com/anhvoli/cute-printer-live.git
cd cute-printer-live

# Tải ảnh thật của 4 món quà TikTok vào client/src/assets/
# (Rose, Finger Heart, Doughnut, Love you so much — nguồn BeetGames,
# xem scripts/download-gift-images.sh)
bash scripts/download-gift-images.sh

bun install
```

## Chạy / build

```bash
bun run typecheck       # kiểm tra TypeScript (client + server) — chạy được
bun run build:server    # build server -> server/dist/actions.js — chạy được
```

> **Lưu ý quan trọng:** app này được xây làm **Muse space** (Hatch runtime),
> và em đã kiểm chứng trực tiếp trên bản copy này: `bun install` (79 gói)
> và `bun run typecheck` chạy ngon, `bun run build:server` build được
> `server/dist/actions.js`. Nhưng **`bun run build:client` bị SDK chặn** —
> `buildClient()` của `@hatch/space-sdk` từ chối build tay, bundle client
> chỉ được tạo bởi trình build của Muse khi artifact được build/publish.
> Client gọi server qua `@hatch/space-sdk` (xem `package.json` — dependency
> `file:` trỏ tới SDK trong môi trường Muse) và server actions lưu dữ liệu
> kênh/cài đặt vào SQLite qua Drizzle (`server/src/actions.ts`,
> `server/src/schema.ts`, migration trong `drizzle/`). Vì vậy:
>
> - **Cách chạy đủ chức năng (khuyến nghị):** chạy bản đã deploy trên Muse —
>   trang Game và trang Admin dùng chung state lưu ở server.
> - **Chạy local ngoài Muse:** chỉ kiểm tra code và build server được;
>   muốn chạy đủ chức năng cần một host cung cấp endpoint `./actions` +
>   SQLite tương thích với `@hatch/space-sdk` (hiện SDK này chỉ có trong
>   môi trường Muse, và bundle client chỉ build được qua Muse).

## Mở các trang

- Trang Game: mở app (mặc định, `#/game`)
- Trang Admin: thêm `#/admin` vào cuối URL, ví dụ
  `http://localhost:3000/#/admin`
- Link cho TikTok LIVE Studio: lấy URL trang Game trong thẻ
  **Kết nối TikTok LIVE** ở trang Admin (nút **Sao chép link**), dán vào
  LIVE Studio làm nguồn trình duyệt 1080 x 1920.

## Cấu trúc

```
client/                 React 19 + Tailwind CSS 4
  src/App.tsx           Hash routing (#/game, #/admin), state dùng chung
  src/pages/GamePage.tsx    Trang Game — sân khấu máy in
  src/pages/AdminPage.tsx   Trang Admin — quản lý kênh, giọng đọc, giả lập
  src/components/PrinterStage.tsx   Sân khấu máy in + giấy in + PRINT MENU
  src/lib/live.ts       Engine live mô phỏng, bảng quà, hiệu ứng in
  src/assets/           Ảnh thật 4 món quà TikTok (tải bằng script, xem dưới)
server/
  src/actions.ts        Server actions: kênh + cài đặt (lưu SQLite)
  src/schema.ts         Drizzle schema: bảng channels, settings
drizzle/                SQL migration cho SQLite
scripts/
  download-gift-images.sh   Tải ảnh quà TikTok từ BeetGames
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
