# v2.1.8 — Ứng viên thực nghiệm tại xưởng

## Nguồn và phạm vi hợp nhất
- Main kiểm tra trước cập nhật: v2.1.2, e0ebd56e8ca740c6bc6b9e77dd26691a165781c0.
- Nền Work đã kiểm thử: v2.1.7, 3159c4db5c2670f50431e2bb4cf89bae7aeb8848. Không tìm thấy nhánh v2.1.6 riêng; Trung tâm thu nợ đã hợp nhất và kiểm thử trong v2.1.7.
- ZIP v2.1.8 SHA-256: ed0df142e03310247f13cbcbd0d51be5c62e42aa0a3410996a83a833808766f4.
- ZIP chưa chứa toàn bộ bản sửa Work; chỉ lấy khối thao tác nhanh và ý tưởng báo cáo trước thực nghiệm. Giữ bộ kiểm tra sao lưu sâu, chống trùng, hộp thư, chi tiết đơn, bảo mật và sửa thứ tự nạp biểu mẫu NCC từ Work.

## Các lỗi đã sửa và tối ưu
1. Nút Đơn nhanh trong ZIP mở formOrder nhiều ô: chuyển sang formQuickOrder 3 ô đã được kiểm thử.
2. Nút Thu nợ/Gửi nhắc trong ZIP dẫn danh sách công nợ: chuyển trực tiếp Trung tâm thu nợ, không tự gửi.
3. Báo cáo trước thực nghiệm trong ZIP chỉ đọc state trong bộ nhớ, chưa kiểm tra đầy đủ dữ liệu: đọc kho thực qua currentIntegrityReport, phát hiện ID/link/money/chi tiết sai và không hiển thị số 0 giả khi không thể tính số dư.
4. Các biểu mẫu cũ đóng trước khi lưu bền vững: chỉ đóng sau commit thành công. Lỗi ghi giữ nội dung nhập, không phát thông báo lưu thành công.
5. Bổ sung xác nhận bỏ nội dung form chưa lưu khi đóng và cảnh báo trước tải lại/đóng trang. Không tự lưu bản nháp vào dữ liệu công nợ.
6. Phiếu nhập NCC có chọn cốt/mặt phủ, dùng trường material hiện có; giữ số lượng, đơn giá hoặc tổng tiền trực tiếp. Không đổi schema/di chuyển dữ liệu cũ.
7. Thu gọn ràng buộc chiều rộng màn hình nhỏ, giữ bảng cuộn trong vùng riêng và nút tối thiểu 44px; cần kiểm thử Samsung thật trước nghiệm thu thiết bị.
8. Đồng bộ nhãn, version.json và cache SW thành 2.1.8; thêm trial-readiness.js vào precache. Giữ manifest/logo TG/CSP.

## Kiểm thử tự động
Đạt cú pháp toàn bộ JS; chạy lại 9 bộ kiểm thử v2.1.7 và thêm bộ workshop pilot. Bao gồm:
- Nâng cấp schema cũ giả 1/2 không ghi kho hay thay đổi khách/NCC, đơn và thanh toán.
- 6 nút trang chủ; báo cáo đọc kho thực chỉ đọc, dữ liệu bất thường không tự sửa.
- Lỗi lưu/đầy bộ nhớ mô phỏng giữ bản ghi cũ, form và nội dung nhập; retry chỉ tạo một đơn.
- Đơn nhanh độc lập, chi tiết nhiều hạng mục/kích thước, 6 phương thức tính giá, vật liệu, giảm/vận chuyển/VAT, sửa sau thu tiền, nhân bản hạng mục và đơn.
- JSON Báo Giá Nhanh, xem trước/ghép khách, chống trùng; inbox nhận/để sau/từ chối không ghi công nợ, tiếp nhận có xác nhận và bản trước nhập.
- NCC tên hàng tự do, cốt/mặt phủ, quantity × price hoặc tổng trực tiếp, chi trả nhiều đợt và bảo toàn lịch sử cũ.
- Tìm không dấu, số dư, bảng kê, nội dung nhắc; không tự sao chép/chia sẻ/gửi.
- XLSX nén, mẫu và export; PNG cột Khối lượng/ĐVT; backup SHA byte gốc/BOM, kiểm tra lỗi và phục hồi có xác nhận, rollback khi lỗi ghi.
- SW mô phỏng cache đầy đủ tài nguyên, offline và chỉ xóa cache ứng dụng cũ.

Đối soát mẫu phục hồi: 1 khách, 1 NCC, 2 đơn/phiếu nhập, 2 giao dịch; đã thu 2.000.000, đã trả 250.000, phải thu 3.000.000, phải trả 750.000. Khách/NCC, đơn, thanh toán giữ nguyên từng bản ghi sau kiểm tra/phục hồi. Chỉ revision/audit/recovery tăng sau thao tác xác nhận theo quy trình cũ.

## Quy trình sao lưu hằng ngày khi thực nghiệm
1. Trước nhập: mở Kiểm tra trước thực nghiệm, đối chiếu số lượng và số dư; dừng nếu có lỗi.
2. Cuối ngày: Sao lưu ngay trên Tổng quan; kiểm tra file có dữ liệu và giữ thêm một bản tại nơi an toàn. JSON chưa mã hóa; không gửi vào nhóm công khai.
3. Có báo giá chờ: sao lưu hộp thư riêng hoặc giữ JSON báo giá gốc. Backup công nợ không bao gồm hộp thư chưa tiếp nhận.
4. Định kỳ: dùng Kiểm tra file sao lưu không nhập; thử phục hồi trên origin thử nghiệm riêng, đối chiếu khách/NCC, đơn, thu/chi, tổng thu/trả và số dư.
5. Trước cập nhật chính thức: giữ nguyên bản sao trước cập nhật; không dọn dữ liệu trình duyệt hoặc đổi origin khi chưa có bản sao đã thử phục hồi.

## Giới hạn nghiệm thu
- Chưa có backup thật từ phiên bản đầu; không kết luận tương thích hoàn toàn.
- Chưa có thiết bị Samsung/Android thật: chưa xác nhận bàn phím, Share Sheet Zalo/SMS, cài PWA, đóng/mở PWA, cập nhật PWA đang cài hoặc offline thật. SW chỉ có kiểm thử mô phỏng.
- JSON và kho trình duyệt chưa mã hóa; chưa đăng nhập/phân quyền/đồng bộ nhiều thiết bị. Giữ giới hạn trong báo cáo bảo mật v2.1.7.
- Website thử có origin/kho riêng, không lấy dữ liệu thật của production. Không thay main hoặc triển khai production nếu chưa được người dùng xác nhận.
