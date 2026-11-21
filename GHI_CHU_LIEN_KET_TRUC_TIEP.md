# Liên kết Báo Giá Nhanh → Công Nợ – nhánh thử nghiệm

Nền main: v2.1.11, f2c8163620682ce8d4161e1f54d5b936e28dee09.
Không phát hành production trong khi chưa đủ bằng chứng Chrome hai origin/Android và cấu hình domain nguồn chính thức.

## Thiết kế
- Nút Chuyển sang Công Nợ mở URL cố định của Công Nợ Preview. Không query/fragment chứa khách hàng hoặc nội dung báo giá; không API/trung gian lưu báo giá.
- postMessage chỉ dùng exact targetOrigin. Receiver kiểm tra event.origin theo allowlist HTTPS, event.source === window.opener, nonce nhận và nonce gửi 192 bit; không wildcard/null/file. Sender chỉ nhận từ đúng popup và exact origin đích với cả hai nonce.
- Giới hạn gói 2 MB, xác minh SHA-256 mã chuyển và toàn bộ schema/tổng tiền/hạng mục trước xem trước. Kênh kết nối không đồng nghĩa quyền ghi.
- Xem trước dùng File trong bộ nhớ làm adapter, không tải JSON và không ghi hộp thư/DB công nợ. Chỉ nút xác nhận tạo đơn mới ghi atomic và snapshot phục hồi hiện có. Không tạo khoản thu.
- Tìm đề xuất theo tên hoặc SĐT, hiển thị tên/SĐT và giữ lựa chọn tạo mới mặc định; không tự gộp, không ghi đè thông tin khách.
- Mã chuyển tgq-v1-SHA256 ổn định theo phiên bản nội dung (loại trừ thời gian xuất). Giữ mã báo giá khi sửa phiên bản. Bản nguồn mới yêu cầu nhập mã báo giá để bảo đảm chặn tạo đơn thứ hai sau khi sửa báo giá đã nhập.
- Kiểm tra ID chuyển, mã báo giá và dấu vân tay; mã báo giá đã nhập bị chặn dù sửa nội dung hay chọn khách khác. Không tự cập nhật đơn đã có; người dùng mở đơn cũ để đối chiếu.
- Sender không lưu biên nhận khi mới kết nối/xem trước/timeout/hủy/lỗi. Chỉ phản hồi saved dựa committed order sau lưu thành công mới được lưu biên nhận. Mất kênh phản hồi không đồng nghĩa đơn chưa lưu; gửi lại sẽ được báo đã tồn tại.
- JSON dự phòng giữ luồng offline/file://. file:// không được tự nâng thành nguồn tin cậy; phải triển khai HTML nguồn lên origin HTTPS đã cho phép.

## Trạng thái kiểm thử ban đầu
Đạt: exporter thực từ HTML nguồn cho đủ vật liệu/kích thước/giá/giảm giá/vận chuyển/VAT; ID ổn định và phiên bản sửa khác; giả mạo origin/window/nonce; payload sửa; xem trước/hủy không ghi; chọn khách cũ/mới; trùng ID/mã sau sửa; lỗi ghi không trả saved; URL cố định không dữ liệu; biên nhận chỉ sau phản hồi lưu; timeout/file fallback; hồi quy công nợ/nhóm thanh toán/JSON.
Chrome hai origin và Android/PWA chưa được kết luận Đạt ở giai đoạn này. Cần ghi nhận kết quả thử nghiệm thực trong báo cáo bàn giao.

## Chuẩn bị website Báo Giá Nhanh
Mã website độc lập nằm ở bao-gia/index.html (đủ mã nhúng). Đích thử nghiệm nằm trong bao-gia/direct-sender.js và bản nhúng; allowlist nằm trong direct-receiver.js. Khi chốt hostname nguồn chính thức, cập nhật exact origin hai phía và thử lại trước production. Không chấp nhận origin bất kỳ hoặc postMessage('*'). Không công khai dữ liệu kinh doanh trong repo.
