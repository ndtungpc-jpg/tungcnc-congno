# Báo cáo gọn theo nội dung — Preview

Base: 006d91c536e2db68743ff9a334fd8b7a441c1721. Nhánh fix/report-compact-png-preview. Chỉ Preview.

## Thay đổi

- Thiết bị chưa lưu cấu hình mặc định Ngang, giá trị Dọc đã lưu vẫn được tôn trọng. Hai nút Ngang/Dọc có ngay trong màn hình xem ảnh, đổi ảnh và ghi nhớ lựa chọn; hộp xuất cũng có hai lựa chọn theo thứ tự này.
- PNG dùng luồng liên tục, chiều rộng 2263 px (Ngang) hoặc 1600 px (Dọc); tính chiều cao từ hàng thực tế đến hết tổng kết + 32 px. Không lấy chiều cao A4, không ngắt trang/hàng để lấp đầy ảnh, không lặp header giữa PNG.
- PDF tiếp tục A4 theo khổ, phân trang và lặp header. PNG vượt 30.000 px vẫn báo chọn PDF/Excel theo giới hạn an toàn hiện hữu.
- Nền mục #edf2f7, đầu bảng #f3f4f6, hàng #fafbfc, tổng #e6eff9. Chữ PNG/CSS dùng độ đậm vừa (600), nội dung giữ cỡ đọc được. Không thêm trang trí, đường dọc hay cảnh báo kỹ thuật.
- Khối lượng/ĐVT, đơn giá, thành tiền, tổng đã thanh toán và công nợ tiếp tục lấy cùng nguồn trước sửa; không thay công thức, dữ liệu hoặc quy tắc làm tròn hiện hữu. Thiếu ĐVT/đơn giá vẫn là –.
- Share/Download/Copy giữ nguyên xử lý và cùng blob PNG. Thông báo thiếu hỗ trợ clipboard chỉ hướng dẫn dùng Chia sẻ/Tải PNG, không tự chuyển hành động. Khi đóng ảnh hoặc đổi khổ liên tiếp, kết quả cũ không tự mở lại ảnh.

## Đối chiếu ảnh thật

Bốn PNG render từ reportPNG của ứng dụng bằng 6 dòng nguồn 10127–10132, bản sao lưu 23/11/2026 của Chị Loan. Tổng gốc 10.268.551,6; định dạng hiện hữu hiển thị 10.268.552đ. Đã thanh toán 0; còn phải thanh toán bằng tổng gốc. Không lấy thanh toán minh họa 5 triệu từ ảnh chuẩn.

Nguồn chưa có SĐT/địa chỉ nên ảnh ẩn các dòng này. Liên hệ đầy đủ và thiếu được kiểm thử bằng fixture riêng. Không đưa dữ liệu thử vào Production.

## Kết quả kiểm thử

PASS report-compact.cjs:

- 4 tổ hợp × 1, 3, 40 đơn: PNG cao tăng đúng nội dung, lề cuối chính xác 32 px, ảnh 1 đơn ngắn hơn A4; PDF nhiều trang với 40 đơn.
- Tên dài; thông tin liên hệ có/thiếu; có/không lịch sử thanh toán; tổng đã thu và còn nợ đối chiếu fixture.
- Ngang mặc định; ghi nhớ lựa chọn; đổi khổ ngay ở ảnh; đóng khi đang render không mở lại.
- Blob ảnh xem trước, file dùng Chia sẻ/Tải và clipboard là đúng cùng nội dung, không chỉ text.
- State JSON giữ nguyên.

PASS report-standard.cjs (4 ảnh/PDF nguồn thật, nhiều trang, header, chuỗi 700 ký tự, thiếu ĐVT/đơn giá, contacts); report-quantity.cjs (5 dòng nguồn/giá trị); report-hotfix02.cjs (clipboard pending/success/denied/unsupported, Share/Download dispatch); overview-v11.cjs; preview-hotfix03.cjs; cú pháp/diff.

Canvas/PDF được render thật trong runtime; các test UI dùng DOM, clipboard và native-share được giả lập. Không tuyên bố đã thử dán Zalo/Android/S24 Ultra thật hoặc đồng bộ thiết bị thật. Những thao tác đó cần chủ xưởng nghiệm thu trên Preview; code sync/IndexedDB/D1/nhắc nợ không sửa.

## Nghiệm thu

Kiểm tra trên PC và S24 Ultra: 1, 3, nhiều đơn; chuyển Ngang/Dọc trong ảnh; mở lại kiểm tra khổ nhớ; chia sẻ/tải/sao chép-dán Zalo; PDF nhiều trang; đủ liên hệ theo nguồn. Chờ người dùng duyệt, không Production.
