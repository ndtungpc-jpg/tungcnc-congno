# V2.3 — Backup Independence & Disaster Recovery

Ngày22/11/2026, nhánh `feature/v2.3-sync-foundation`. Nguồn trước thay đổi: `20da1ee31969594f948fc354c79eadc83296088f`. Không thay UI-R4.2.1 ngoài thêm một thao tác trong Dữ liệu → Nhập / Xuất dữ liệu. Không thay IndexedDB/D1, Worker, giao thức, số dư hoặc lịch sử.

## Kết luận

**PASS kỹ thuật tự động cho phạm vi đã kiểm chứng:** cùng snapshot JSON/XLSX, checksum, phục hồi dữ liệu nghiệp vụ được liệt kê bên dưới vào kho giả mới sau khi xóa kho giả cũ, đọc workbook độc lập, không nhân đôi khi phục hồi lại. **CHƯA NGHIỆM THU toàn bộ disaster recovery/production:** chưa mở file bằng Microsoft Excel GUI/Android thật, chưa có dữ liệu lịch sử đời đầu và chưa diễn tập phục hồi D1. Không tuyên bố phục hồi toàn bộ mọi dữ liệu của thiết bị/dịch vụ.

## Cấu trúc bộ sao lưu

Thao tác mới **Sao lưu JSON + Excel độc lập** tạo trước cả hai định dạng từ một bản chụp đã clone, không đọc lại state giữa các lần tải. Nguồn là `committed` của ứng dụng đang mở và hộp thư cục bộ tại lúc chụp. Không bao gồm bản nháp chưa lưu, outbox, thay đổi chưa nhận từ thiết bị khác hay toàn bộ tài khoản Cloudflare. Nếu hộp thư không đọc được, dừng và báo lỗi, không coi thiếu hộp thư là rỗng.

### JSON phục hồi

Envelope vẫn là `app: TungGiang-CongNo`, `version:2`, `exportedAt`, `data`, `quoteInbox` tùy nguồn. Giữ toàn bộ trường JSON của snapshot data, bao gồm partners/orders/quoteItems/purchaseItems/sizes/payments/audit/trash/recovery/excelImports/reminderTemplates/reminderEvents. Không thay ID hoặc dữ liệu nguồn. `appVersion` và `backupIntegrity` là metadata bổ sung; parser cũ không cần các trường này, bộ hồi quy xác minh parser hiện có vẫn chấp nhận. JSON cũ không có checksum vẫn nhập theo preflight cũ; không chứng nhận toàn bộ phiên bản cũ khi chưa có file lịch sử thật.

`backupIntegrity` dùng SHA-256 của biểu diễn canonical `{data,quoteInbox?}`. Hash được tính sau khi tạo snapshot JSON, nên kiểm tra lại được từ chính file đã tải. File mới bị sửa nội dung mà hash không đổi sẽ bị chặn trước xem trước/phục hồi. Metadata thời gian/phiên bản không thuộc phạm vi hash snapshot; file SHA256 đi kèm kiểm tra toàn byte file.

### Excel đọc độc lập

Workbook OOXML `.xlsx` gồm đúng9 sheet, không macro, công thức, external link hoặc kết nối mạng. Dùng bộ mã xuất Excel cục bộ đã có, không CDN.

| Sheet | Nội dung và liên kết |
|---|---|
| Khách hàng | ID, tên, điện thoại dạng chữ giữ số0 đầu, địa chỉ, ghi chú, xưng hô |
| Nhà cung cấp | Cùng cấu trúc đối tác, giữ ID NCC |
| Đơn hàng | ID đối tác/đơn, mã, ngày gốc, giá trị đơn authoritative, đã thu/trả, còn nợ, giảm/vận chuyển/VAT gốc, báo giá, trường chi tiết đơn cũ |
| Hạng mục | ID gốc nếu có, khóa dòng snapshot, ID đơn/đối tác, mảng nguồn/STT, vật liệu, khối lượng/ĐVT/đơn giá/thành tiền, quy cách/độ dày |
| Kích thước | ID gốc nếu có, khóa dòng hạng mục, ID đơn/đối tác, rộng/cao/số lượng/mô tả gốc |
| Thanh toán và phân bổ | Một dòng mỗi payment ID; ID nhóm và số phân bổ khai báo, ID/mã đơn/đối tác, ngày thu/chi thực tế, ngày nhập, phương thức/nội dung/số tiền |
| Tổng hợp công nợ | Một dòng mỗi đối tác, chỉ tính amount đơn gốc; loại đơn hủy khỏi số dư, không cộng lại các dòng hạng mục |
| Lịch sử nhắc nợ | ID sự kiện/đối tác, loại xuất hoặc xác nhận đã gửi, thời điểm và ID lần xuất liên quan |
| Thông tin sao lưu và đối soát | Thời gian/app/envelope/schema, SHA snapshot/JSON, counts/totals và giới hạn phạm vi |

Dữ liệu cũ chưa có item/size ID: không tự cấp ID vào dữ liệu. Khóa dòng Excel là JSON tuple `[orderId,collection,index]` và `[orderId,collection,itemIndex,sizeIndex]`, chỉ dùng trong snapshot này; cột ID gốc để trống. Không dùng khóa vị trí để đồng bộ hoặc sửa bản ghi gốc.

Các cột tiền căn phải, không ép làm tròn. Số trên15 chữ số được lưu dạng chữ và căn phải để Excel không tự mất chính xác; numeric string gốc giữ dạng chữ. Ngày được giữ dạng chuỗi gốc để không tự chuyển múi giờ/serial hoặc thay ngày lịch sử. Công thức-like text xuất inline string, không thành công thức thực thi. quoteOriginalItems/quoteOriginalTotals được giữ trong JSON, không xuất lần hai thành dòng hạng mục để tránh cộng trùng. Trường dữ liệu ngoài các cột đọc vẫn nằm trong JSON; Excel **không phải** định dạng phục hồi đầy đủ.

### Checksum và lưu file

File thứ ba `*_SHA256.json` chứa SHA-256 toàn byte JSON và XLSX, tên thực tế sau chỉnh sửa, thời gian chung, schema/counts/totals và snapshot hash. Không nhúng checksum của XLSX vào chính XLSX: đây là tham chiếu vòng không thể dùng làm kiểm tra toàn byte. Hash JSON cũng được ghi trong sheet thông tin Excel.

Nếu build Excel lỗi hoặc người dùng hủy bất kỳ file nào, báo bộ sao lưu chưa hoàn tất. Không tự xóa file đã tải hoặc bản sao cũ. Trình duyệt chỉ chứng minh đã yêu cầu tải, không biết người dùng đã lưu thật lên ổ đĩa; thông báo yêu cầu kiểm tra đủ3 file, không ghi nhận “đã lưu thành công” giả. Nút Sao lưu JSON cũ được giữ để dùng riêng, kể cả khi dữ liệu quá lớn để tạo Excel. Giới hạn Excel:32.767 ký tự/ô,1.048.576 dòng/sheet; nếu vượt phải báo lỗi, không cắt nội dung.

SHA-256 phát hiện thay đổi byte, không mã hóa và không xác thực người tạo. Ai có file có thể đọc và tự tính lại hash; không chia sẻ bản sao kinh doanh công khai.

## Đối soát phục hồi — dữ liệu giả

Thực thi mã ứng dụng export/build → xóa **private fake IndexedDB factory** và state nguồn → khởi tạo app/VM/kho trống mới → import JSON → xem trước không ghi → xác nhận thêm. Không xóa kho thật, không gọi Cloudflare/D1.

| Chỉ tiêu | Snapshot | Sau phục hồi | Kết quả |
|---|---:|---:|---|
| KH / NCC | 1 / 1 | 1 / 1 | PASS |
| Đơn/phiếu | 4 | 4 | PASS |
| Hạng mục / kích thước | 3 / 2 | 3 / 2 | PASS |
| Payment ID | 5 | 5 | PASS |
| Nhóm thanh toán | 1 nhóm3 phân bổ | Giữ đúng3 ID và liên kết | PASS |
| Đã thu KH | 650.000 | 650.000 | PASS |
| Còn phải thu | 6.651.000 | 6.651.000 | PASS |
| Đã trả NCC | 300.000,125 | 300.000,125 | PASS — giữ phần lẻ lịch sử |
| Còn phải trả NCC | 500.000 | 500.000 | PASS |
| Nhắc nợ / mẫu nhắc | 2 / 1 | 2 / 1 | PASS |
| Excel import fingerprint | 1 | 1 | PASS |
| Thùng rác | 1 | 1 | PASS |
| Nhật ký / recovery | 12 / 1 | 13 / 2 | PASS — thêm đúng audit nhập và snapshot trước nhập |

So từng ID/nội dung của partners/orders/payments/trash/reminderEvents/reminderTemplates/excelImports; toàn bộ audit/recovery gốc còn nguyên. Revision và metadata kỹ thuật nhập thay đổi theo cơ chế hiện hữu, không yêu cầu byte của toàn state sau nhập giống nguồn. Nhập lại JSON không ghi thêm. Hộp thư phục hồi riêng qua cùng JSON, có xác nhận, giữ quote payload/trạng thái/receivedAt, không tạo đơn công nợ.

## Bảng kiểm thử

| Tình huống | Kết quả | Bằng chứng |
|---|---|---|
| Snapshot bị thay trong khi hash async | PASS tự động | JSON/Excel giữ bản clone ban đầu; state nguồn không thay |
| JSON mới, JSON cũ, checksum sai | PASS tự động | Envelopev2 parser cũ chấp nhận; bỏ metadata vẫn hợp lệ; payload sửa bị từ chối |
| Mất kho ứng dụng thử / fresh restore | PASS tự động | Factory nguồn thực sự deleteDatabase và databases() rỗng; app mới phục hồi qua importData/confirmBackupRestore |
| Nhiều phân bổ, cùng ngày nhiều lần, ngày thu cũ | PASS tự động | 5 payment ID giữ riêng; nhóm3 dòng600.000, lần khác50.000 không gộp; ngày15/10 không đổi |
| Workbook độc lập offline | PASS openpyxl | Mở9sheet chỉ từ file, so ID/liên kết/counts/tổng; không import mã app hay gọi mạng |
| Số thập phân và số16 chữ số | PASS tự động | Không làm tròn giá trị item459999.99999999994/tiền lẻ;16 chữ số giữ nguyên dạng chữ |
| Hủy JSON/Excel/checksum, Excel encoder lỗi | PASS tự động | Không báo hoàn tất; lỗi build không yêu cầu tải file nào |
| File tên đã sửa và checksum | PASS tự động | Hash đúng bytes và tên thực tế của hai download |
| Hồi quy đồng bộ/công nợ/UI-R4.2.1 | PASS tự động |7 bộ npm test,3 bộ data-safety và5 debt audit chạy lại |
| Microsoft Excel GUI / Excel Android | CHƯA KIỂM THỬ | openpyxl không thay thế nghiệm thu ứng dụng Excel thực tế |
| Android/PWA tải3 file thật, dung lượng lớn | CHƯA KIỂM THỬ | Cần chủ xưởng thử S24 Ultra; không đánh dấu bằng VM |
| Bản sao lịch sử đời đầu | CHƯA XÁC MINH | Chưa được cung cấp |
| D1 disaster recovery | CHƯA KIỂM THỬ trong đợt này | Không chạm Worker/D1; xem báo cáo staging trước |

Chạy `npm run test:backup-recovery` trong sync, cần Node24, jsdom/fake-indexeddb theo package và Python3 + openpyxl. Evidence: `evidence/backup-recovery.json`, `backup-recovery-tests.log` và các log hồi quy cùng prefix. Chỉ commit code/test/aggregate dữ liệu giả; không commit JSON/XLSX nghiệp vụ hoặc snapshot D1.

## Phạm vi chưa bao phủ

- D1 trung tâm, log thao tác/nonce, thiết bị/phê duyệt/thu hồi và D1 hộp thư báo giá không thuộc bản sao này. JSON chỉ là dữ liệu app đã nhận/lưu cục bộ; không thay backup D1/server.
- Dữ liệu tiền lẻ lịch sử vẫn giữ nguyên; preflight đồng bộ v2.3 hiện yêu cầu VND nguyên (rủi ro A06), nên phục hồi local không có nghĩa bản đó đã đủ điều kiện gửi lên server. Không tự làm tròn để vượt kiểm tra.
- Không phục hồi private device key, outbox/cursor/metadata đồng bộ, bản nháp, theme, localStorage khác hoặc cache PWA. Máy mới phải kết nối thiết bị mới, xem trước/đối chiếu dữ liệu trung tâm; không chép khóa riêng.
- JSON giữ toàn bộ trường snapshot, nhưng bộ phục hồi hiện tại chỉ thêm các collection được hỗ trợ. Extension/top-level lạ không tự phục hồi. Hộp thư dùng bộ phục hồi hiện hữu: tính lại fingerprint, không bảo đảm giữ mọi metadata tùy biến như updatedAt. Cloud inbox trên server không được khôi phục từ bản cục bộ này.
- Phục hồi vào kho đã có dữ liệu: ID khác nhưng mã đơn hoặc giao dịch nghi trùng bị chặn; không tự gộp/suy đoán. Chưa kiểm thử mọi biến thể backup cũ, file50MB, quota trình duyệt hoặc toàn bộ Excel native.

## Hướng dẫn chủ xưởng

1. Trên từng thiết bị có dữ liệu riêng: lưu đơn đang nhập, kiểm tra trạng thái đồng bộ và số dư. Khi cần backup trước xử lý xung đột, giữ bản riêng của từng thiết bị, không tự hợp nhất.
2. Vào **Dữ liệu → Nhập / Xuất dữ liệu → Sao lưu JSON + Excel độc lập**. Đặt tên khi tải từng file. Kiểm tra đủ JSON, XLSX và SHA256.json trong Tải xuống. Cho phép nhiều lượt tải nếu trình duyệt yêu cầu. Giữ nút JSON cũ cho trường hợp chỉ cần cứu bản JSON.
3. Mở Excel từ Tải xuống để đối chiếu. Giữ nguyên bản gốc không chỉnh sửa; nếu cần làm việc, tạo bản sao. Cất thêm một bản ở PC/USB/thư mục cá nhân bảo vệ tốt. Không gửi GitHub, Pages công khai hoặc kèm file kinh doanh vào báo cáo lỗi.
4. Kiểm tra hash ngoài app: PowerShell `Get-FileHash -Algorithm SHA256 <file>` hoặc Linux `sha256sum <file>`; so với SHA256.json. Tên file đổi ngoài app không làm đổi byte/hash.
5. Khi mất app/thiết bị: dùng app thử mới/cài lại ở môi trường kiểm soát. **Phục hồi dữ liệu** chọn JSON, xem trước counts/tổng/xung đột, xác nhận khi đã đối chiếu. Không nhập đè kho đang sử dụng. So lại số đơn, payment ID, phải thu/phải trả; nhập lại không được tăng số liệu.
6. Nếu JSON có hộp thư cục bộ: mở **Hộp thư báo giá → Thêm file báo giá JSON**, chọn chính JSON backup, xác nhận bổ sung. Mục đã có giữ nguyên, không tự tạo công nợ. Xác minh báo giá chờ bằng mắt.
7. Khi Cloudflare/app không truy cập được: Excel vẫn là file OOXML cục bộ để đọc/đối soát; JSON cần giữ tới khi có bản app tương thích để phục hồi. Không upload file vào công cụ chuyển đổi công khai. Khôi phục app không đồng nghĩa khôi phục D1 hoặc trạng thái xác thực/đồng bộ.

**Không phát hành production từ báo cáo này.** Giữ PR7 draft, chờ nghiệm thu thiết bị và quy trình D1 riêng.
