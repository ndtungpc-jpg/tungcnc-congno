# v2.1.9 – Chốt Tổng quan

## Thay đổi
- Bốn ô đúng thứ tự: Tổng phải thu / Khách cần thu nợ / Đã thu tháng này / Nợ nhà cung cấp. Android dùng lưới 2 cột; không có ô Quá hạn hay số NCC.
- Khách cần thu nợ: đếm từng hồ sơ khách có tổng số dư lớn hơn 0, không đếm số đơn và không gộp khách trùng tên.
- Giữ nguyên phép tính tổng phải thu/phải trả và lịch sử thanh toán hiện có. Không ghi dữ liệu khi tính hoặc điều hướng.
- Hai ô thu nợ dùng danh sách khách còn nợ hiện có. Đã thu tháng này dùng lịch sử thẻ, chỉ thu khách tháng hiện tại, bỏ giao dịch legacy đại diện số dư đầu kỳ. Ô NCC mở danh sách công nợ NCC.
- Tăng phiên bản cache r3, giữ schema và khóa lưu trữ hiện có.

## Kiểm thử ngày 21/11/2026
Đạt: bốn ô/thứ tự/đếm khách duy nhất/tháng hiện tại/loại chi NCC và số dư đầu kỳ/điều hướng; kiểm tra dữ liệu IndexedDB không đổi trước sau render/điều hướng. Cú pháp toàn bộ JS đạt.
Đạt hồi quy: 8 ca operations, 4 ca session, 9 ca inbox, 9 ca báo giá, luồng khách/đơn/thu nhiều đợt/sao lưu/reload và chi tiết đa hạng mục/đơn vị/vật liệu/giá/Excel/PNG. Phục hồi chỉ bổ sung, chặn xung đột và nhập trùng; báo cáo không ghi dữ liệu.
Chưa kiểm thử: Android thật (khóa màn hình/chuyển app/cài và cập nhật PWA/offline/chia sẻ và xuất file/phục hồi phiên), dữ liệu lịch sử thật từ phiên bản đầu tiên. Kiểm thử trình duyệt máy tính không thay thế Android thật.
Không truy cập/sửa dữ liệu công nợ website chính thức. Không thể xác nhận đối soát dữ liệu thật chỉ từ repository.

## Điều kiện phát hành
Chủ dự án đã cho phép phát hành nhưng yêu cầu tất cả kiểm thử đạt. Chưa merge khi các kiểm thử bắt buộc Android chưa được xác minh. Không có lỗi nghiêm trọng quan sát được trong các ca đã chạy; không đồng nghĩa đã loại trừ mọi rủi ro. PR giữ draft để ghi nhận giới hạn; không auto-merge.
