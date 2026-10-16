# Pickleball Thuỷ Lợi

Website độc lập để xem và nhập kết quả giải pickleball nội bộ. Khi tạo giải, ban tổ chức nhập tên người tham dự. Bắt đầu giải sẽ ghép ngẫu nhiên hai người thành một đội và xếp lịch vòng tròn, mỗi đội chỉ gặp nhau một lần. Đội đứng nhất khi đấu xong là vô địch. Khách không có tài khoản xem lịch thi đấu, trận đang đấu và bảng xếp hạng. Giai đoạn 1 chỉ chạy trên máy bạn, dùng dữ liệu mẫu, chưa có máy chủ và chưa kết nối MySQL.

## Chạy thử trên trình duyệt

```powershell
npm install
npm run dev
```

Mở địa chỉ mà lệnh in ra (thường là http://localhost:5173). Cách này vẫn lưu dữ liệu trong trình duyệt, chưa qua Cloudflare.

Tài khoản mẫu của ban tổ chức: `admin` / `demo123`.

## Chạy thử như Cloudflare

```powershell
npm install
npm run cf:preview
```

Mở http://127.0.0.1:8788. Lệnh này build giao diện, tạo database local `pickleball-thuyloi-db` và chạy Pages Functions bằng Wrangler. Dữ liệu nằm trong D1 local, còn sau khi tắt máy.

Khách xem lịch và bảng xếp hạng, khoảng 45 giây sẽ hỏi máy chủ một lần khi tab đang mở. Ban tổ chức đăng nhập thì cookie được kiểm tra trên server. Hướng dẫn đưa lên mạng nằm trong `CLOUDFLARE_DEPLOY.md`. Chưa triển khai production.

## Chưa làm

Chưa tạo database trên tài khoản Cloudflare và chưa publish `pages.dev`. Không dùng MySQL hay VPS.
