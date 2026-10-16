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
npm run cf:migrate
npm run cf:preview
```

`cf:migrate` chỉ áp schema vào D1 local. `cf:preview` build giao diện và mở http://127.0.0.1:8788.

Muốn thêm ba giải mẫu trên máy, khi database local còn trống giải:

```powershell
npm run cf:seed
```

Lệnh này từ chối nếu local đã có giải, và không nhận `--remote`. Không chạy lệnh này cho production.

`npm run dev` vẫn là Vite, dữ liệu nằm trong trình duyệt, tài khoản mẫu `admin` / `demo123`. Bản Cloudflare không tạo tài khoản đó. Tài khoản local của Wrangler tạo bằng `node scripts/create-admin.mjs`, rồi áp file `.admin-bootstrap.sql` với `--local`.

## 2. Đưa mã lên Git

Kho đã có: https://github.com/kingofpsa11/pickbleball. Chỉ push nhánh `cloudflare-free` sau khi các sửa migration đã được commit. Không đụng kho của ứng dụng khác.

```powershell
git push origin cloudflare-free
```

## 3. Đăng nhập Cloudflare

Wrangler trên máy này đã đăng nhập. Nếu hết phiên:

```powershell
npx wrangler login
```

## 4. Áp schema lên database production

Database `pickleball-thuyloi-db` đã được tạo và id đã nằm trong `wrangler.jsonc`. Không tạo database mới và không xóa database local.

Chỉ chạy khi đã đồng ý, vì database production hiện chưa có bảng:

```powershell
npx wrangler d1 migrations apply pickleball-thuyloi-db --remote
```

`0001_init.sql` tạo bảng, khóa ngoại, index và revision `0`. `0002_seed.sql` không nhập giải mẫu và không tạo tài khoản. Không chạy lại migration sau khi đã có kết quả thi đấu thật.

## 5. Tạo tài khoản quản trị đầu tiên

Trong thư mục dự án:

```powershell
node scripts/create-admin.mjs
```

Gõ tên đăng nhập và mật khẩu ngay trên màn hình. Mật khẩu không hiện ra, cần ít nhất 12 ký tự, có cả chữ và số. Không truyền mật khẩu qua tham số lệnh. Script ghi `.admin-bootstrap.sql`; Git bỏ qua file này.

Sau khi schema production đã được áp:

```powershell
npx wrangler d1 execute pickleball-thuyloi-db --remote --file .admin-bootstrap.sql
Remove-Item .admin-bootstrap.sql
```

Không có trang web nào để tự tạo tài khoản quản trị. Hash là PBKDF2-SHA256, 10000 vòng, cùng cách đăng nhập của server và nằm trong hạn CPU của gói miễn phí.

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
- Đăng nhập bằng tài khoản vừa tạo, sửa một tỷ số, mở tab khách và đợi tối đa 45 giây.
- Đăng xuất rồi thử lưu tỷ số: máy chủ phải từ chối.
- Khách không thấy ô nhập tỷ số.

## Dữ liệu đang nằm trong trình duyệt

Giải tạo trước đây nằm trong `localStorage` của trình duyệt, không nằm trong Git. Khi ban tổ chức đăng nhập trên đúng trình duyệt đó, site sẽ thêm những giải chưa có trên máy chủ. Giải đã có cùng mã thì giữ bản trên máy chủ. Tỷ số chỉ được lấy từ máy lên nếu trận trên máy chủ chưa có tỷ số.

Không có nút xóa database. Trên bản Cloudflare không còn nút “Khôi phục dữ liệu mẫu”, và máy chủ từ chối thao tác đó. Xóa một giải vẫn chỉ xảy ra khi ban tổ chức bấm “Xóa giải” và xác nhận.
