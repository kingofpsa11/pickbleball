# Pickleball Thuỷ Lợi

Website độc lập để xem và nhập kết quả giải pickleball nội bộ. Khi tạo giải, ban tổ chức nhập tên người tham dự. Bắt đầu giải sẽ ghép ngẫu nhiên hai người thành một đội và xếp lịch vòng tròn, mỗi đội chỉ gặp nhau một lần. Đội đứng nhất khi đấu xong là vô địch. Khách không có tài khoản xem lịch thi đấu, trận đang đấu và bảng xếp hạng. Giai đoạn 1 chỉ chạy trên máy bạn, dùng dữ liệu mẫu, chưa có máy chủ và chưa kết nối MySQL.

## Chạy thử

```bash
npm install
npm run dev
```

Mở địa chỉ mà lệnh in ra (thường là http://localhost:5173).

Tài khoản mẫu của ban tổ chức: `admin` / `demo123`.

Muốn thấy kết quả đổi không cần tải lại: mở một tab trang khán giả và một tab ban tổ chức. Lưu tỷ số ở tab ban tổ chức, tab khán giả tự đổi.

## Chưa làm

Chưa có backend, chưa có database `pickleball_results`, chưa triển khai lên mạng. Những phần đó chỉ làm sau khi được đồng ý.
