# Kế hoạch chuyển Pickleball Thuỷ Lợi sang Cloudflare Free

Ngày kiểm tra: 16/10/2026. Chỉ làm trong thư mục dự án này. Không đụng ứng dụng khác, không triển khai production.

## Hiện trạng đã đọc từ mã nguồn

Frontend là React 19, Vite 8, TypeScript và Tailwind 4. Không phải Next.js hay Vue.

Không có backend. Không có Express, PHP, MySQL, PostgreSQL, Firebase hay file JSON trên máy chủ. File `.env.example` chỉ là ghi chú cho một hướng MySQL sau này và ứng dụng không đọc file đó.

Dữ liệu đang nằm trong trình duyệt, khóa `localStorage` `pickleball-results-store-v1`, phiên bản 5. Dữ liệu mẫu trong Git nằm ở `src/data/seed.ts`: 3 giải, 32 vận động viên, 16 đội, 4 bảng, 24 trận.

Đăng nhập ban tổ chức hiện kiểm tra ngay trên trình duyệt (`admin` / `demo123`) và chỉ ghi cờ vào `sessionStorage`. Khách không có tài khoản.

Frontend không gọi API. Không có WebSocket, socket.io, cron, kết nối TCP, ghi file lên ổ đĩa, tải ảnh lên máy chủ, Excel, PDF hay QR. Ảnh trang chủ là file tĩnh `public/trang-chu.jpg`.

Bảng xếp hạng được tính trên trình duyệt từ tỷ số, không lưu thành bảng riêng. Thành phần nhánh đấu `Bracket` có trong mã nhưng chưa gắn vào trang nào. Kiểu dữ liệu trận vẫn có vòng bảng và vòng loại trực tiếp.

## Tương thích với Cloudflare Workers

Giữ React + Vite. Build ra `dist`.

Những phần không chạy được trên Workers nếu viết theo kiểu máy chủ thường: MySQL driver, Express lắng nghe cổng, ghi file local, WebSocket giữ kết nối lâu. Dự án hiện không dùng các phần đó.

Phần cần thêm, và đã thêm trên nhánh `cloudflare-free`:

- Cloudflare Pages cho giao diện.
- Pages Functions trong `functions/` cho API.
- D1, database SQLite tên `pickleball-thuyloi-db`, binding `DB`.
- Đăng nhập bằng cookie `HttpOnly`, mật khẩu lưu dạng PBKDF2-SHA256, 10000 vòng. Đo trên máy này khoảng 2 ms, nằm trong hạn mức CPU của gói miễn phí.

`npm run dev` vẫn dùng dữ liệu trong trình duyệt. Bản Cloudflare chỉ chạy khi có `/api/revision`.

## Cơ sở dữ liệu

Không có MySQL để chuyển. Schema D1 nằm ở `migrations/0001_init.sql`. `migrations/0002_seed.sql` không còn nhập giải mẫu hay tài khoản quản trị. Dữ liệu mẫu cho máy local, nếu cần, nằm ở `scripts/local-seed.sql`.

Bảng: `tournaments`, `players`, `teams`, `team_players`, `groups`, `group_teams`, `matches`, `match_sets`, `admins`, `sessions`, `audit_log`, `meta`.

Bảng xếp hạng không lưu riêng vì luật xếp hạng vẫn tính từ tỷ số như hiện tại. Vòng loại trực tiếp được giữ bằng `stage` và JSON của hai vị trí trận.

Mã giải, tên tiếng Việt và tỷ số mẫu được giữ nguyên. Đếm sau khi nạp local: 3 giải, 32 vận động viên, 16 đội, 4 bảng, 24 trận, 13 set có điểm, 1 tài khoản, revision 1.

Script `scripts/export-seed-sql.mjs` tạo lại file seed từ `src/data/seed.ts` nếu dữ liệu mẫu đổi. Không chạy script này lên database thật.

Giải đang nằm trong `localStorage` của trình duyệt không có trong Git. Khi ban tổ chức đăng nhập trên đúng trình duyệt đó, API `/api/admin/import` thêm giải chưa có trên máy chủ. Không xóa giải đã có. Trận trên máy chủ chưa có tỷ số thì có thể nhận tỷ số đang lưu trên máy.

## API

- `GET /api/revision`: một dòng, khách dùng để hỏi có dữ liệu mới không.
- `GET /api/state?v=`: toàn bộ giải, chỉ khi revision đổi. Bản đúng revision được cache 5 phút.
- `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/session`.
- `POST /api/admin/commit`: ghi dữ liệu, bắt buộc cookie. Kiểm tra `expectedRevision`. Lệch thì trả 409, không ghi đè.
- `POST /api/admin/import`: chỉ ban tổ chức.
- `GET /api/admin/audit`: 20 dòng lịch sử mới nhất.

Mọi câu SQL dùng tham số gắn sẵn. Khách gọi API sửa sẽ nhận 401.

## 40 người xem trong 8 giờ

Khách hỏi revision mỗi 45 giây, chỉ khi tab đang hiện. Ước tính trần:

- 40 × (8 × 3600 / 45) = 25.600 request revision.
- Mỗi request đọc 1 dòng D1.
- Tải toàn bộ dữ liệu lúc mở trang và khi có tỷ số mới. Nếu có khoảng 30 lần sửa, khoảng 1.200 lần đọc khối dữ liệu.

Gói Workers miễn phí khoảng 100.000 request/ngày. D1 miễn phí khoảng 5 triệu lượt đọc dòng và 100.000 lượt ghi mỗi ngày. Mức trên nằm trong hạn miễn phí của một ngày thi đấu.

Không bật dịch vụ trả phí. Ảnh tĩnh do Pages phục vụ, không tính như request Function. Không dùng tên miền trả phí.

Nếu nhiều người để tab mở cả ngày nhiều hôm, request có thể chạm trần 100.000. Khi đó Cloudflare tính phí hoặc chặn thêm request. Chưa bật gì để phát sinh phí.

## Rủi ro

- Chưa deploy. `database_id` trong `wrangler.jsonc` chỉ là id giả cho máy local.
- Bản Cloudflare không tạo tài khoản `admin` / `demo123`. Tài khoản đầu tiên tạo bằng `scripts/create-admin.mjs`, mật khẩu không vào Git.
- Nút khôi phục dữ liệu mẫu chỉ còn ở chế độ lưu trên trình duyệt. Máy chủ từ chối thao tác này.
- Hai người sửa cùng lúc: người ghi sau nếu giữ revision cũ sẽ bị từ chối và phải tải lại.
- Ghi admin thay toàn bộ các dòng vì dữ liệu một giải nội bộ nhỏ. Khách không tải lại toàn bộ ở mỗi lần hỏi revision.
- Quy tắc `_redirects /* /index.html` bị Wrangler coi là vòng lặp nên không dùng. Các trang SPA có Function riêng trả về `index.html`.

## File chính đã thêm hoặc sửa

Thêm: `wrangler.jsonc`, `migrations/`, `functions/`, `public` không còn file redirect, `scripts/export-seed-sql.mjs`, `scripts/hash-password.mjs`, `scripts/cf-smoke.mjs`, `.dev.vars.example`, `CLOUDFLARE_DEPLOY.md`, file này.

Sửa: `package.json`, `.gitignore`, `README.md`, `src/lib/auth.ts`, `src/lib/api.ts`, `src/store/StoreProvider.tsx`, `src/store/context.ts`, `src/pages/LoginPage.tsx`, `src/pages/AdminPage.tsx`, `src/pages/HomePage.tsx`.

Không xóa `src/data/seed.ts`, logic xếp hạng, logic ghép cặp, ảnh hay giao diện nhập tỷ số.

## Kiểm thử local đã chạy

- `npx tsc -b` và `npx tsc -p functions/tsconfig.json` sạch.
- `npx oxlint` sạch.
- Migration local áp được. Số dòng khớp dữ liệu mẫu.
- `wrangler pages dev` tại http://127.0.0.1:8788.
- Khách bị từ chối khi ghi. Sai mật khẩu bị từ chối. Đăng nhập đúng thì ghi được tỷ số. Revision cũ trả 409. Sau đăng xuất không ghi được.
- Trang chủ, lịch sử, trang giải mở trực tiếp. Đăng nhập trên giao diện vào được lịch sử và ô tỷ số. Đăng xuất trả 200.
- Tỷ số mẫu 6–7 của trận Hà Nội đã được trả lại sau khi thử.
- Chưa deploy, chưa tạo database trên tài khoản Cloudflare.
