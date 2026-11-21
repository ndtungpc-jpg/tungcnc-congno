# Hướng dẫn thử v2.3 trên 2–3 thiết bị
Chỉ dùng dữ liệu giả trên staging. Không nhập bản sao công nợ thật vào kho staging dùng chung.

## Kết nối
1. Mở cùng địa chỉ staging trên Chrome của từng thiết bị: https://feature-v2-3-sync-foundation.tungcnc-congno.pages.dev/ . Không cần dùng URL B/C; B/C là kho giả riêng để Work kiểm thử.
2. Sao lưu JSON tại Dữ liệu. Đối chiếu số khách/NCC/đơn/giao dịch, phải thu và phải trả. Giữ file ở nơi riêng.
3. Đóng biểu mẫu, chạm trạng thái đồng bộ, xác nhận bật staging và đặt tên thiết bị. Ứng dụng lưu bản phục hồi trước; mã thiết bị không phải mật khẩu.
4. Chủ Cloudflare kiểm tra mã chính xác trong D1 tungcnc-sync-v23-staging (không phải D1 hộp thư). Duyệt đúng ID/origin sau đối chiếu trực tiếp; không duyệt chỉ theo tên. Có thể gửi Work mã thiết bị để hỗ trợ, không gửi token/mật khẩu.
5. Kho rỗng nhận dữ liệu sau duyệt. Kho đã có dữ liệu hiện Chờ đồng bộ: mở trạng thái → Đối chiếu / Tiếp nhận dữ liệu.
6. Chọn rõ Thiết bị/Máy chủ khi cùng ID khác nhau. Xem từng khác biệt, các cảnh báo trùng và số dư dự kiến. Chỉ xác nhận khi đã đối soát.
7. Khi queue về 0 và không có lỗi, trạng thái Đã đồng bộ. Ứng dụng tự kiểm tra khi mở/quay lại, online và mỗi 15 giây khi đang hoạt động. Không bảo đảm đồng bộ lúc Android đã đóng/đình chỉ PWA.

Duyệt qua D1 console (thay placeholder bằng ID đã xác minh; không dùng câu lệnh duyệt toàn bộ):
SELECT id,label,origin,status FROM sync_devices;
UPDATE sync_devices SET status='approved' WHERE id='<ID-da-doi-chieu>' AND status='pending';
Thu hồi: dùng nút Thu hồi thiết bị trên chính máy, hoặc chủ Cloudflare đổi đúng ID sang status='revoked'. Không xóa hàng thiết bị.

## Chuyển dữ liệu cũ an toàn
- Production và staging là hai origin khác nhau; staging không tự đọc IndexedDB của website cũ.
- Trên từng máy cũ: xuất backup JSON riêng và ghi số lượng/số dư. Không gỡ PWA, xóa dữ liệu web hoặc reset trình duyệt.
- Tạo bản đã ẩn thông tin để thử trước. Chỉ đổi tên/SĐT/địa chỉ/ghi chú nhạy cảm trên bản sao, giữ ID, liên kết, số tiền và ngày. Không sửa bản gốc.
- Phục hồi bản ẩn thông tin vào kho thử riêng bằng Dữ liệu → Phục hồi: xem trước, chỉ thêm ID thiếu, xung đột thì dừng. Sau đó kiểm tra số liệu.
- Bật đồng bộ và đối chiếu. Bản giống hệt giữ nguyên; bản khác ID không tự gộp dù cùng tên/SĐT. Thanh toán giống nhau khác ID là nghi trùng, cần đối chiếu chứng từ; hai lần chuyển thật cùng ngày có thể hợp lệ.
- Với hai ID biểu diễn cùng một đơn nhưng có liên kết thanh toán khác nhau, không tự sửa ID hoặc cộng số dư. Xuất đối soát để xử lý riêng; nếu chọn khiến thiếu liên kết, ứng dụng chặn.
- Không sử dụng quy trình này cho production trước khi được nghiệm thu và cho phép phát hành.

## Xung đột và phục hồi
- Lỗi đồng bộ không đồng nghĩa dữ liệu đã mất: giữ local, queue và bản máy chủ; có thể tiếp tục nhập offline.
- Mở trạng thái → Xuất đối soát và bản phục hồi trước khi quyết định.
- Chọn từng bản, kiểm tra tổng dự kiến rồi Xác nhận áp dụng lựa chọn. Nếu máy chủ đổi sau xem trước, phải xem trước lại.
- Bản phục hồi trước bật ở syncReview.backups với reason before-first-sync; trước đối chiếu là before-explicit-reconciliation (gồm queue cũ). Dữ liệu nằm ở thuộc tính data. Không sao chép/export private key.
- File đối soát cấp ngoài chứa dữ liệu hiện tại và các backup bên trong. Muốn thử phục hồi một backup cụ thể, bọc backup.data thành JSON app TungGiang-CongNo, version 2, data là backup.data, trên kho thử độc lập. Không nhập trực tiếp lên kho thật. Phục hồi thêm thiếu sẽ chặn cùng ID khác nội dung; không phải nút tự quay ngược toàn bộ Cloud.
- Rollback mã Worker/Pages không phục hồi D1. Không xóa operation log, receipt, queue hay metadata. Dừng ghi trên các máy khi cần phục hồi; đối soát rồi quyết định thủ công.
- Backup JSON không mã hóa; ai có file có thể đọc. Không đưa file thật lên GitHub hoặc kho staging.

## Mẫu nhắc nợ
Chọn mẫu → chỉnh tin → Lưu làm mặc định → kiểm tra nội dung biến → Xác nhận lưu mẫu này.
Giữ {amount} và {x}/{X}; có thể dùng {customer}, {deadline}. Mỗi mẫu lưu riêng, đồng bộ sau khi thiết bị được duyệt. Khôi phục mẫu gốc chỉ tác động mẫu đang chọn. Không tự gửi tin.

## Checklist chủ xưởng cần nghiệm thu
- A tạo đơn; B/C kiểm tra hạng mục, vật liệu, tiền.
- B thu tiền tháng trước; A/C giảm nợ đúng và không tăng Đã thu tháng này.
- Tắt mạng, tạo/sửa đơn, đóng/mở PWA, bật mạng: queue còn và đồng bộ đúng.
- Cùng sửa một đơn ở hai máy: xuất đối soát, chọn bản có xác nhận.
- Thử backup/restore bằng dữ liệu giả ở kho độc lập.
- Thử gửi Báo Giá Nhanh → xem trước → xác nhận tại Công Nợ → máy khác nhận.
- Lưu/reset từng mẫu nhắc nợ; thử khóa màn hình, chuyển ứng dụng, chia sẻ file.
Ghi rõ mẫu máy, Chrome, phiên bản Android, kết quả và lỗi; không đánh dấu đạt khi chưa thử.

## Đã xuất nhắc nợ trong 24 giờ
Nhãn theo từng khách, chung cho tin nhắn và ảnh. Bấm xuất lại sẽ cảnh báo; vẫn có thể tiếp tục. Mở hồ sơ → Lịch sử nhắc nợ / Xác nhận đã gửi để tra cứu hoặc tự xác nhận. Đã xuất chỉ nghĩa clipboard/share sheet/yêu cầu tải xuống đã được tiếp nhận; không chứng minh khách nhận. Khi offline, cảnh báo chỉ dựa trên lịch sử máy biết; đợi Đã đồng bộ trước khi phối hợp nhắc từ hai máy. Hai thao tác đồng thời vẫn có thể xảy ra trước khi dữ liệu kịp lan.
