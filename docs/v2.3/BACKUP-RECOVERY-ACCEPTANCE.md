# V2.3 — Backup Independence & Disaster Recovery

Ngày22/11/2026, nhánh `feature/v2.3-sync-foundation`. Nguồn trước thay đổi: `20da1ee31969594f948fc354c79eadc83296088f`. Không thay UI-R4.2.1 ngoài thêm một thao tác trong Dữ liệu → Nhập / Xuất dữ liệu. Không thay IndexedDB/D1, Worker, giao thức, số dư hoặc lịch sử.

## Kết luận

**PASS kỹ thuật tự động cho phạm vi đã kiểm chứng:** cùng snapshot JSON/XLSX, checksum, phục hồi dữ liệu nghiệp vụ được liệt kê bên dưới vào kho giả mới sau khi xóa kho giả cũ, đọc workbook độc lập, không nhân đôi khi phục hồi lại. **CHƯA NGHIỆM THU toàn bộ disaster recovery/production:** chưa mở file bằng Microsoft Excel GUI/Android thật, chưa có dữ liệu lịch sử đời đầu và chưa diễn tập phục hồi D1. Không tuyên bố phục hồi toàn bộ mọi dữ liệu của thiết bị/dịch vụ.

## Cấu trúc bộ sao lưu (đã vá Android: một ZIP)

Thao tác **Sao lưu JSON + Excel độc lập** hiện tạo một ZIP, chứa `backup.json`, `backup.xlsx`, `SHA256.json`. Cả bộ lấy từ một bản chụp đã clone, không đọc lại state trong khi tạo các thành phần. Chỉ một hộp thoại đặt tên ZIP và một thao tác tải. Nguồn là `committed` của ứng dụng đang mở và hộp thư cục bộ tại lúc chụp. Không bao gồm bản nháp chưa lưu, outbox, thay đổi chưa nhận từ thiết bị khác hay toàn bộ tài khoản Cloudflare. Nếu hộp thư không đọc được, dừng và báo lỗi, không coi thiếu hộp thư là rỗng.

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

Thành phần `SHA256.json` bên trong ZIP chứa SHA-256 toàn byte JSON và XLSX, tên thành phần cố định trong ZIP, thời gian chung, schema/counts/totals và snapshot hash. Không nhúng checksum của XLSX vào chính XLSX: đây là tham chiếu vòng không thể dùng làm kiểm tra toàn byte. Hash JSON cũng được ghi trong sheet thông tin Excel.

Trước khi mở hộp thoại đặt tên, ZIP được đọc lại để kiểm tra EOCD/central/local header, tên/đủ3 thành phần, kích thước, CRC-32, SHA-256 JSON/XLSX, hash snapshot và cấu trúc/CRC của XLSX lồng. ZIP32 dạng STORE không cần CDN hoặc mạng. Nếu build Excel/ZIP hoặc xác minh lỗi, không gọi download và không tải file thiếu. Nếu hủy ZIP, báo chưa hoàn tất và không chuyển sang tải file rời. Không tự xóa file đã tải hoặc bản sao cũ. Trình duyệt chỉ chứng minh đã yêu cầu tải, không biết người dùng đã lưu thật lên ổ đĩa; thông báo yêu cầu kiểm tra ZIP tải xuống và giải nén đủ3 thành phần, không ghi nhận “đã lưu thành công” giả. Nút Sao lưu JSON cũ được giữ để dùng riêng, kể cả khi dữ liệu quá lớn để tạo Excel. Giới hạn Excel:32.767 ký tự/ô,1.048.576 dòng/sheet; nếu vượt phải báo lỗi, không cắt nội dung.

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
| Hủy ZIP, Excel/ZIP encoder lỗi | PASS tự động | Không báo hoàn tất; lỗi build/verify không yêu cầu tải file nào |
| Tên ZIP và checksum | PASS tự động | Tên ZIP được sửa/làm sạch; hash đúng bytes của thành phần bên trong |
| Hồi quy đồng bộ/công nợ/UI-R4.2.1 | PASS tự động |7 bộ npm test,3 bộ data-safety và5 debt audit chạy lại |
| Microsoft Excel GUI / Excel Android | CHƯA KIỂM THỬ | openpyxl không thay thế nghiệm thu ứng dụng Excel thực tế |
| Android/PWA tải ZIP thật, dung lượng lớn | CHƯA KIỂM THỬ | Cần chủ xưởng thử S24 Ultra; không đánh dấu bằng VM |
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
2. Vào **Dữ liệu → Nhập / Xuất dữ liệu → Sao lưu JSON + Excel độc lập**. Đặt tên ZIP một lần và bấm Tải file một lần. Trong Tải xuống, dùng My Files/Tệp của bạn trên Samsung hoặc công cụ ZIP để giải nén; kiểm tra `backup.json`, `backup.xlsx`, `SHA256.json`. Không cần cho phép3 lượt tải liên tiếp. Giữ nút JSON cũ cho trường hợp chỉ cần cứu bản JSON.
3. Mở `backup.xlsx` sau giải nén để đối chiếu. Giữ nguyên bản gốc không chỉnh sửa; nếu cần làm việc, tạo bản sao. Cất thêm một bản ở PC/USB/thư mục cá nhân bảo vệ tốt. Không gửi GitHub, Pages công khai hoặc kèm file kinh doanh vào báo cáo lỗi.
4. Kiểm tra hash ngoài app: PowerShell `Get-FileHash -Algorithm SHA256 <file>` hoặc Linux `sha256sum <file>`; so với SHA256.json. Tên file đổi ngoài app không làm đổi byte/hash.
5. Khi mất app/thiết bị: dùng app thử mới/cài lại ở môi trường kiểm soát. **Phục hồi dữ liệu** chọn JSON, xem trước counts/tổng/xung đột, xác nhận khi đã đối chiếu. Không nhập đè kho đang sử dụng. So lại số đơn, payment ID, phải thu/phải trả; nhập lại không được tăng số liệu.
6. Nếu JSON có hộp thư cục bộ: mở **Hộp thư báo giá → Thêm file báo giá JSON**, chọn chính JSON backup, xác nhận bổ sung. Mục đã có giữ nguyên, không tự tạo công nợ. Xác minh báo giá chờ bằng mắt.
7. Khi Cloudflare/app không truy cập được: Excel vẫn là file OOXML cục bộ để đọc/đối soát; JSON cần giữ tới khi có bản app tương thích để phục hồi. Không upload file vào công cụ chuyển đổi công khai. Khôi phục app không đồng nghĩa khôi phục D1 hoặc trạng thái xác thực/đồng bộ.

**Không phát hành production từ báo cáo này.** Giữ PR7 draft, chờ nghiệm thu thiết bị và quy trình D1 riêng.


## FIX ANDROID BACKUP DOWNLOAD — 22/11/2026

### Lỗi thực tế và sửa nguồn

Chủ xưởng xác nhận trên S24 Ultra cả Chrome/Zalo đều dừng sau JSON, báo Excel chưa được yêu cầu tải. **Luồng3file cũ: FAIL nghiệm thu Android.** Chưa có trace thiết bị để kết luận chính xác chính sách trình duyệt/user activation nào gây hủy; không coi kiểm thử VM trước đó là chứng cứ Android PASS.

Thay luồng ba download thành một ZIP đã build/verify hoàn chỉnh rồi mới gọi download. Giữ đúng một dialog đặt tên và một anchor click trong giao diện xuất file hiện hữu. Không sửa `exportData()` JSON riêng, JSONv2/backupIntegrity, báo cáo, công nợ hoặc sync. Thêm MIME application/zip và đổi SW asset cache để thiết bị lấy mã mới; không xóa IndexedDB/localStorage. File-tools vẫn chỉ xác nhận yêu cầu tải, không khẳng định Android đã lưu thành công.

Trong khi kiểm tra phát hiện manifest cũ đặt app trước spread metadata, bị app của snapshot ghi đè. Đã đổi thứ tự đặt trường định danh sau spread để manifest đúng `TungGiang-Backup-Checksums`. Chỉ thay manifest checksum, không đổi JSON nghiệp vụ.

### Bằng chứng sau vá

| Kiểm thử | Kết quả | Bằng chứng |
|---|---|---|
| Một snapshot,3 thành phần trong một ZIP | PASS tự động | JSON giải nén khớp committed snapshot, không thay state; JSON/XLSX có SHA và thời gian chung |
| CRC sai / ZIP cắt cụt / thiếu thành phần | PASS tự động | verify chặn trước download |
| CRC hợp lệ nhưng SHA trong manifest sai | PASS tự động | SHA-256 verification từ chối |
| XLSX encoder lỗi / XLSX sai cấu trúc | PASS tự động | Không gọi download, không xuất JSON rời hoặc ZIP thiếu |
| Một dialog + một lần tải | PASS DOM tự động | Dùng download/finishFileSave thật trong jsdom:1dialog,1anchor click, đuôiZIP/tên không hợp lệ được làm sạch, queue rỗng sau thao tác |
| Hủy ZIP | PASS tự động | Chỉ1request, không fallback file rời, không báo hoàn tất |
| JSON riêng | PASS tự động | Mở dialog JSON gốc, nội dung backup appv2, state giữ nguyên |
| Giải nén độc lập | PASS Python zipfile | testzip/CRC, đúng3file, checksum JSON/XLSX khớp |
| Excel từ ZIP không cần app/Cloudflare | PASS openpyxl | Đọc9sheet, số đơn/payment và số dư phải thu/phải trả khớp manifest |
| Phục hồi JSON / ID / nhóm thanh toán | PASS tự động hồi quy | Fresh app sau xóa kho giả, không duplicate hoặc ghi đè |
| S24 Ultra Chrome/Zalo sau vá | CHƯA KIỂM THỬ vật lý | Cần chủ xưởng tải ZIP, giải nén và mở Excel thật; không thay bằng DOM |
| Microsoft Excel GUI / Android Excel | CHƯA KIỂM THỬ | openpyxl chỉ chứng minh định dạng đọc độc lập, không phải nghiệm thu native |

Evidence mới: `evidence/android-backup-zip.json`, `android-backup-zip-tests.log`, logs hồi quy cùng prefix. Script `sync/tests/backup-zip-check.py` giải nén chỉ dữ liệu giả trong thư mục tạm ngoài repo. Không commit ZIP/JSON/XLSX kinh doanh.

### Chủ xưởng thử lại

1. Mở đúng staging, nhận bản cập nhật PWA hoặc tải lại trang. Không xóa dữ liệu website/ứng dụng để làm mới.
2. Chọn Sao lưu JSON + Excel độc lập, đặt tênZIP, bấm Tải file một lần. Kiểm tra trong My Files → Downloads.
3. Giải nén ZIP, mở backup.xlsx; kiểm tra KH/NCC/đơn/thanh toán/tổng nợ. Giữ nguyên backup.json và SHA256.json.
4. Nếu Zalo chặn tải blob, mở cùng staging bằng Chrome để thử và ghi rõ trình duyệt/thông báo. Đây là giới hạn chưa kiểm chứng, không tự coi Chrome đã PASS.
5. Phục hồi dùng JSON đã giải nén qua luồng xem trước/xác nhận cũ; không chọn ZIP trực tiếp trong Phục hồi dữ liệu. Không restore thử lên kho thật.

**Kết luận: PASS kỹ thuật ZIP và hồi quy, CHƯA NGHIỆM THU Android vật lý sau vá.** Chỉ staging, PR7 draft; không merge main/production. Các giới hạn D1, outbox, dữ liệu lịch sử và Microsoft Excel ở báo cáo trước vẫn giữ nguyên.
