# v2.1.8 — Giao diện tối giản và Quản lý dữ liệu (Work)

## Nguồn hợp nhất
Main trước cập nhật: v2.1.2/e0ebd56e8ca740c6bc6b9e77dd26691a165781c0. Nền thử nghiệm v2.1.8: 17bbdced5cadd5d3515eec9b61e42f077bca9b0c. ZIP đầu vào: TungGiang_CongNo_v2.1.8_QuanLyDuLieu_ToiGian.zip. Không tìm thấy nhánh v2.1.6 riêng; giữ Trung tâm thu nợ đã kiểm thử trong v2.1.7. Chỉ hợp nhất bố cục mới; giữ bản sửa chống mất dữ liệu của Work.

## Thay đổi
- Bốn mục điều hướng: Tổng quan, Khách hàng, Đơn hàng, Thêm.
- Tổng quan: bốn thống kê chạm được, báo giá chờ, khách quá hạn, Tạo đơn và Nhắc nợ. Không còn hàng nút dẫn trùng.
- Tạo đơn chọn nhanh 3 ô, chi tiết hoặc biểu mẫu cũ. Các chức năng NCC, thu/chi, báo giá, nhật ký, thùng rác và dữ liệu chuyển vào Thêm; không xóa nghiệp vụ.
- Quản lý dữ liệu có ba thao tác chính: kiểm tra toàn vẹn thật/chỉ đọc, sao lưu đầy đủ state, phục hồi. Excel/CSV/báo giá và công cụ kỹ thuật thu gọn vào nhóm riêng.
- Phục hồi JSON phải qua màn hình xem trước, SHA-256 và bảng đối chiếu; chưa ghi khi đọc file. Chỉ nút xác nhận phục hồi mới gọi đường ghi nguyên tử cũ và tạo bản trước nhập. File lỗi hoặc snapshot cũ bị chặn.
- Sửa công cụ phục hồi kỹ thuật: tạo File thực để tính SHA-256 và tái sử dụng xem trước; trước đây đối tượng giả chỉ có text() thiếu arrayBuffer().
- Chặn submit chồng trong các biểu mẫu cũ; cảnh báo giao dịch thu/chi đơn lẻ giống nhau theo đơn/ngày/số tiền/hình thức/nội dung. Vẫn cho người dùng xác nhận giao dịch thật trùng thông tin, không tự xóa lịch sử.
- Không đổi DBNAME, IndexedDB version/store/key hoặc schema; giữ core init/save/commit và logic số dư. Logo, manifest và CSP giữ nguyên. Cache tăng thành 2.1.8-minimal-r1.

## Kiểm thử
Đã đạt cú pháp tất cả JS, 9 bộ hồi quy nền, bộ UI/phục hồi mới và runtime HTML độc lập giả lập. Bao gồm Excel nén/mẫu/export, PNG, hạng mục/kích thước/vật liệu/tổng, nhập báo giá/chống trùng, thu/chi/NCC, lỗi ghi/khôi phục, dữ liệu schema1/2 giả.
Bộ mới xác nhận 4 tab và các đường dẫn vẫn có đủ nghiệp vụ; xem trước/hủy phục hồi không ghi; xác nhận giữ đủ partners/orders/payments và bản trước nhập; file lỗi, nguồn đã đổi, âm/vượt nợ, đơn không tồn tại, giao dịch giống nhau bị cảnh báo/chặn theo lựa chọn.
Đối soát dữ liệu giả nền: 1 khách, 1 NCC, 2 đơn/phiếu, 2 giao dịch; đã thu 2.000.000, đã trả 250.000, phải thu 3.000.000, phải trả 750.000. Bản ghi đối tác/đơn/thanh toán trước và sau nâng cấp/phục hồi khớp; metadata revision/audit/recovery tăng sau xác nhận đúng quy trình.
Không có bản sao thật từ phiên bản đầu: khả năng tương thích đầy đủ với dữ liệu lịch sử thật CHƯA KIỂM THỬ.

## HTML offline độc lập
Sinh từ đúng mã nguồn này bằng: python scripts/build-offline.py /duong-dan/TungGiang_CongNo_v2.1.8_OFFLINE.html
CSS/JS/icon được nhúng; không CDN, manifest hoặc mã gọi update server/Service Worker.
Kho thử riêng: tunggiang-offline-test-v218m; localStorage state tg-offline-test-v218m-state; hộp thư tg-offline-test-v218m-inbox. Không liệt kê/đọc kho v1 website; phục hồi kỹ thuật chỉ dùng kho/bản phục hồi của file thử.
Runtime giả lập file: đã thử tạo đơn, tải lại, JSON backup/preview/restore, sentinel DB website giữ nguyên, không gọi mạng. Không tương đương kiểm thử Android thật.
Trình duyệt cloud chặn file:// theo chính sách giao thức; CHƯA KIỂM THỬ mở file thực tế. Không chuyển sang cách khác để vượt hạn chế đó.
File:// trên Android có thể giới hạn IndexedDB/Web Locks/Web Crypto, Share Sheet, Clipboard, tải file hoặc xử lý file đính kèm; báo lỗi và giữ nguyên dữ liệu nếu không có khả năng cần thiết. Không có cài PWA/SW trong HTML độc lập. Đổi tên/vị trí file hoặc đổi browser có thể làm kho khác; phải sao lưu trước.

## Điều kiện đưa vào xưởng
Chỉ sẵn sàng thử có kiểm soát bằng dữ liệu giả. Chưa nghiệm thu Samsung/PWA thật, offline thật hoặc dữ liệu lịch sử thật. JSON không mã hóa, chưa có đăng nhập/phân quyền/đồng bộ. Không thay main/production trước xác nhận.
Cuối ngày xuất JSON tại Thêm → Quản lý dữ liệu → Sao lưu JSON; giữ thêm bản ở nơi an toàn. Hộp thư chờ có bản sao riêng. Định kỳ kiểm tra file chỉ đọc và phục hồi trên kho thử riêng.
