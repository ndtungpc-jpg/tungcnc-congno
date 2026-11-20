# v2.1.8 — Nhắc nợ và đối chiếu, bản thử nghiệm

Nền hợp nhất: main dc9bf0d55d0dc3c5b620318ca0dc6da087e115c9. Chỉ cập nhật test/v2.1.8-workshop-pilot, không production.

- 10 mẫu / 3 nhóm, 6 xưng hô, mặc định Anh/chị. Lưu xưng hô chỉ khi người dùng bấm lưu; chặn số dư 0 và số dư đã thay đổi. Không tự gửi tin.
- Bảng đối chiếu và PNG/Excel/PDF gồm chi tiết đơn, từng giao dịch, tổng kết. Không sửa liên kết thanh toán. Đơn đã thanh toán đủ vẫn nằm trong đối soát. Dữ liệu bất thường được báo lỗi thay vì âm thầm bỏ qua.
- Bốn nút xuất/nhắc nợ theo lưới 2 cột; đóng góc phải. PNG chữ lớn, xuống dòng, tải file không tự chia sẻ.
- Giữ schema, DB, lịch sử và các bản sửa an toàn/khôi phục/Excel trước đây; thêm hai script vào cache PWA.

Kiểm thử tự động đạt: cú pháp/thứ tự script; 10×6 mẫu; số dư 0; lưu và lỗi lưu xưng hô; nội dung tự sửa; chống số dư cũ; PNG thực bằng canvas và Excel; nhập JSON/Excel/chống trùng; đơn chi tiết; nhà cung cấp; thanh toán; kiểm tra chỉ đọc; phục hồi có xem trước; tải lại; mô phỏng cache offline và HTML độc lập.

Đối soát dữ liệu giả trước/sau: 1 khách, 1 NCC, 2 đơn, 2 giao dịch; tổng đơn 6.000.000, thu 2.000.000, chi 250.000, phải thu 3.000.000, phải trả 750.000. Khớp sau kiểm tra và phục hồi riêng.
Ca bảng kê: 3 đơn hoạt động (có đơn đã trả đủ), 5 khoản thu (có thu chung phân bổ): tổng đơn 8.000.000, thu 2.400.000, còn 5.600.000. Không thay đổi dữ liệu khi xuất.

Chưa xác minh: dữ liệu thật hoặc sao lưu từ các phiên bản đầu (chưa được cung cấp); Android/Samsung thật, chia sẻ Zalo/SMS thật, cài/đóng/mở PWA thật; HTML file:// thật. Kiểm thử VM và cache mô phỏng không thay thế kiểm thử thiết bị. HTML độc lập không CDN, kho thử nghiệm riêng; file:// có thể hạn chế IndexedDB, tải/chia sẻ và không có Service Worker.

Không khẳng định an toàn tuyệt đối hoặc tương thích toàn bộ lịch sử. Chỉ sẵn sàng thử nghiệm dữ liệu giả; cần người dùng xác nhận riêng trước khi cập nhật main.
