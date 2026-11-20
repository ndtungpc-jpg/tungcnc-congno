# v2.1.4 – Kiểm tra toàn vẹn dữ liệu (bản thử nghiệm)

Hợp nhất trên bản thử v2.1.3 đã kiểm thử; website chính trước thay đổi vẫn là v2.1.2.

- Thêm integrity.js: kiểm tra chỉ đọc, xuất JSON đối soát; không sửa, xóa hoặc chuyển đổi dữ liệu.
- Kiểm tra ID trùng/thiếu, liên kết, số tiền/thu vượt đơn, kích thước/khối lượng/đơn giá và tổng giảm giá–vận chuyển–VAT.
- Tổng công nợ loại đơn hủy đúng quy tắc cũ; báo tổng chưa xác định khi dữ liệu cấu trúc/số tiền không hợp lệ.
- Đọc kho bằng transaction readonly, có thể chẩn đoán khi khởi tạo thông thường không thành công.
- Không đổi DBNAME, phiên bản IndexedDB, object store hoặc thuật toán tính công nợ cũ.
- Giữ đầy đủ sửa lỗi v2.1.2, đơn chi tiết v2.1.3, logo, manifest, nhập/xuất Excel và PNG.

## Kiểm thử trước triển khai thử

Đạt: dữ liệu giả schema 2, dữ liệu giả schema 1; 12 ca dữ liệu lỗi; kiểm tra chỉ đọc và xuất báo cáo; tạo khách/đơn nhanh; đơn nhiều hạng mục/kích thước, sửa đơn sau thu; nhập báo giá/chống trùng; thu nhiều đợt; JSON sao lưu/phục hồi; tải lại; Excel/PNG; cú pháp JavaScript.

Đối soát bộ giả trước/sau: 2 đối tác, 2 đơn, 1 thanh toán; phải thu 3.000.000, phải trả 1.000.000; không thay đổi.

Chưa xác minh: bản sao lưu thực tế từ phiên bản đầu tiên; thiết bị Android thực tế. Không kết luận tương thích hoàn toàn với dữ liệu cũ chưa được cung cấp.

Không triển khai main trước khi người dùng xác nhận.
