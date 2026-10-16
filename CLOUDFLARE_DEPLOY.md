# Triển khai Pickleball Thuỷ Lợi lên Cloudflare Free

Chưa triển khai. Chỉ chạy các lệnh dưới đây khi đã đồng ý đưa site ra internet.

Nhánh làm việc: `cloudflare-free`. Bản giao diện trước khi chuyển nằm ở commit gốc trên `master` và thư mục `_backup/pre-cloudflare`.

## Những gì không dùng

- Không VPS.
- Không MySQL, không máy chủ Express chạy thường trực.
- Không gói Cloudflare trả phí, không R2, KV, Durable Objects, Queues hay Workers AI.

## 0. Điều kiện

- Tài khoản Cloudflare Free.
- Kho Git riêng, không dùng chung với ứng dụng khác.
- Node.js đã cài trên Windows.
- Wrangler đã có trong dự án (`npm install`).

## 1. Chạy thử trên máy trước

Trong PowerShell, tại thư mục dự án:

```powershell
npm install
npm run cf:preview
```

Lệnh này build giao diện, tạo database local `pickleball-thuyloi-db` và mở http://127.0.0.1:8788.

`npm run dev` vẫn là Vite cũ, dữ liệu nằm trong trình duyệt. Bản Cloudflare phải chạy bằng Wrangler.

Tài khoản mẫu: `admin` / `demo123`. Mật khẩu trong database là hash PBKDF2, không phải chữ thường.

## 2. Đưa mã lên Git

Tạo kho trống trên GitHub Free hoặc Git host khác. Không đụng kho của ứng dụng khác.

```powershell
git remote add origin <địa-chỉ-kho-riêng>
git push -u origin cloudflare-free
```

Không push nếu chưa muốn công khai mã nguồn.

## 3. Đăng nhập Cloudflare

```powershell
npx wrangler login
```

## 4. Tạo database production

Chỉ chạy khi đã đồng ý:

```powershell
npx wrangler d1 create pickleball-thuyloi-db
```

Lệnh in ra `database_id`. Mở `wrangler.jsonc` và thay `00000000-0000-0000-0000-000000000001` bằng id đó. Không xóa database local.

Áp migration lên database vừa tạo:

```powershell
npx wrangler d1 migrations apply pickleball-thuyloi-db --remote
```

Lệnh này ghi dữ liệu mẫu và tài khoản `admin`. Không chạy lại nếu đã có kết quả thi đấu thật, vì migration đã áp thì Wrangler không chạy lại file cũ, nhưng một file migration mới không được viết đè dữ liệu.

## 5. Đổi mật khẩu trước khi public

```powershell
node scripts/hash-password.mjs "mat-khau-moi"
```

Cập nhật salt, hash và số vòng trong bảng `admins` của database production. Không đưa mật khẩu mới vào mã nguồn hay vào frontend.

## 6. Tạo project Pages

Trong Cloudflare Dashboard:

1. Workers & Pages → Create → Pages → Connect to Git.
2. Chọn đúng kho của Pickleball Thuỷ Lợi.
3. Framework preset: None, hoặc Vite nếu gợi ý đúng.
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Production branch: `cloudflare-free` cho đến khi gộp về nhánh chính.
7. Gắn D1 binding tên `DB` tới database `pickleball-thuyloi-db`.

Tên project gợi ý: `pickleball-thuyloi`. Nếu còn trống, địa chỉ sẽ là `https://pickleball-thuyloi.pages.dev`. Nếu tên đã có người dùng, Cloudflare sẽ yêu cầu tên khác. Không cần mua tên miền.

## 7. Sau khi deploy

- Mở trang chủ, lịch sử, một trang giải, rồi tải lại từng địa chỉ.
- Đăng nhập `admin`, sửa một tỷ số, mở tab khách và đợi tối đa 45 giây.
- Đăng xuất rồi thử lưu tỷ số: máy chủ phải từ chối.
- Khách không thấy ô nhập tỷ số.

## Dữ liệu đang nằm trong trình duyệt

Giải tạo trước đây nằm trong `localStorage` của trình duyệt, không nằm trong Git. Khi ban tổ chức đăng nhập trên đúng trình duyệt đó, site sẽ thêm những giải chưa có trên máy chủ. Giải đã có cùng mã thì giữ bản trên máy chủ. Tỷ số chỉ được lấy từ máy lên nếu trận trên máy chủ chưa có tỷ số.

Không có nút xóa database. Nút “Khôi phục dữ liệu mẫu” vẫn xóa các giải hiện có và thay bằng dữ liệu mẫu, sau khi xác nhận.
