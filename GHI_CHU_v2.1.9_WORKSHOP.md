# Tùng Giang CNC v2.1.9 – thử nghiệm trước phát hành

Nhánh: `test/v2.1.9-workshop`. Nền mã: v2.1.8 `4dfbfa4ededda94481ac542cb0984ed2b0634e4f`; main tại thời điểm bắt đầu: `dc9bf0d55d0dc3c5b620318ca0dc6da087e115c9`. Không cập nhật main/production.

## Hợp nhất và thay đổi
- Giữ 10 mẫu nhắc nợ, 6 xưng hô, chống số dư cũ, sao chép/chia sẻ theo thao tác người dùng.
- Bốn mục điều hướng: Tổng quan, Khách hàng, Dữ liệu, Thêm. Đơn hàng và Thu/Chi ở Thêm.
- Đơn nhanh có điện thoại tùy chọn, ngày sửa được. Có thể bổ sung hạng mục; sửa đơn giữ lịch sử thu.
- Hồ sơ có địa chỉ, điện thoại, ghi chú, xưng hô; chọn rõ ID đối tác cũ. Trùng tên/SĐT không tự gộp.
- Phiếu NCC nhiều dòng ván/gỗ, sơn/dung môi và nhập tự do. Tổng nhập tay chỉ đổi qua nút xác nhận; không quản lý tồn kho.
- Một bộ Excel gồm 7 trang nghiệp vụ và Hướng dẫn; danh sách chọn, công thức, định dạng điện thoại văn bản. Bản Excel có sẵn được nhúng trong HTML offline, không tải Internet.
- Đọc XLSX có/không prefix namespace; đọc số điện thoại có định dạng số 0; từ chối số điện thoại đã mất định dạng, không suy đoán số 0.
- Xem trước, chọn đối tác, bỏ qua lỗi có xác nhận, ghi nguyên tử kèm bản phục hồi và SHA-256 chống nhập lại tệp. Excel chỉ thêm dữ liệu, không sửa đơn cũ. Khi tổng chi tiết không khớp, không nhập đơn liên quan.
- Phiếu NCC lặp mã trong cùng tệp được cộng nhiều dòng nếu cùng đối tác/ngày. Mã phiếu đã có trong kho bị bỏ qua.
- Thanh toán cần ngày giao dịch. Không tạo lịch sử giả từ tổng tiền đã thu trong tệp cũ thiếu ngày; các dòng đó cần bổ sung ngày trước khi nhập.
- PNG/Excel/PDF giữ 3 phần và công thức kế toán; PNG đã tạo thực tế trên trình duyệt. PDF sử dụng hộp thoại in của trình duyệt.
- SVG Lucide được đóng gói tại chỗ, có giấy phép. Năm chủ đề chỉ áp dụng khi chọn; người dùng cũ giữ giao diện.
- Thời điểm sao lưu chỉ ghi nhận đã tạo tải xuống, không khẳng định tệp đã lưu thành công trên thiết bị.

## An toàn dữ liệu
Tên DB `tunggiang-congno-v2`, version 1, store `state`, key `main`, schema dữ liệu 2 được giữ nguyên. Chỉ thêm trường metadata tùy chọn khi người dùng lưu hoặc xác nhận nhập. Không có reset/migration tự động. Tiếp tục sử dụng kiểm tra liên kết, giao dịch nguyên tử, kiểm soát nhiều cửa sổ, rollback và bản phục hồi đã có.

Bản HTML offline sử dụng DB và localStorage riêng có hậu tố v219, không quét/đọc kho website. Chỉ dùng dữ liệu giả. Không dùng file HTML để chứa dữ liệu công nợ thật trước khi kiểm tra lưu bền vững trên điện thoại.

## Kiểm thử và giới hạn
Bộ kiểm thử Node VM, fake IndexedDB và canvas thật: nhập/sửa đơn, hạng mục/kích thước, cọc, NCC nhiều dòng, nhập XLSX cũ/nén/mới, trùng tệp, lỗi ngày/số tiền, quota, rollback, restore preview, JSON, Excel/PNG, 10×6 mẫu nhắc nợ và Service Worker mô phỏng.

Trình duyệt máy tính: tạo đơn nhanh 1.500.000, thu 300.000, số dư 1.200.000; điện thoại giữ số 0; lưu xưng hô Chị; đối soát chỉ đọc 1 khách/1 đơn/1 thu, không lỗi; xuất PNG và JSON thực tế. Dữ liệu này hoàn toàn giả, ở origin thử nghiệm riêng.

Chưa có thiết bị Android/Samsung thật, chưa thử cài PWA, đóng/mở PWA hoặc file:// thật. Chưa có sao lưu từ phiên bản đầu tiên để xác minh tương thích lịch sử đầy đủ. Chưa nghiệm thu sử dụng dữ liệu thật. JSON sao lưu chưa mã hóa; người có file có thể đọc. IndexedDB cục bộ không có đăng nhập/phân quyền; không phải đồng bộ thiết bị.

Chỉ người dùng xác nhận riêng mới được phát hành chính thức.
