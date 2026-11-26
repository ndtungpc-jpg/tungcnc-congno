# Mẫu chính thức — BẢNG THỐNG KÊ ĐƠN HÀNG

Base Preview: ce12110a66e267185daf5397c4b64574cfada768. Nhánh feature/official-order-report-preview. Chỉ Preview, không Production.

## Rà soát trước sửa

Đã xác minh nhánh nền và mã nguồn báo cáo, PDF/PNG, share/clipboard, reminder-history, paymentGroups, date projection và QR. Tái sử dụng customerStatementData để đối soát; paymentDateInfo/paymentGroups cho ngày thu/liên kết đã lưu; font Việt PDF, excelFile, download, runReminderExport và kho QR tg-payment-qr-local. Không viết lại ứng dụng hoặc cơ chế kế toán.

Ảnh chuẩn 19558.png được đối chiếu: mẫu ngang duy nhất 6 cột; bảng thu xen kẽ, nền nhẹ, 3 tổng kết thẳng mép phải; số thu âm xanh; phân trang và điều hướng ID. Công cụ editor và lựa chọn loại/khổ cũ được tháo khỏi tải trang và bỏ khỏi bundle cache mới; không xóa preference hoặc dữ liệu người dùng.

## Triển khai

- Một mẫu, một tên, cố định ngang: STT / Ngày / Nội dung / Khối lượng/ĐVT / Đơn giá / Thành tiền.
- Cùng renderer/drawing plan cho từng PNG trong Preview và PDF A4 ngang. Các neo cột dùng chung REPORT_COLUMNS.padding=12. Mép phải của header Thành tiền, toàn bộ tiền chi tiết và cả ba tiền tổng là x=2203 px trên canvas 2263 px; không căn bằng khoảng trắng.
- Header và dòng cuối cùng màu #e2ecef. Thu tiền nền #f2faeb, chữ #356c3e. Hai dòng đầu tổng kết cùng 36px/đậm vừa; dòng cuối 46px. Font nội dung 34px, không ép nhỏ để vừa trang, không kẻ dọc.
- Metadata: tên/phone/address thực tế, ẩn dữ liệu trống; ngày lập theo đồng hồ thiết bị.
- Đơn là một block theo ID; chỉ hạng mục đầu có ngày. Không suy các bản ghi đơn Excel độc lập thành một đơn chỉ vì trùng ngày/tên. Hạng mục cùng đơn không có đường kẻ đậm ở giữa; đơn khác có đường ngang phân chia.
- Thu tiền theo ngày p.date đã xác nhận bởi paymentDateInfo; một lần phân bổ chỉ gộp khi paymentGroups xác minh đủ liên kết. Không lấy enteredAt/updatedAt/import timestamp. Ngày không rõ không suy đoán: giữ nhãn chưa rõ ngày, xếp ở nhóm ngày chưa biết bằng thứ tự ổn định; ngoại lệ ngày sổ cũ hiện hữu được giữ.
- Ngày trùng: block đơn trước, rồi block thu; ID làm tie-break. Giữ block nguyên vẹn, STT liên tục.
- Quantity thật trống + có unit → hiển thị 1 unit; q=0 giữ 0; thiếu unit → –; thiếu đơn giá → –. m²/md tiếp tục ưu tiên basisQuantity của đơn cũ, quantity cho hạng mục. Không suy từ tiêu đề, không tính lại amount.
- Tổng đơn authoritative vẫn là o.amount. Khi tổng hạng mục lệch tổng đơn đã lưu, thêm dòng chiếu “Điều chỉnh theo tổng đơn đã lưu” bằng phần chênh để không cộng sai hoặc sửa amount. Hạng mục không có amount hợp lệ chặn xuất để kiểm tra, không suy từ giá × lượng.
- Thu và tổng đã thanh toán thêm dấu − ở output, dữ liệu thanh toán gốc không đảo dấu. Đối soát gross − received với remaining từ logic hiện hữu.

## Phân trang và chia sẻ

Ưu tiên 8–10 dòng/trang, linh hoạt theo số dòng xuống hàng và block đơn. Đơn nhỏ giữ chung trang nếu có thể; đơn lớn tách, có (tiếp theo). Trường hợp một nội dung quá dài, chia ở ranh giới dòng chữ đã wrap, không crop glyph hoặc bỏ số tiền. STT hạng mục không tăng lại cho phần nối tiếp. Lặp header, page count; ba tổng chỉ ở trang cuối. PNG mỗi trang cắt đúng footer/lề, không kéo dài trắng đến A4. PDF dùng các trang tương ứng trên khổ A4 ngang. Tên/thông tin khách dài bất thường vượt dung lượng một trang có lỗi rõ, không vòng lặp vô hạn hoặc cắt âm thầm.

Preview có Trang trước/sau, zoom, copy trang đang xem, tải toàn bộ PNG, PDF, Excel. Blob Preview và blob export giống nhau. Chia sẻ nhiều trang hướng dẫn từng bước, trang 1→2→…→QR nếu tích. Không giả định ứng dụng nhận hỗ trợ/gìn giữ thứ tự nhiều ảnh. Tải/copy là fallback chủ động. Chỉ ghi export sau khi hết các ảnh báo cáo được xử lý, không ghi sent hoặc khẳng định khách đã nhận. Khi hủy bước chưa tiến, không tự ghi thành công.

QR: nhập nhiều ảnh một lần, dùng tên đặt hoặc tên file; giữ database/schema/kho ảnh cũ, không migration/reset. Test giữ nguyên byte ảnh đã lưu sau thay mã nguồn. QR chỉ dùng riêng trên origin/trình duyệt/thiết bị đó, chưa đồng bộ (thông báo hiện hữu được giữ). Báo cáo và Nhắc nợ dùng chung kho; tin nhắn→trang báo cáo nếu có→QR. Không chèn QR vào bảng hoặc văn bản. Không sửa reminder-history.js.

## Kiểm thử tự động

PASS official-report.cjs:

1. Một/nhiều đơn, nhiều hạng mục; ngày gốc bỏ qua ngày nhập/sửa; hai lần thu xen, ngày trùng ổn định.
2. Group receipt đủ liên kết không nhân tiền; thiếu unit/q, q=0; thiếu giá.
3. Tổng gốc 9.372.500, đã thu 3.000.000, còn 6.372.500; adjustment hiển thị đúng phần chênh, không đổi đơn.
4. Ba neo tổng đúng bằng neo Thành tiền; dấu/màu thu; cùng cỡ/độ đậm hai dòng đầu.
5. 1 trang, 14 đơn nhiều trang, 15 hạng mục một đơn nối trang, chuỗi 2000 ký tự không mất chữ, tổng chỉ ở trang cuối, STT liên tục.
6. PNG thực, PDF thực một/nhiều trang (đếm page PDF), Excel 6 cột, Preview byte-identical PNG.
7. Không editor/khổ/loại cũ trong UI; navigation theo ID kể cả hai khách trùng tên; Back về danh sách; state JSON không đổi.

PASS official-share.cjs:

8. 23 đơn/3 trang chia sẻ & tải trang đúng thứ tự; copy đúng blob trang 2/3.
9. Hủy không tiến bước/không ghi export sớm; không QR gọi quy trình phù hợp; QR nằm sau tất cả trang; nhắc nợ text+3 trang+QR và text+QR.
10. Import hai QR cùng lúc, ảnh QR cũ byte-identical; native share/history điểm ghi được spy, không tự xác nhận sent; ledger/history không đổi.

PASS reminder-history.cjs (logic history cũ); overview-v11.cjs; preview-hotfix03.cjs; syntax/diff.

Các test 4 mẫu/editor cũ được thay bằng acceptance của mẫu duy nhất, không dùng những assertion giao diện cũ để phán đoán mẫu mới. Không tuyên bố chạy toàn bộ bộ test lịch sử đã lỗi thời.

## Đối chiếu dữ liệu thật

PASS official-report-source.cjs, bản sao lưu 23/11/2026, Mai Anh Nguyễn (legacy-kh-0050): 11 đơn, 0 giao dịch thu. Tổng 33.029.696; đã thu 0; còn 33.029.696. Xuất 2 PNG + PDF; tổng các dòng signed = remaining; nguồn JSON không đổi. Mẫu minh họa thu 15.000.000 không đưa vào dữ liệu hoặc ảnh nguồn thật. Các dòng legacy độc lập vẫn giữ ID riêng, không tự gộp.

## Browser và giới hạn

Chrome thật với fixture riêng chặn kết nối mạng, không ghi/nhập Production: đã thấy mẫu một trang, 6 cột, thu âm xanh và tổng thẳng cột; không có editor/khổ/loại cũ. Click tên khách từ Orders mở đúng hồ sơ, browser Back trở về Orders. Viewport iframe 412×915 kiểm tra bố cục tương đương điện thoại; không phải Android vật lý. QR đã lưu từ phiên bản trước trên cùng origin vẫn xuất hiện.

Chưa có S24 Ultra/Zalo/SMS thật; không khẳng định native Share Sheet/Zalo đã gửi hoặc khách đã nhận. Test native share/copy/download có spy; cần nghiệm thu thiết bị thực tế trước Production. Không đổi mã/schema IndexedDB công nợ, D1, sync, backup/restore, công thức, lịch sử/phân bổ thu tiền hoặc nhắc nợ. Không kết nối D1 production để ghi, không dữ liệu thử Production.

## Tệp thay đổi

report-tools.js, report-viewer.js (mới), payment-qr.js, payment-qr.css (mới), reminder-attachment.js, ui-r4.js, ui-r42.js, workshop.js (nhãn báo cáo), index.html, sw.js, version.json, ba official tests và tài liệu này. Gỡ report-editor.js / report-editor.css khỏi source đang triển khai. Các khóa thiết lập cũ vẫn giữ, chỉ không dùng nữa.
