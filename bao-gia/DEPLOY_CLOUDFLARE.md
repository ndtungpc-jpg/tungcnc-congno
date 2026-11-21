# Triển khai Báo Giá Nhanh – Cloudflare Pages (chưa phát hành)

Mục tiêu hostname: https://baogia-tungcnc.pages.dev (chưa xác nhận đã tạo).

## Cấu hình Pages dự kiến
- Repository: ndtungpc-jpg/tungcnc-congno.
- Branch thử nghiệm: test/direct-quote-bridge.
- Project name: baogia-tungcnc (chỉ khi tên còn khả dụng).
- Framework preset: None; build command: (để trống); build output directory: bao-gia.
- Không tạo biến môi trường chứa dữ liệu khách hàng; không dùng dữ liệu kinh doanh thật trong thử nghiệm.
- Thư mục bao-gia chứa index.html và _headers; _headers được áp dụng khi bao-gia là output directory.

## Điều kiện trước khi phát hành
1. Xác minh website Báo Giá Nhanh độc lập hiển thị và chức năng báo giá hoạt động trên desktop/Android.
2. Bản gửi hiện trỏ tới https://test-direct-quote-bridge.tungcnc-congno.pages.dev; KHÔNG tự coi đây là production. Khi phát hành cần đổi DEBT_TARGET_ORIGIN ở bao-gia/direct-sender.js và bản nhúng trong bao-gia/index.html sang https://tungcnc-congno.pages.dev, đồng thời triển khai receiver đã được kiểm thử ở phía Công Nợ production.
3. Receiver đã cho phép exact origin https://baogia-tungcnc.pages.dev trên nhánh thử nghiệm; không dùng wildcard.
4. Kiểm thử trên Chrome Android khi popup/tab mới có window.opener, và trong PWA standalone; nếu opener bị tách, hiển thị hướng dẫn JSON dự phòng, không ghi nhận đã chuyển.
5. Kiểm thử nhập lại, báo giá đã sửa, khách trùng, timeout, mất phản hồi sau commit, rollback và kiểm tra dữ liệu cũ không bị thay đổi.
6. Sao lưu dữ liệu Công Nợ thực tế trước phát hành; chỉ merge/deploy production sau khi có xác nhận và kiểm thử đạt.

Lưu ý: postMessage truyền giữa các cửa sổ cùng phiên trên cùng thiết bị/trình duyệt, KHÔNG phải đồng bộ cloud đa thiết bị.
