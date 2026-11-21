# v2.1.11 – Lịch sử theo lần thanh toán

Nền main v2.1.10: 9725bb00f3209dfb64b3670b7106eede0004ef5a.

## Phạm vi
Lịch sử Thu/Chi và lịch sử thu tháng hiển thị một thẻ cho một lần thu/chi có liên kết xác thực, tổng tiền, ngày thực tế, hình thức, ghi chú và số đơn đã phân bổ. Mở Xem/Sửa để đối chiếu từng mã đơn và sửa tổng/ngày/hình thức/nội dung/từng dòng. Không sửa công thức công nợ hoặc ứng dụng Báo Giá Nhanh.

## Liên kết và tương thích
- Khoản phân bổ mới có paymentGroupId và paymentGroupSize (thuộc tính tùy chọn trên bản ghi thanh toán); vẫn giữ từng khoản theo orderId để tính công nợ. Không đổi schema, DB/store/version hoặc khóa lưu trữ.
- Khoản cũ chỉ gộp nếu có mã UUID ở dấu Phân bổ/Chi NCC do mã cũ tạo, nhật ký create chung thời điểm/thiết bị, đủ thành phần và cùng đối tác/ngày/hình thức/nội dung.
- Không gộp theo tên/ngày/số tiền/nội dung giống nhau. Không viết lại lịch sử khi hiển thị.
- Có dấu nhóm nhưng thiếu chứng cứ hoặc thiếu thành phần: hiển thị riêng, cảnh báo và chặn sửa/hủy nhóm. Không có dấu liên kết: giữ giao dịch riêng như trước. Không thể suy diễn các khoản cũ đã mất mã gốc/nhật ký.
- Bản nháp kiểu sửa từng phân bổ cũ không tự điền vào biểu mẫu nhóm mới; chặn lưu và giữ nội dung trong phần chi tiết để sao chép/đối chiếu.

## Lưu, hủy và phục hồi
- Chỉ lưu khi tổng tiền bằng tổng phân bổ (đối chiếu đến 2 chữ số phần lẻ), ngày hợp lệ và từng đơn không vượt dư nợ sau khi loại phần thanh toán của nhóm đang sửa. Giới hạn tối đa hai số lẻ và giới hạn số chính xác để tránh làm tròn âm thầm.
- Kiểm tra snapshot và khóa ghi/version hiện có; xung đột hoặc lỗi lưu hoàn tác toàn bộ candidate. Không tạo giao dịch khi mở hoặc khôi phục giao diện.
- Giữ ID/enteredAt của dòng tiếp tục dùng; chuyển dòng bị bỏ phân bổ vào thùng rác, không xóa vĩnh viễn. Dòng thêm cho đơn khác có ID mới.
- Hủy toàn bộ nhóm sau xác nhận, giữ bản ghi đầy đủ trong thùng rác và ghi nhật ký. Khôi phục trọn nhóm trong một lần lưu, chặn toàn bộ nếu bất kỳ đơn nào thiếu liên kết/vượt nợ hoặc có ID trùng. Không phục hồi riêng một mảnh vào nhóm đang hoạt động.

## Kiểm thử ngày 21/11/2026
Đạt 11 nhóm kiểm thử tự động: thu phân bổ 3 đơn; nhiều lần cùng ngày giữ riêng; sửa tổng/phân bổ và ngày tháng trước; chặn sai tổng/vượt nợ; hủy/khôi phục nguyên nhóm có nhật ký; chặn bản nháp xung đột; khôi phục lỗi ở dòng sau không khôi phục dở; NCC tách biệt; giao dịch v2.1.10 có/không bằng chứng; reload/backup giữ nhóm; chặn bản nháp từng dòng cũ.
Đạt 3 ca bổ sung: bỏ dòng/đổi sang đơn khác giữ bản gốc trong thùng rác; giả lập lỗi ghi không lưu từng phần; phục hồi JSON trên DB giả độc lập giữ metadata/số dư.
Đạt hồi quy operations/session/dashboard/backdated payments/inbox/quote/orders/Excel/PNG/backup và cú pháp JavaScript. Đạt mô phỏng SW precache/cập nhật và offline fallback, chỉ dọn cache tài nguyên cũ, không xóa dữ liệu kế toán.
Chrome thật khung 390 px, dữ liệu giả và DB QA riêng: 3 dòng 500.000 → một thẻ 1.500.000; sửa ba dòng 600.000 → 1.800.000; hủy → lịch sử 0 và thùng rác một nhóm; khôi phục → phải thu 1.200.000 / thu tháng 1.800.000, reload giữ đúng. Đây không phải kiểm thử Android thật.

## Đối soát
Tổng 3 đơn thử 3.000.000. Trước thao tác chỉ đọc, hiển thị nhóm không đổi tổng khoản thu và số dư. Ca tự động thu 2.400.000 + lần riêng 100.000; sửa lần đầu còn 1.800.000, còn phải thu 1.100.000 (500.000/400.000/200.000). Hủy lần đầu còn thu 100.000, phải thu 2.900.000; khôi phục về 1.100.000, lần thu khác giữ nguyên. Đổi ngày lần đầu về tháng trước làm thu tháng này chỉ còn 100.000, không đổi số dư.

## Giới hạn
Chưa kiểm thử Android/Samsung thật, bàn phím, cài/cập nhật PWA thực tế, khóa màn hình, chuyển app, offline trên máy thật hoặc file://. Không truy cập dữ liệu thật trên điện thoại hoặc có đủ bản sao lịch sử để khẳng định toàn bộ tương thích từ phiên bản đầu. Khoản cũ thiếu bằng chứng không được sửa/hủy theo nhóm tự suy đoán. Không có lỗi nghiêm trọng quan sát được trong phạm vi đã kiểm thử; không khẳng định an toàn tuyệt đối.
