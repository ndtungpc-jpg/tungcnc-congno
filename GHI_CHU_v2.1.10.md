# v2.1.10 – Ô tiền và thanh toán quá khứ

Nền: main c20d6abb01a4ee817a09991cd2cffa2a3c919250 (v2.1.9).

## Thay đổi
- Tất cả ô tiền của đơn nhanh/cũ/chi tiết, đơn giá, giảm giá, vận chuyển, phiếu và dòng vật tư, thu/chi đơn/phân bổ và NCC có trình nhập VND. Ký hiệu ₫ nằm trong chính ô văn bản ngay sau số. Số lượng, kích thước, VAT phần trăm và điện thoại giữ nguyên.
- Ô hiển thị không mang tên trường lưu; ô ẩn mang giá trị số thô cho FormData và hàm tính cũ. Giá trị lưu vẫn là số. Đơn giá phần lẻ dùng dấu phẩy; không làm tròn giá trị cũ khi mở. Chặn số âm, ký tự không hợp lệ, số quá giới hạn chính xác của JavaScript và số lẻ ở trường bắt buộc nguyên.
- Bảo toàn vị trí lựa chọn theo số chữ số trước con trỏ khi thêm/xóa/chỉnh giữa chuỗi; xóa qua dấu nhóm hoặc ký hiệu cuối xóa chữ số liền kề. Hỗ trợ composition events; bàn phím Android chưa thử trên máy thật.
- Giao dịch thủ công mới lưu enteredAt (ISO thời điểm nhập), date vẫn là ngày thu/chi thực tế do người dùng chọn, mặc định hôm nay. Sửa giao dịch giữ enteredAt đã có; giao dịch cũ thiếu enteredAt không được tự gán ngày lịch sử giả.
- Thu tháng hiện tại tiếp tục dựa date và chỉ giao dịch thu khách, không dựa enteredAt; khoản cũ vẫn giảm công nợ hiện tại. Lịch sử thu/chi hiển thị thời điểm nhập riêng hoặc báo chưa có thời điểm gốc.
- Thu nhiều đơn/chi NCC có kiểm tra ngày và xác nhận giao dịch nghi trùng trước thêm. Không tạo giao dịch khi mở form hoặc khôi phục bản nháp.
- Không đổi tên DB, object store, version/schema IndexedDB hay khóa localStorage. Không migration/reset, không đổi ngày/số tiền/bản ghi hiện có.

## Kiểm thử kỹ thuật
Đạt 5 nhóm DOM: số lớn và FormData thô; phân nhóm và con trỏ giữa chuỗi; xóa cạnh dấu phân cách; số âm/không hợp lệ/quá lớn; kiểm kê toàn bộ trường tiền và không chọn trường phi tiền.
Đạt 4 nhóm thanh toán: thu quá khứ giảm nợ không tăng thu tháng này; chặn nghi trùng khi hủy xác nhận và sửa giữ thời điểm nhập; thu nhiều đợt và chi NCC quá khứ; reload giữ đúng số dư/ngày và bản ghi cũ.
Đạt hồi quy: 8 operations, 4 session, 4 dashboard, 9 inbox, 9 báo giá, luồng khách/đơn/thu nhiều đợt/backup/reload, đa hạng mục/đa kích thước/vật liệu/giá/Excel/PNG. Toàn bộ JS kiểm tra cú pháp đạt.
Trình duyệt Chrome thật: nhập 12500000 hiển thị 12.500.000 ₫; chèn 9 rồi 8 giữa chuỗi giữ vị trí sửa, hiển thị 1.298.500.000 ₫; reload khôi phục đúng bản nháp. Nợ thử cũ vẫn 1.200.000, đã thu tháng vẫn 300.000.
Dữ liệu giả: trước phải thu 3.000.000 / phải trả 1.000.000. Thu quá khứ 500.000 → sửa còn 400.000 + thu tháng này 100.000, còn phải thu 2.500.000. Chi NCC cũ 200.000 còn phải trả 800.000. Đơn/đối tác và giao dịch gốc giữ nguyên.

## Chưa kiểm thử / giới hạn
Android/Samsung thật, bàn phím IME thực tế, khóa màn hình/chuyển app/cập nhật PWA/offline và file://. Dữ liệu lịch sử thật trên điện thoại chủ xưởng chưa truy cập hoặc đối soát. Không khẳng định tương thích tuyệt đối khi chưa có bản sao lịch sử đầy đủ. Không dùng dữ liệu thật cho thử nghiệm.
Thời điểm nhập mới được ghi khi người dùng lưu giao dịch thủ công; không suy diễn enteredAt cho giao dịch lịch sử nhập từ backup/Excel. Dữ liệu nhập Excel giữ quy trình xem trước/xác nhận và nhật ký nhập hiện có.
