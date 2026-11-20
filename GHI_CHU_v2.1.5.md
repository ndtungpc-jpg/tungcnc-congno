# v2.1.5 – Hộp thư báo giá (bản thử nghiệm)

Nền hợp nhất: v2.1.2 chính thức và các bản thử v2.1.3/v2.1.4 đã kiểm thử.

- Nhận tệp JSON do Báo Giá Nhanh xuất; không có đồng bộ tự động, máy chủ inbox hoặc đồng bộ thiết bị.
- Hộp thư riêng trong localStorage, không đổi schema/object store IndexedDB công nợ.
- Chuông đếm chờ, xem chi tiết, tiếp nhận có xác nhận, để sau, từ chối có thể đưa lại vào chờ.
- Chống trùng ID, mã báo giá và nội dung xuất lại; chỉ tạo đơn chi tiết sau xác nhận, giữ bản phục hồi trước nhập.
- Khóa cập nhật hộp thư bằng Web Locks trên HTTPS; không đặt lại hộp thư nếu đọc/ghi lỗi. Giữ tệp JSON gốc; có sao lưu/phục hồi riêng cho hộp thư.
- Bổ sung đơn nhanh 3 ô và nhân bản hạng mục sâu, không chia sẻ các dòng kích thước giữa bản gốc và bản sao.
- Tăng mục tiêu chạm tối thiểu 44 px, cỡ chữ nhập tối thiểu 16 px trên màn hình nhỏ.

## Kiểm thử trước triển khai thử

Đạt: thêm/trì hoãn/từ chối báo giá không ghi công nợ; tiếp nhận có phục hồi; chống trùng; trạng thái sau tải lại; lỗi quota và hộp thư hỏng giữ nguyên dữ liệu; cập nhật đồng thời có khóa; sao lưu/phục hồi hộp thư; đơn nhanh; thêm/xóa/nhân bản hạng mục và kích thước; kiểm thử hồi quy v2.1.2–v2.1.4.

Đối soát dữ liệu giả: trước và sau chỉ thêm báo giá vào hộp thư đều có 2 đối tác, 2 đơn, 1 giao dịch, tổng đã thu/chi 2.000.000, phải thu 3.000.000, phải trả 1.000.000. Sau xác nhận báo giá 4.301.000: 2 đối tác, 3 đơn, 1 giao dịch, phải thu 7.301.000, phải trả 1.000.000; bản ghi cũ không đổi.

Đạt mô phỏng Service Worker khi mất mạng và cập nhật bộ đệm. Chưa kiểm thử Android/Samsung thực tế, mất mạng trên thiết bị thật hoặc bản sao dữ liệu thực tế từ phiên bản đầu tiên. Dữ liệu cũ được kiểm thử bằng bộ giả schema 1/2; không kết luận tương thích hoàn toàn với bản sao chưa được cung cấp.

Không cập nhật main trước khi người dùng xác nhận.
