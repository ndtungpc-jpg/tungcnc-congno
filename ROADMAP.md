# Lộ trình đã chốt — Tùng Giang CNC

## Nguyên tắc
- Quản Lý Công Nợ là ứng dụng trung tâm; Báo Giá Nhanh là đầu vào.
- Không xóa, khởi tạo lại hoặc ghi đè IndexedDB hiện hữu khi cập nhật.
- Không tự động nhập báo giá thành đơn hàng: người dùng phải xem trước và xác nhận.
- Không phát hành production trước khi kiểm thử Android và đối soát dữ liệu.
- Bản sao lưu JSON hiện có là phương án phục hồi, không thay thế kiểm thử migration.

## Mốc nghiệm thu
| Phiên bản | Kết quả bắt buộc |
|---|---|
| v2.1.8 | Thực nghiệm tại xưởng, bảo toàn dữ liệu, nhập đơn nhanh, công nợ KH/NCC |
| v2.1.9 | Hộp thư báo giá chờ, gửi nhiều báo giá không mở Công Nợ, nhận khi mở ứng dụng, chống trùng, xem trước và xác nhận |
| v2.2.0 | KH → đơn hàng → hạng mục → nhiều kích thước; sửa/xóa/nhân đôi và tính giá |
| v2.2.1 | Nhiều lần thanh toán, lịch sử giao dịch, phải thu/phải trả |
| v2.2.2 | Tra cứu, lọc, xuất bảng kê, nhắc nợ |
| v2.2.3 | Nhập Excel, sao lưu/khôi phục, đối soát, vận hành một thiết bị offline |
| v2.3.0 | Cơ sở dữ liệu đám mây, không phá IndexedDB |
| v2.3.1 | Đăng ký/xác thực thiết bị và migration có đối soát |
| v2.3.2 | Đồng bộ hai chiều |
| v2.3.3 | Đồng bộ offline, hàng đợi và giải quyết xung đột |
| v2.4.0 | Đồng bộ ổn định 2–3 thiết bị |
| v2.4.1 | Phân quyền, nhật ký, thu hồi quyền |
| v2.4.2 | Kiểm thử thực tế nhiều thiết bị, mất mạng, đối soát |
| v2.5.0 | Bản ổn định cho xưởng, đồng bộ 2–3 thiết bị, sao lưu và phục hồi |

## v2.1.9 — Checklist nghiệm thu
- [ ] Worker + D1 có cấu hình và xác thực thiết bị; không nhúng bí mật vào JS tĩnh
- [ ] Báo Giá Nhanh: gửi nhiều báo giá, mỗi lần gửi chờ xác nhận lưu từ server
- [ ] Công Nợ: tự kiểm tra hộp thư khi mở, hiển thị số báo giá chờ
- [ ] Xem trước, nhập thành đơn, giữ chờ, hủy; không tạo trùng
- [ ] Chỉ đánh dấu imported sau khi lưu đơn thành công ở IndexedDB
- [ ] Kiểm thử Android hai PWA độc lập, cả khi mạng chập chờn
- [ ] Kiểm tra không mất dữ liệu cũ; có phương án rollback

## Kiến trúc đích
Báo Giá Nhanh → API Worker → D1 quote_inbox → Công Nợ (xác nhận) → IndexedDB.
Ở v2.3.x bổ sung đồng bộ dữ liệu nghiệp vụ qua máy chủ, không dùng hộp thư báo giá làm nguồn sự thật cho công nợ.
