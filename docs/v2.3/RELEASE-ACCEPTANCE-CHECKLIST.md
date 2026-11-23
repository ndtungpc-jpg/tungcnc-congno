# V2.3 — checklist nghiệm thu trên thiết bị thật

Trạng thái: CHƯA NGHIỆM THU. Điền PASS/FAIL và bằng chứng sau từng bước.

## Checklist Android và PC — chủ xưởng nghiệm thu

Chỉ dữ liệu giả ở alias staging A/B/C; không nhập dữ liệu thật vào preview. Trước thực hiện phải triển khai/đối chiếu Worker staging với commit sửa đã kiểm thử, kiểm tra quota và xuất backup ngoài trình duyệt. Mỗi bước ghi thiết bị/trình duyệt/phiên bản, số dư trước/sau, ảnh và PASS/FAIL.

- [ ] PC A và Android B/C mở đúng alias staging; ghi version và ID; duyệt đúng thiết bị, không chia sẻ key/token.
- [ ] Xuất JSON từng kho; lưu ngoài trình duyệt, đối chiếu số bản ghi, checksum và khả năng đọc. Nếu thiết bị đã có dữ liệu khác, xem trước/đối chiếu từng ID trước bật sync; không tự gộp theo tên/SĐT.
- [ ] A tạo đơn nhiều hạng mục/kích thước; B/C kiểm tra toàn bộ vật liệu, đơn giá, tổng tiền và ngày gốc.
- [ ] B thu một lần chia3 đơn; A/C hiển thị1 lần thu; sửa số tiền/ngày về tháng trước, kiểm tra số dư từng đơn và thu tháng hiện tại.
- [ ] Hủy đúng lần thu, kiểm tra thùng rác/nhật ký và số dư; khôi phục có xác nhận; không ảnh hưởng lần thu khác.
- [ ] Tạo/sửa/xóa đơn thử (không còn payment); xác minh A/B/C và khôi phục đúng ID.
- [ ] Android offline tạo/sửa; chuyển app/khóa màn hình/đóng PWA; mở lại thấy draft và queue; online lại đồng bộ1 lần. Thử chập chờn/mất ACK.
- [ ] A và B offline sửa cùng đơn; online xuất hiện xung đột; không tự chọn. Hủy giữ bản cũ; xem trước số dư và chọn rõ phiên bản; C nhận đúng; lưu được backup hai bản.
- [ ] Nhập lại báo giá/file cũ; không tạo payment/đơn trùng. Nhắc nợ trên A, B/C thấy lịch sử24h; không tự gửi tin.
- [ ] Thu hồi B; B không gửi/nhận server được, dữ liệu local/queue còn. Kết nối thiết bị mới theo quy trình, không chép private key.
- [ ] Trong hồ sơ trình duyệt thử thứ ba, restore JSON, so ID/count/totals/hạng mục/kích thước/payments/reminder. Nhập lại không tăng bản ghi.
- [ ] Chạy tải lâu dài gần ngưỡng5MB/quota thấp; chặn ghi phải thông báo, không báo thành công, không mất queue. Kiểm tra file phục hồi dùng được.
- [ ] Có backup lịch sử đã ẩn danh: so từng ID và tổng trước/sau. Nếu chưa có, giữ CHƯA XÁC MINH.

