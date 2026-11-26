# Tùy chỉnh báo cáo và ảnh QR thanh toán — Preview

Base: dcc037ed6ea9b79152bfe77486374cd53bead2b1. Nhánh feature/report-editor-payment-qr-preview. Không Production.

## Công cụ báo cáo

Tùy chỉnh trong xem trước: cỡ/nét/căn trái–giữa tiêu đề; cỡ/nét bảng; cỡ/nét tổng tiền; căn trái/giữa/phải từng cột; kéo đường chia cột bằng Pointer Events và thanh độ rộng dự phòng. Hai bảng chi tiết/thanh toán chỉnh độc lập. Cột kề bù độ rộng, tổng 100%, mỗi cột ít nhất 8%. Chuỗi dài xuống dòng, không thu nhỏ toàn bộ font theo trang. Thanh điều khiển có chiều cao tối đa, không phủ lên ảnh.

Thiết lập localStorage tg-report-style-portrait / landscape, không vào state/sync. Kiểm tra dữ liệu thiết lập khi đọc; có Khôi phục mặc định cho riêng khổ hiện tại. Chỉnh sửa lưu và dựng lại cùng bộ kế hoạch PNG/PDF. Khóa xuất/chia sẻ khi ảnh đang cập nhật hoặc render thất bại; bỏ kết quả cũ nếu người dùng chỉnh tiếp hoặc đóng ảnh. Ảnh đính kèm nhắc nợ được cập nhật cùng blob khi tùy chỉnh từ xem trước của nó. Excel giữ số liệu/xuất bảng hiện hữu, không áp dụng đồ họa cỡ chữ của PNG/PDF.

## QR riêng thiết bị

Không tạo VietQR hoặc kết nối ngân hàng. Upload PNG/JPEG/WebP có sẵn, kiểm tra decode ảnh và kích thước. Tối đa 5 MB/ảnh, 20 ảnh và tổng 20 MB; thông báo khi không thể lưu. Đặt tên/đổi tên, xem trước, thay ảnh, xóa và chọn mặc định. URL xem trước được giải phóng khi đóng/cập nhật.

Database riêng tg-payment-qr-local, store images, hoàn toàn không mở schema/migration của kho công nợ để thêm QR. Không D1, không API hoặc thay đổi sync. Chỉ dùng trên cùng origin/trình duyệt/thiết bị; không tự đồng bộ sang S24 Ultra hoặc PC. Giao diện nói rõ cần thêm ảnh trên từng thiết bị. Không có cam kết QR được giữ khi người dùng xóa dữ liệu trình duyệt. Không thêm QR vào báo cáo, lời nhắn hoặc backup công nợ hiện tại.

## Chia sẻ

Không tích QR: gọi nguyên quy trình share cũ. Có QR: chọn trong danh sách dùng chung, mở quy trình gửi lần lượt bằng nút riêng của từng bước. Giữ hộp cảnh báo nhắc lặp và hộp tải file hiện hữu ở trên quy trình QR để không che thao tác xác nhận. Không giả định Zalo/SMS nhận text + nhiều file hoặc giữ thứ tự multi-file:

- Báo cáo: ảnh báo cáo → QR.
- Nhắc nợ: text → ảnh báo cáo nếu chọn → QR.

Mỗi bước là một thao tác share riêng. Không gửi tự động. Chỉ mở Tiếp theo sau khi Share Sheet trả kết quả thành công, hoặc người dùng chủ động dùng Sao chép/Tải ảnh dự phòng. Hủy/không hỗ trợ không tự chuyển bước, không fallback ngầm. Người dùng kiểm tra cùng cuộc trò chuyện và gửi trong Zalo/SMS. Chuyển nội dung cho Share Sheet không chứng minh khách đã nhận.

Ảnh QR tách riêng, report blob không đổi. Chọn QR/mở queue/đóng/hủy/chia sẻ riêng QR không tạo lịch sử nhắc nợ. Text/report share giữ runReminderExport hiện hữu: chỉ ghi export khi action trả true; sent vẫn chỉ là xác nhận thủ công cũ. Không sửa reminder-history.js, schema, số dư hoặc phân bổ thanh toán. Text nhắc nợ được kiểm tra lại trước khi chuyển cho Share Sheet.

## Kiểm thử

PASS report-editor-qr.cjs:

- Lưu/mở lại style, tách Dọc/Ngang, căn giữa/cỡ/nét, giới hạn cột; Pointer Events touch handler thực thi, tổng độ rộng 100%; kế hoạch PNG thật và PDF thật chứa căn giữa.
- QR CRUD, thay ảnh, mặc định, đóng/mở lại database, giới hạn MIME/dung lượng.
- Không tích QR gọi share gốc; tích QR mở queue chưa share; báo cáo+QR; text+QR; text+báo cáo+QR.
- Hủy không tiến bước, không ghi export; QR riêng không ghi history; fallback copy/download chỉ khi bấm.
- Ledger/history JSON không đổi trong test mới (native share/history action được spy để kiểm chứng điểm gọi).

PASS reminder-history.cjs: lịch sử cũ, cảnh báo lặp, hủy/lỗi không ghi, manual sent riêng biệt, kế toán không đổi.

PASS report-compact.cjs, report-standard.cjs (4 PNG/PDF thật từ nguồn 6 dòng, số liệu không đổi), report-hotfix02.cjs, report-quantity.cjs, overview-v11.cjs, preview-hotfix03.cjs, syntax/diff.

Bộ android-reminder-ui.cjs cũ dừng tại kiểm tra cloudToolsMenu đã bị xóa từ phiên bản nền trước; không coi là PASS và không sửa nghiệp vụ/menu ngoài phạm vi. Coverage lịch sử cũ được chạy riêng qua reminder-history.cjs và workflow mới qua report-editor-qr.cjs.

## Trình duyệt thực tế

Kiểm thử Chrome bằng trang fixture biệt lập, chặn toàn bộ kết nối mạng, không init/ghi ledger và không dữ liệu Production:

- Căn giữa tiêu đề, kéo cột trực tiếp bằng chuột; slider Ngày tăng 13 → 16,5 và Nội dung giảm tương ứng, ảnh cập nhật.
- Reload giữ căn giữa và độ rộng.
- Upload ảnh kiểm thử, tên và ảnh còn sau reload; quản lý và chọn QR hoạt động.
- Queue hiện đúng ảnh báo cáo → QR, chưa bấm share/không gửi ra ngoài.
- Iframe viewport 412×915 kiểm tra media query và giao diện màn hình hẹp. Chưa phải thiết bị Android vật lý.
- Sửa lỗi tương phản chữ kho QR ở giao diện tối, kiểm tra lại screenshot.

Ảnh minh họa dùng dữ liệu tổng hợp và ảnh upload ghi rõ KHÔNG DÙNG THANH TOÁN; không phải QR ngân hàng thật. Không có tài khoản thanh toán của khách trong ảnh kiểm thử.

## Giới hạn nghiệm thu

Chưa có S24 Ultra/Zalo/SMS thật trong môi trường. Cần thử kéo bằng ngón tay và native Share Sheet/dán ảnh trên thiết bị. Không tuyên bố đã gửi thành công qua Zalo/SMS hoặc chứng minh tính năng nhận file của ứng dụng đó. Quy trình từng bước luôn có dự phòng để tránh phụ thuộc hỗ trợ text/multi-file.

Chờ chủ xưởng nghiệm thu trước Production. Không nhập fixture vào Production, không thay IndexedDB ledger/D1/công thức/sync hoặc logic nhắc nợ cũ.
