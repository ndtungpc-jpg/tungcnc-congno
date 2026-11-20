# v2.1.7 — Sao lưu, đối soát và an toàn dữ liệu

Nguồn: ZIP v2.1.7 phiên bản Library 3, SHA-256 3966ed52b7d8470413edd84375fb4f3c4aa6183b558ad140836960c0fa13468c.
Nền hợp nhất: commit v2.1.5 5ed73e60deee6b9450bee5e77723176968cd8ec5, đã bao gồm các bản sửa v2.1.3/v2.1.4. Main tại lúc kiểm tra: e0ebd56e8ca740c6bc6b9e77dd26691a165781c0 (v2.1.2).
Không tìm thấy nhánh/commit/báo cáo kiểm thử v2.1.6 trên GitHub; Trung tâm thu nợ được lấy từ ZIP v2.1.6/v2.1.7 và kiểm thử mới, không coi là bản đã được xác nhận.

## Chức năng hợp nhất
- Kiểm tra file sao lưu chỉ đọc, so sánh khách/NCC, đơn/phiếu nhập, thu/chi, tổng thu/trả và số dư.
- SHA-256 tính trên byte file nguyên gốc (kể cả BOM), hỗ trợ đối chiếu mã đã lưu. Hash không chứng minh nguồn gốc, độ đầy đủ, và không mã hóa dữ liệu.
- Chặn phục hồi file lỗi cấu trúc, schema chưa hỗ trợ, ID trùng, lỗi liên kết, số tiền/chi tiết sai, lịch sử hoặc bản phục hồi lồng bị lỗi. Kiểm tra không tự sửa bản sao.
- Phục hồi yêu cầu xác nhận rõ đây là thay kho hoạt động; lưu bản trước nhập trong cùng giao dịch. Không tự nhập, không tự hợp nhất hay cộng trùng. Giữ quy trình bổ sung chi tiết và Excel cũ.
- Trung tâm thu nợ tìm không dấu theo tên, SĐT, mã đơn, nội dung; bảng kê, ghi nhận thu và soạn nhắc nợ. Chỉ thao tác người dùng mới sao chép/chia sẻ, không gọi API Zalo/SMS.
- NCC nhập hàng tự do, số lượng × đơn giá hoặc tổng tiền; tổng tiền nhập trực tiếp được ưu tiên. Trường tùy chọn dùng cấu trúc đơn hiện có, không đổi IndexedDB.
- Nhân bản đơn khách mở bản nháp mới, giữ hạng mục/kích thước nhưng không mang theo ID đơn, lịch sử thu hoặc mã chống trùng báo giá gốc. Chỉ ghi khi bấm lưu.
- Giữ nguyên bộ sửa lỗi an toàn, Excel, PNG, kiểm tra toàn vẹn, nhập báo giá và hộp thư từ bản Work v2.1.5. Manifest/logo TG giữ nguyên; cache SW lên 2.1.7 và thêm script mới.
- Thêm CSP giới hạn nguồn cùng website, chặn nhúng trang, object, gửi form và quyền camera/micro/vị trí.

## Kết quả kiểm thử tự động
Đạt: cú pháp toàn bộ JavaScript; dữ liệu giả schema 1/2; nâng cấp không ghi kho; SHA byte gốc/BOM/mã đúng-sai; kiểm tra chỉ đọc; từ chối file lỗi/ID trùng/liên kết/số tiền/lịch sử/bản phục hồi hỏng; phục hồi có xác nhận và bản trước nhập; nhập lặp không tạo trùng; lỗi ghi giữ kho cũ; tải lại còn dữ liệu; NCC nhập/tính tiền/chi trả; tìm không dấu/soạn nhắc nợ không tự gửi.
Đạt hồi quy: đơn nhiều hạng mục/kích thước, 6 loại tính giá, sửa sau thanh toán, JSON Báo Giá Nhanh/chống trùng/ghép khách, hộp thư để sau/từ chối/tiếp nhận, XLSX nén và xuất mẫu/Excel, PNG Khối lượng/ĐVT, phục hồi và kiểm tra toàn vẹn chỉ đọc.
Đạt mô phỏng SW: precache script mới, điều hướng/đọc script khi offline, kích hoạt chỉ xóa cache tài nguyên cũ.

Đối soát giả trước/sau kiểm tra và phục hồi: 1 khách, 1 NCC, 1 đơn khách, 1 phiếu nhập, 1 thu và 1 chi; đã thu 2.000.000, đã trả 250.000; phải thu 3.000.000 và phải trả 750.000. Đơn, đối tác và giao dịch giữ nguyên từng bản ghi; revision/nhật ký/bản phục hồi tăng đúng sau xác nhận phục hồi.

## Giới hạn
Chưa có bản sao dữ liệu thật từ phiên bản đầu; chỉ kiểm thử cấu trúc cũ bằng dữ liệu giả. Chưa kiểm thử Android/Samsung thật, cài PWA thật, ngoại tuyến thật hoặc cập nhật PWA đã cài. Chưa đồng bộ nhiều thiết bị. Kho công nợ và hộp thư có bản sao lưu riêng. Không đổi main khi chưa được chấp thuận.

## Lỗi phát hiện trên trình duyệt và đã sửa
- Biểu mẫu NCC bị hàm cũ trong inline script ghi đè khi tải trang: bỏ định nghĩa cũ dư thừa, chỉ còn một bộ xử lý mới. Bổ sung kiểm tra thứ tự script theo HTML thực tế.
- Cảnh báo kho rỗng còn hiển thị sau khi khôi phục thành công: chỉ ẩn thông báo rỗng khi đã có dữ liệu; giữ các cảnh báo lỗi lưu khác.
