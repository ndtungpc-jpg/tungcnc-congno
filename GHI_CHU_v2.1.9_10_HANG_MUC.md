# v2.1.9 – 10 hạng mục vận hành, bản thử nghiệm r2

Nền: b9d59a0bf3c4255a3bfb41e4cc52412f21d7bf6f. Chỉ cập nhật test/v2.1.9-workshop. Không main/production.

1. Danh sách đơn: desktop rút gọn cột, điện thoại dùng thẻ chạm mở chi tiết; thao tác Thu/Chi, sửa, nhân bản, hủy và thùng rác nằm trong chi tiết.
2. PDF xuất trực tiếp A4, nền trắng/chữ đen, font Việt nhúng, không chữ ký. Bảng đối chiếu có 3 phần đúng dữ liệu gốc. Bảng dài chia trang và lặp tiêu đề bảng.
3. Hai báo cáo độc lập: đối chiếu gồm đơn/thanh toán/số dư; thống kê đơn chỉ gồm đơn và tổng giá trị. Xem trước và xuất PNG/XLSX/PDF.
4. Nhắc nợ: không ảnh hoặc đúng một PNG theo loại báo cáo được chọn. Xem trước, tên ảnh sửa được, chia sẻ chỉ khi bấm. Trình duyệt không hỗ trợ thì người dùng chọn tải ảnh/copy riêng, không tự gửi.
5. Nhật ký dạng thẻ, tên đối tượng thay ID trong danh sách; mã kỹ thuật ở chi tiết.
6. Thu/Chi dạng thẻ; giữ ngày, đối tác, số tiền, hình thức; chỉ ẩn đuôi UUID kỹ thuật ở phần hiển thị, không sửa nội dung lưu.
7. Dữ liệu tự kiểm tra chỉ đọc khi mở, có trạng thái/thời gian/số lượng/đối soát/bất thường và Kiểm tra lại.
8. Phiên UI và bản nháp có khóa riêng; khôi phục màn hình, đối tác, cuộn và biểu mẫu; không submit. Bản nháp cũ hơn dữ liệu bị chặn lưu, yêu cầu mở lại. Có xử lý giao diện tự về Tổng quan và giữ điều hướng Tổng quan có chủ đích.
9. Tất cả xuất file qua hộp sửa tên, thêm phần mở rộng và làm sạch ký tự. Khôi phục JSON/kỹ thuật chuyển sang thêm ID còn thiếu: giữ nguyên bản ghi cũ, trùng ID khác nội dung hoặc nghi trùng giao dịch/mã đơn chặn toàn bộ. Xem trước/SHA/đối chiếu/xác nhận, có bản trước phục hồi trong transaction. Quét nguồn chỉ đọc có giải thích; không quét ứng dụng/thiết bị khác.
10. Thêm → Giao diện bằng icon bảng màu, mở thẳng 5 lựa chọn, đánh dấu chủ đề hiện tại; Đen trắng nền đen/chữ trắng.

## Kiểm thử đã thực hiện

- Kiểm thử tự động: báo cáo phân biệt, PNG canvas, PDF Unicode; PDF 101 đơn thành 6 trang A4 có dòng cuối và tổng; tên file; phục hồi bổ sung, trùng/xung đột, nguyên tử; kiểm tra chỉ đọc; 0/1 ảnh chia sẻ; session fallback/điều hướng chủ động/bản nháp lỗi thời. Hồi quy đơn nhanh, đơn chi tiết, báo giá JSON/hộp thư, thanh toán nhiều lần và giữ bản ghi cũ.
- Chrome máy tính: nâng mã trên origin dữ liệu giả đã có, vẫn 1 khách/1 đơn/1 thu; 1.500.000 – 300.000 = 1.200.000. Mở Dữ liệu tự kiểm tra đạt. Tạo bản nháp 987.654, reload khôi phục đúng nội dung/khách, không tăng công nợ. Tải PDF sau sửa tên, kiểm tra A4/tổng bằng parser.
- Khung 390×844 trên Chrome desktop: thẻ đơn 342×171 px, chạm thao tác, hai báo cáo và Giao diện mở trực tiếp. Đây không phải Android thật.

## Giới hạn bắt buộc công bố

Chưa có Android/Samsung thật: chưa xác minh chuyển app, khóa màn hình, OS hủy PWA, bảng chia sẻ Zalo/SMS hoặc lưu file của Android. Không đánh dấu các mục này đạt. PWA/offline kiểm thử mô phỏng cache và HTML được đóng gói độc lập; file:// thật chưa được kiểm thử. Phiên UI có thể không lưu khi localStorage bị chặn/quota; ứng dụng báo lỗi, không tự xóa kho cũ. Các file đang chọn và tác vụ xuất đang chờ không tự tiếp tục sau OS đóng, người dùng chọn lại để tránh ghi/gửi ngoài ý muốn.

Phục hồi không còn thay kho hoặc quay lui bằng cách xóa dữ liệu phát sinh. Bản sao thiếu một bản ghi không được hiểu là yêu cầu xóa bản ghi hiện có. Xung đột cần đối chiếu riêng. Hộp thư báo giá được sao lưu kèm nhưng phục hồi riêng qua Hộp thư, không tự ghi localStorage hộp thư.

DB/schema/khóa lưu nghiệp vụ giữ nguyên. Chỉ thêm khóa phiên giao diện và tệp cache, không migration/reset. Không sử dụng dữ liệu thật; chưa có sao lưu phiên bản đầu để kết luận tương thích lịch sử đầy đủ. JSON và bản nháp cục bộ không mã hóa; chưa có đăng nhập/phân quyền/đồng bộ nhiều thiết bị.
