# Bộ báo cáo Dọc – Ngang (Preview)

Base: Report Hotfix 02 — 8b66faed336b68528eb3ac4b5fdd7f676f1a87f4. Chỉ Preview, không Production.

## Phạm vi

Bốn tổ hợp: Thống kê đơn hàng / Đối chiếu công nợ × Dọc / Ngang. Theo ảnh tham chiếu 19550.png, 19551.png: nền trắng, chữ xanh than/đen, đường xanh mảnh dưới tiêu đề, nền mục xanh xám, hàng xen kẽ, không kẻ ô dọc. Tổng tiền ở cuối, nền xanh nhạt chỉ cho dòng cuối. Bảng thống kê không thêm II. Tổng kết/Số đơn hàng.

Thông tin liên hệ chỉ xuất khi có dữ liệu thật: tên, phone, address, email, zalo, website. Không đưa ghi chú nội bộ vào báo cáo. Dọc xếp liên hệ thành dòng; Ngang thành hai nhóm, không gạch dọc. Thiếu ĐVT hoặc khối lượng thì ô Khối lượng/ĐVT là “–”; thiếu đơn giá là “–”. Báo cáo khách không có cảnh báo kỹ thuật. Bộ kiểm tra dữ liệu trong chi tiết đơn vẫn giữ nguyên.

reportQuantity và toàn bộ quy tắc chọn quantity/basisQuantity, số tiền gốc và công thức giữ nguyên. reportSections chỉ trình bày: phương thức thanh toán ghép vào Nội dung để giữ đủ dữ liệu và có ba cột như mẫu duyệt. Không sửa cấu trúc giao dịch.

## Xuất

- Chọn Dọc/Ngang ở hộp Xuất báo cáo, lưu riêng thiết bị bằng khóa localStorage tg-report-orientation; không đưa vào ledger hoặc sync.
- reportData chụp orientation vào dữ liệu báo cáo, cache PNG tự phân biệt khổ; PNG xem/tải/chia sẻ/sao chép dùng cùng blob.
- Một kế hoạch vẽ dùng cho PNG và PDF vector A4; lặp tiêu đề mục/cột khi sang trang. Dòng quá dài tiếp tục sang trang thay vì mất chữ. PDF nhúng font Liberation Sans thường/đậm có ký tự Việt (license kèm), không đổi font PDF của các nghiệp vụ khác.
- PNG nhiều trang nối dọc đủ các trang; nếu vượt giới hạn 30.000px hiện có, báo chọn PDF/Excel, không âm thầm cắt nội dung.
- Giữ nguyên thân hàm Chia sẻ/Tải ảnh/Sao chép và quy tắc nhắc nợ của các thao tác cũ. Sao chép không tự gọi Chia sẻ khi không được hỗ trợ.
- Excel giữ mô hình xuất hiện có; đủ thông tin liên hệ và số liệu giống các khổ, không giả lập khổ in Excel.

## Bốn ảnh bàn giao

Render trực tiếp từ reportPNG mới, dùng đúng 6 dòng nguồn 10127–10132 trong bản sao lưu 23/11/2026 của Chị Loan. Tổng gốc 10.268.551,6; định dạng tiền hiện hữu hiển thị 10.268.552đ. Đã thu 0; còn nợ giữ nguyên giá trị gốc. Không suy từ ảnh minh họa.

Nguồn này chưa có giá trị phone/address, vì vậy ảnh thật ẩn hai dòng đó. Số điện thoại/địa chỉ ví dụ trên ảnh thiết kế không được tự đưa vào dữ liệu. Dữ liệu liên hệ đầy đủ/thiếu được kiểm thử riêng bằng fixture tổng hợp.

## Kết quả kiểm thử

PASS report-standard.cjs:

- 4 PNG thật, 4 PDF thật; PDF kiểm tra render, Unicode và font đậm; bảng nguồn/Excel/tổng tiền khớp.
- Mỗi tổ hợp 6 dòng thật nằm một trang; thiếu ĐVT/đơn giá là –; không cảnh báo kỹ thuật, không Số đơn hàng.
- Khổ lưu/đọc và hai lựa chọn đúng ở hộp xuất; cache theo orientation.
- Fixture 80 đơn và tên dài; nhiều trang có header lặp; vị trí trong trang; chuỗi 700 ký tự không mất chữ.
- Liên hệ đầy đủ và chỉ có tên: không dư dòng trống; không đưa ghi chú nội bộ.
- State JSON không đổi sau xem/xuất.

PASS report-quantity.cjs (5 dòng gốc, công thức/khối lượng giữ nguyên, PNG/PDF thật); report-hotfix02.cjs (clipboard blob, thành công sau write, từ chối/thiếu hỗ trợ, stale image, không fallback, share/download dispatch); overview-v11.cjs; preview-hotfix03.cjs; syntax, diff check.

Clipboard/share trong kiểm thử được giả lập. Chưa nghiệm thu dán ảnh vào Zalo trên Samsung S24 Ultra thật; chưa xác nhận đồng bộ thực tế giữa hai thiết bị trong lượt này. Không thay code sync, IndexedDB, D1, công nợ, thanh toán hoặc nhắc nợ. Kiểm tra browser/device được báo theo những gì thực sự quan sát được, không thay thế bằng kết quả giả lập.

## Nghiệm thu thiết bị

Trên S24 Ultra/PC: mở Preview riêng; dùng bản sao dữ liệu phù hợp; xuất cả 4 tổ hợp; kiểm tra phone/address nếu nguồn có; thử tên dài, nhiều trang, chia sẻ, tải, sao chép/dán, PDF, Excel; đổi khổ rồi mở lại để xác minh nhớ lựa chọn. Không nhập dữ liệu thử vào Production. Chờ chủ xưởng duyệt trước mọi cập nhật Production.
