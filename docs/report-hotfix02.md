# REPORT HOTFIX 02 — Preview

Base: report quantity hotfix 59aa1381f7de6150b07808a845818aff50d8f69a. Preview only; no production update.

## Changes

- Bảng thống kê bỏ Số đơn hàng ở II. Tổng kết trong mọi định dạng; giữ TỔNG GIÁ TRỊ ĐƠN HÀNG. Tổng kết đối chiếu công nợ không đổi.
- Cảnh báo chuyển từ cột Khối lượng/ĐVT hẹp sang phần nội dung trong ngoặc vuông: [Cần kiểm tra: Thiếu ĐVT]. Giá trị khối lượng, ĐVT, đơn giá, thành tiền và công thức không đổi.
- Thêm Sao chép ở hộp thao tác xuất và sau nút Tải ảnh trong xem trước PNG. Hai nút Chia sẻ Zalo/SMS và Tải ảnh giữ nguyên thứ tự, vị trí trước đó và toàn bộ thân hàm xử lý.
- Sao chép dùng ClipboardItem image/png và navigator.clipboard.write. Trong xem trước, dùng cùng blob đang xem/tải/chia sẻ. Từ hộp xuất, dùng cùng reportPNG và cache ảnh; bắt đầu ghi clipboard ngay trong thao tác nhấn, truyền promise PNG để giữ quyền tương tác người dùng.
- Chỉ hiện thành công sau await clipboard.write. Trình duyệt không hỗ trợ, không có HTTPS, bị từ chối quyền hoặc ảnh cũ có thông báo riêng; không gọi Chia sẻ hay tải thay thế. Sao chép không ghi dữ liệu, lịch sử nhắc nợ hoặc đồng bộ.

## Validation

PASS report-hotfix02.cjs: bỏ số đơn, giữ tổng tiền; cảnh báo ở cột nội dung; thứ tự nút gốc; cùng blob PNG; pending/success/denied/unsupported/insecure/stale; không share/download fallback; dispatch share/download và hủy share; state không đổi. Clipboard được giả lập trong kiểm thử, chưa chứng minh dán Zalo trên thiết bị thật.

PASS report-quantity.cjs: đối chiếu 5 dòng trong bản sao lưu gốc; mô hình xem trước/Excel; render PNG thật và PDF thật; số liệu không đổi; state không đổi.

PASS overview-v11.cjs, preview-hotfix03.cjs, kiểm tra cú pháp và git diff --check.

Cần nghiệm thu S24 Ultra/PC: mở Preview, chọn Bảng thống kê → Xem trước ảnh PNG → Sao chép → dán vào Zalo/ứng dụng hỗ trợ. Xác nhận đủ toàn bộ ảnh, không còn dòng Số đơn hàng, cảnh báo dễ đọc; thử Chia sẻ/Tải ảnh/PDF/Excel như trước. Trình duyệt không hỗ trợ phải báo rõ, không tự mở Chia sẻ. Giới hạn hỗ trợ dán phụ thuộc trình duyệt và ứng dụng nhận.

Không migration, không chỉnh IndexedDB/D1/API/sync/công nợ/thanh toán. Chờ nghiệm thu trước Production.
