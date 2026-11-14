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
npm install
npm start
```

Chỉ cần 2 lệnh sau khi clone: `npm install` rồi `npm start` là chạy —
`npm start` tự tải 4 ảnh quà TikTok thật (nếu chưa có) rồi tự build
client trước khi mở server ở `http://localhost:3000`. Không cần chạy
riêng `npm run build` hay script tải ảnh nữa (vẫn chạy riêng được nếu anh
muốn: `npm run build`, `bash scripts/download-gift-images.sh`).

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
  `http://localhost:3000/#/admin` — trang Admin **khóa bằng mật khẩu**,
  mật khẩu mặc định là `admin123`, đổi trong thẻ **Mật khẩu Admin** sau
  khi mở khóa. Mật khẩu lưu ở server, không lộ qua API; đóng tab là khóa
  lại, mở tab mới phải nhập lại.
- Link cho TikTok LIVE Studio: lấy URL trang Game trong thẻ
  **Kết nối TikTok LIVE** ở trang Admin (nút **Sao chép link**), dán vào
  LIVE Studio làm nguồn trình duyệt 1080 x 1920.

## Kết nối TikTok LIVE thật

Ngoài giả lập, app nối được vào phòng live thật trên TikTok. Cách nối và
chuẩn hóa sự kiện lấy đúng theo **Thắp Sáng Bản Đồ** (đã chạy thật trên
live): `new TikTokLiveConnection(username, { processInitialData: true,
enableExtendedGiftInfo: false })`, hỏi `fetchIsLive()` trước khi nối,
SSE named events, quà combo chỉ chuyển phần `repeatCount` mới (delta),
comment lấy ở `data.content` (proto v3).

1. Thêm kênh TikTok ở trang Admin, bấm **Kết nối** — server hỏi TikTok
   trước: kênh **chưa live** thì báo ngay "TikTok báo tài khoản này CHƯA
   LIVE. Bấm Phát trực tiếp trong LIVE Studio trước rồi mới kết nối"
   (không treo ở "Đang nối"); kênh đang live thì nối trong tối đa 30 giây.
2. Sự kiện thật tự in lên sân khấu, chung với giả lập:
   - Chat thật → in thành dòng chat trên giấy.
   - Quà thật → in thẻ cảm ơn (tên quà + ảnh quà thật nếu có); 4 món
     quen (Rose, Finger Heart, Doughnut, Love you so much) thì cộng vào
     PRINT MENU như cũ. Quà lạ vẫn in thẻ cảm ơn nhưng **không** cộng vào
     4 món của PRINT MENU. Quà combo (x5, x10...) chỉ in phần mới, không
     in trùng.
   - Người vào live → dòng "Đã tham gia vào Live!"; Follow → banner;
     Tim → cộng tim; số người xem trên banner lấy theo số thật của phòng.
3. Giọng đọc cảm ơn cũng theo luật Thắp Sáng: tên người tặng được làm
   sạch bằng `speakableName` (tên có từ cấm thì đọc là "bạn", số đọc
   thành chữ, tối đa 5 chữ) và `GiftThanker` chống spam — quà nhỏ của
   cùng 1 người chỉ cảm ơn bằng giọng 1 lần mỗi 30 giây, quà to
   (>= 99 xu) luôn cảm ơn. Thẻ cảm ơn thì vẫn in cho mọi món quà.
4. Bấm **Ngắt kết nối** để ngắt. Hết live thì server tự ngắt, mất mạng
   thì tự nối lại tối đa 5 lần. Giả lập bên dưới vẫn bấm được cả khi đang
   nối TikTok thật.

> **Lưu ý:** TikTok không có API chính thức cho live chat/quà — app dùng
> thư viện cộng đồng `tiktok-live-connector` để đọc phòng live công khai,
> không cần đăng nhập TikTok. TikTok có thể đổi hoặc chặn cách nối này
> bất cứ lúc nào; lúc đó giả lập vẫn chạy bình thường. Một lúc chỉ nối
> được một kênh.
>
> **Nếu bấm Kết nối mà báo "TikTok chặn nối từ mạng này":** máy chủ ký
> tên (EulerStream) chặn truy cập ẩn danh từ một số mạng (hay gặp ở mạng
> máy chủ/VPS). Cách xử lý: đăng ký key miễn phí ở
> https://www.eulerstream.com rồi chạy
> `EULER_API_KEY=<key-của-anh> npm start` (trên Windows PowerShell:
> `$env:EULER_API_KEY="<key-của-anh>"; npm start`). Trên mạng nhà thường
> không cần key.

## Cấu trúc

```
client/                 React 19 + Tailwind CSS 4 (build bằng Vite)
  src/App.tsx           Hash routing (#/game, #/admin), state dùng chung
  src/pages/GamePage.tsx    Trang Game — sân khấu máy in
  src/pages/AdminPage.tsx   Trang Admin — quản lý kênh, giọng đọc, giả lập
  src/components/PrinterStage.tsx   Sân khấu máy in + giấy in + PRINT MENU
  src/lib/live.ts       Engine live mô phỏng, bảng quà, hiệu ứng in
  src/lib/tiktok.ts     Nghe SSE TikTok thật (named events kiểu Thắp Sáng)
  src/lib/speakableName.ts  Tên TikTok -> tên cho giọng đọc (từ Thắp Sáng)
  src/lib/bannedWords.ts    Từ cấm dùng cho speakableName (từ Thắp Sáng)
  src/lib/chatter.ts    Luật cảm ơn quà GiftThanker + plain (từ Thắp Sáng)
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
