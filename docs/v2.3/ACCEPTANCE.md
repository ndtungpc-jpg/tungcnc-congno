# v2.3 — Báo cáo nghiệm thu staging
Cập nhật: 22/11/2026 (Việt Nam).

Trạng thái: Đã triển khai bản kỹ thuật để tiếp tục nghiệm thu; CHƯA nghiệm thu production. PR #7 giữ draft. Không merge main. Chỉ dùng dữ liệu giả trên staging.

## Mã nguồn và triển khai
- Bản nền trước đợt này: c21f51a53243cc73c5c4d0668f9cbf1a3b61d94d.
- Commit tính năng: 44ff8ad68a9440933b3a29c78b8632819116e753. Commit bổ sung cảnh báo/nghiệm thu xem lịch sử file/PR.
- Kế thừa PR #6, giữ các commit audit đồng thời; không force push.
- Worker và D1 đồng bộ riêng: tungcnc-sync-v23-staging. Không dùng bảng hộp thư báo giá.
- Pages A: https://feature-v2-3-sync-foundation.tungcnc-congno.pages.dev/
- Pages B: https://v23-b-tungcnc.pages.dev/
- Pages C: https://v23-c-tungcnc.pages.dev/
- Báo Giá Nhanh preview: https://feature-v2-3-sync-foundation.baogia-tungcnc.pages.dev/
- Hai production giữ SHA e4d6d39b7110f5fc44302aaaac3d26b42cc5f09f (Công Nợ) và ec021150698753f66e80f59ae2b0ae7bdab45f23 (Báo Giá Nhanh).

## Thay đổi đợt này
- Kho đã có dữ liệu phải đối chiếu/xác nhận trước lần gửi đầu; lưu bản phục hồi trước bật đồng bộ.
- Snapshot máy chủ được ký/xác thực; xem trước chỉ đọc, so sánh từng ID, phân trang 40 khác biệt.
- Cùng ID khác nội dung phải chọn Thiết bị/Máy chủ; không chọn theo thời gian. ID khác vẫn riêng biệt.
- Cảnh báo tên/SĐT/mã đơn/thanh toán nghi trùng; yêu cầu xác nhận đã đối chiếu. Không tự gộp.
- Trước áp dụng: kiểm tra lại cả dữ liệu cục bộ và snapshot máy chủ, liên kết và số dư. Nếu đã đổi hoặc kết quả không hợp lệ thì chặn.
- Lưu bản phục hồi gồm dữ liệu, queue và xung đột trước khi thay lựa chọn; ghi main/metadata/queue nguyên tử.
- Tiếp nhận chỉ thêm mới được chia đợt theo thứ tự đối tác → đơn → nhóm thanh toán → dữ liệu phụ; không tách nhóm thanh toán. Sửa/xóa liên quan giữ một transaction, quá lớn thì chặn.
- Lưu từng mẫu nhắc nợ độc lập, chuyển nội dung cá nhân hóa về biến trước xác nhận; khôi phục riêng mẫu gốc; đồng bộ qua reminderTemplates, không thay schema IndexedDB.
- Các tệp chính: sync/reconcile.js, sync/core.js, sync/engine.js, sync/client.js, sync/worker.js, sync/tests/sync.cjs, fixture giả lập, reminder-defaults.js, smart-reminders.js, restore-safe.js, index.html, sw.js và tài liệu.

## Bảng kiểm thử
PASS tự động nghĩa là đã chạy mã thật trong Node/VM, Worker handler, SQLite và fake IndexedDB; KHÔNG có nghĩa đã kiểm thử Android.

| Nội dung | Kết quả | Bằng chứng/phạm vi |
|---|---|---|
| Đơn A → B/C, thanh toán B → A/C | PASS | Chrome ba origin độc lập ở bản nền; kiểm thử tự động chạy lại ở bản mới |
| Kho đã có dữ liệu: bật không tự gửi, xem trước không ghi | PASS | Tự động, dữ liệu giả theo schema cũ |
| Đối chiếu NCC, phiếu nhập và thanh toán cũ | PASS | 900.000 giá trị, 300.000 đã trả, 600.000 phải trả giữ đúng |
| Xung đột tiền, chưa chọn bản thì chặn | PASS | Tự động; giữ cả hai bản và queue trong bản phục hồi |
| Lỗi transaction hoặc snapshot đổi sau xem trước | PASS | Tự động; dữ liệu hiện tại không bị ghi dở |
| 2.100 bản ghi tiếp nhận theo đợt | PASS | Tự động; mỗi trạng thái trung gian hợp lệ |
| Offline, khởi động lại engine, mất ACK, gửi lặp | PASS | Tự động, queue bền vững và không trùng |
| Báo giá trùng trên hai thiết bị | PASS | Chỉ một đơn được máy chủ chấp nhận; bản cục bộ bị từ chối giữ để đối chiếu |
| Báo Giá Nhanh → xem trước → xác nhận → đồng bộ | PASS tự động từng phần + fixture nối chuỗi | Exporter/receiver thực chạy VM; fixture đơn được chấp nhận đồng bộ B/C đủ 2 hạng mục, vật liệu, kích thước và tổng 4.301.000; chưa phải luồng live Cloudflare hoàn chỉnh |
| Lưu/reset mẫu nhắc nợ và biến tự động | PASS | Tự động, từng mẫu riêng, số dư và mẫu khác giữ nguyên |
| Thanh toán nghi trùng khác ID | PASS | Chặn tiếp nhận nếu chưa xác nhận đối chiếu; loại bản nghi trùng phải chọn rõ, bản gốc vẫn trong backup |
| Chữ ký, phát lại request, thu hồi thiết bị | PASS | Tự động; thu hồi chặn gửi, local/queue giữ nguyên |
| Phục hồi vào kho thử nghiệm riêng | PASS | Tự động, bản ghi và số dư khớp |
| Nhập nhanh/chi tiết, sửa kích thước, lịch sử thanh toán | PASS | Hồi quy VM mã hiện tại, không phải thiết bị vật lý |
| PDF/PNG/Excel chi tiết, sao lưu/phục hồi thêm thiếu | PASS phạm vi hồi quy | Mã hiện tại; chưa kiểm thử mọi biến thể Excel và chia sẻ file Android |
| Kiểm tra toàn vẹn chỉ đọc | PASS | 5 bài audit + hồi quy giao diện giả lập |
| Giao diện đối chiếu mới trên Chrome | CHƯA KIỂM THỬ | Công cụ quan sát trình duyệt bị xét duyệt tự động chặn do hạn mức; không dùng đường vòng |
| Android/PWA thật, khóa màn hình, chuyển ứng dụng | CHƯA KIỂM THỬ | Không có thiết bị vật lý kết nối |
| Sao lưu thực tế từ những phiên bản đầu | CHƯA KIỂM THỬ | Chưa có bản ẩn thông tin; dữ liệu giả không thay thế bằng chứng này |
| Liên thông live Cloudflare toàn chuỗi ở bản mới | CHƯA KIỂM THỬ | Kiểm thử tự động không thay thế live end-to-end |

## Đối soát và an toàn
Bộ đồng bộ tự động: 22 transaction được máy chủ chấp nhận, số receipt/log khớp sequence. Mọi bộ dữ liệu đều giả lập. Kiểm tra số dư từng đơn/khách, phải trả NCC và ngày thu cũ; khoản tháng trước không tính vào thu tháng hiện tại ở hồi quy dashboard. Nhập lại/retry không tạo thêm khoản thu.

Schema IndexedDB vẫn version 1, store state, main giữ nguyên; bổ sung metadata key tg-sync-v23. Không truy cập dữ liệu business production, không reset IndexedDB/localStorage, không tự chuyển đổi hay ghi đè lịch sử. Private key không xuất trong business JSON. Dữ liệu trên Cloudflare không được mã hóa đầu cuối; file backup JSON đọc được bởi người có file.

## Tái chạy
Node 24+, cài dependencies trong sync/package.json:
- node sync/tests/sync.cjs
- node --test docs/v2.3/debt-integrity-audit.test.mjs
Bộ hồi quy VM của workspace cũng đã chạy lại cho exporter/receiver/inbox, phân bổ thu tiền, báo cáo, phục hồi, dashboard và đơn chi tiết; không coi đây là kiểm thử trình duyệt thật.

## Rủi ro và quyết định trước production
- CAO: chưa nghiệm thu UI đối chiếu trên trình duyệt và Android/PWA thật; chưa có dữ liệu lịch sử đã ẩn thông tin.
- TRUNG BÌNH: backup/nonce/operation log chưa có chính sách lưu trữ lâu dài; bản phục hồi trên máy có thể tăng dung lượng. Không tự xóa backup/receipt để tiết kiệm.
- TRUNG BÌNH: mỗi lần sửa/xóa tài chính liên quan quá 2.000 thay đổi hoặc 900 KB sẽ chặn; không chia nhỏ tùy tiện. Kho Cloud staging giới hạn 5 MB.
- TRUNG BÌNH: duyệt thiết bị còn qua Cloudflare D1, không có wizard đăng nhập cá nhân; phải đối chiếu đúng mã. Các thiết bị staging được duyệt dùng chung một không gian thử nghiệm.
- TRUNG BÌNH: rủi ro XSS cùng origin và người có quyền vào thiết bị/file backup; nonextractable key không ngăn mã độc gọi ký trong trình duyệt đang bị xâm nhập.
- THẤP: chọn loại bỏ bản ghi khỏi kho hoạt động có thể cần phục hồi thủ công; luôn giữ backup trước thao tác, không tự đảo ngược giao dịch đã lan sang máy khác.

Chưa có bằng chứng mất dữ liệu trong kiểm thử tự động đã chạy. Điều này KHÔNG chứng minh tương thích hoàn toàn hoặc an toàn tuyệt đối. Chưa phát hành production.

## Bổ sung: nhắc nợ 24 giờ (22/11/2026)
- Nhãn Đã xuất nhắc nợ theo khách, tính 24 giờ trượt từ lần xuất gần nhất; hiển thị tại danh sách khách, trung tâm nhắc nợ và hồ sơ. Hết hạn ẩn nhãn khi render hoặc nhịp cập nhật tối đa 60 giây, lịch sử giữ nguyên.
- Ghi sự kiện khi clipboard thành công, share sheet tiếp nhận nội dung, hoặc trình duyệt được yêu cầu tải PNG sau xác nhận tên file. Không biết file đã lưu thật/khách đã nhận.
- Hủy chia sẻ/tải file, lỗi clipboard: không ghi Đã xuất. Lỗi lưu lịch sử sau xuất phải báo rõ, không suy ra chưa xuất nội dung.
- Cảnh báo dùng chung theo khách cho copy/share/PNG, có quyền tiếp tục. Nếu đồng bộ đã bật, đọc snapshot đã xác thực để kiểm tra sự kiện máy khác kể cả khi đang mở biểu mẫu.
- Đã gửi khách chỉ là xác nhận thủ công, lưu sự kiện riêng tham chiếu lần xuất; không tự suy ra từ share API.
- reminderEvents được sao lưu/phục hồi thêm thiếu và đồng bộ như bản ghi riêng, không sửa số dư hay giao dịch. Không đổi schema IndexedDB.
- PASS: node sync/tests/reminder-history.cjs — biên đúng 24 giờ, lịch sử còn, tách khách, cảnh báo và cho vượt, xuất hủy/lỗi không đánh dấu, xác nhận gửi riêng, kiểm tra lịch sử máy khác, dữ liệu kế toán nguyên vẹn.
- PASS: sync/tests/sync.cjs — hai loại sự kiện lan A/B/C, tổng công nợ không đổi. Bộ kiểm thử hiện đối soát 24 transaction.
- CHƯA KIỂM THỬ: UI mới trên thiết bị Android/PWA thật. Mất mạng/hai máy xuất đồng thời trước khi sự kiện được gửi không thể bảo đảm cảnh báo tức thời; không có khóa chặn gửi, đúng yêu cầu không chặn tuyệt đối.

## Sửa 4 lỗi Android do chủ xưởng nghiệm thu — android-r2
Bản trước 9574fb7 không đạt nghiệm thu Android ở bốn điểm dưới đây. Không dùng kết quả tự động trước đó để phủ nhận lỗi thực tế.

| Lỗi | Nguyên nhân | Thay đổi | Bằng chứng hiện có / chưa kiểm chứng |
|---|---|---|---|
| Nhãn nhỏ, chìm | Dùng small/hint chung, màu theme không bảo đảm tương phản | Component reminder-badge: nền xanh đậm, viền vàng, chữ trắng/vàng nhạt 15–16px, thời gian gần nhất | Kiểm tra mã/DOM; chưa xác nhận thị giác trên S24 Ultra |
| Nhãn thiếu tùy đường mở | Chỉ chèn HTML riêng ở customers và debt-center | Một renderer chung chạy sau render và search, bổ sung mọi customer-link; chi tiết khách cùng nguồn reminderEvents | Tự động DOM mã thật: customers, collections, overdue, debt-center, search, profile; chưa nghiệm thu thiết bị |
| Cảnh báo không rõ / bỏ sót luồng ảnh | native confirm không đặt được nhãn nút; ảnh thống kê gọi nhánh cũ không qua gate | Hộp alertdialog riêng, thời gian gần nhất, Hủy / Vẫn nhắc lại, Escape/focus; chung gate cho copy, share, PNG đối chiếu, PNG thống kê, PNG đính kèm | Tự động DOM chứng minh Hủy không gọi API xuất, nhắc lại cho phép; chưa xác nhận bảng chia sẻ Android |
| Hai nút nổi che thao tác | sync/client và inbox-receiver tự append button fixed vào body, độc lập điều hướng | Bỏ append body/fixed; giữ nguyên controller/auth, gắn nút vào container normal-flow trong Thêm, tháo khỏi DOM khi rời Thêm | Tự động DOM kiểm tra chuyển màn hình/mount lại và mã nguồn không fixed; modal xung đột và viewport Android thật chưa kiểm chứng |

Thay đổi vị trí launcher không thay engine, queue, protocol, schema hoặc phép tính công nợ. Chỉ thêm loại sự kiện orders-png cho ảnh thống kê, dùng cùng lịch sử theo khách. Tăng SW cache và version staging thành 2.3.0-staging-android-r2 để nhận diện bản mới.

Kiểm thử: node sync/tests/android-reminder-ui.cjs (jsdom 26.1.0, chỉ DOM tự động, không layout thật); node sync/tests/reminder-history.cjs; node sync/tests/sync.cjs. Không tuyên bố bốn lỗi đã PASS nghiệm thu vật lý cho tới khi chủ xưởng thử lại trên S24 Ultra.

### Bằng chứng Chromium trực tiếp sau triển khai android-r2
- Đã mở staging A trên Chromium thật, tải lại/cập nhật giao diện. Nút Đồng bộ và Hộp thư Cloud không còn ở body overlay; trong Thêm, computed position của cả hai là static và parent là cloudToolsMenu.
- Đã sao chép một tin nhắc cho KH giả lập đồng bộ v2.3; dư nợ trước/sau vẫn 5.000.000. Chỉ thêm sự kiện nhắc nợ, không tạo/sửa đơn hoặc khoản thu.
- Đã quan sát nhãn ở chi tiết, danh sách Khách hàng, tìm kiếm “giả lập” và danh sách khách còn nợ mở từ Tổng phải thu. Computed font 15px, nền rgb(23,59,80), chữ rgb(255,243,196); nhãn có thời gian gần nhất.
- Đã mở cảnh báo thật khi bấm Sao chép lần hai; Hủy / Vẫn nhắc lại hiển thị, focus mặc định Hủy. Đã bấm Hủy.
- Đã mở cảnh báo thật trước PNG Bảng đối chiếu công nợ và PNG Bảng thống kê đơn hàng; Hủy quay về báo cáo, chưa mở bước đặt tên/tải file.
- Đã mở modal Đồng bộ, các thao tác còn hiển thị và không có launcher nổi che. Chưa tạo thêm xung đột tiền mới chỉ để kiểm tra giao diện.
- Có lỗi CAS tạm thời “Dữ liệu/đồng bộ đã thay đổi; thử lại”, queue 0. Bấm Thử đồng bộ lại đưa về Đã đồng bộ; không sửa engine để che lỗi.
- Mô phỏng Android qua DevTools bị chính sách môi trường chặn (“DevTools not allowed on this page”). Không tìm cách vượt chính sách. Viewport Android, keyboard/share sheet và modal xung đột trên S24 Ultra: CHƯA KIỂM CHỨNG.
- Kết quả desktop không thay thế nghiệm thu Android của chủ xưởng. Các luồng overdue có khách được đánh dấu, share/attachment và thao tác Vẫn nhắc lại đã kiểm tra bằng DOM tự động; chưa chạy đầy đủ tất cả các trường hợp này trên trình duyệt thật trong đợt này.

## Tổng quan / nhãn gọn / trạng thái header — dashboard-r3
- Header đồng bộ là nút normal-flow, dùng callback onStatus và metadata/outbox thật của engine; có chữ, tooltip, aria-label và số thao tác. Offline chỉ đổi cách hiển thị; không sửa protocol hoặc queue. Quản lý thiết bị/Hộp thư Cloud vẫn tại Thêm.
- Đơn hàng gần đây: 5 đơn khách, sắp theo updatedAt/createdAt và nhật ký orders thực (create/update/cancel/restore). Không dùng thời gian nhận sync/reload; không dùng nhật ký payments để đẩy đơn lên. Tiền còn nợ vẫn dùng balance hiện có, đơn hủy hiển thị 0 và dấu Đã hủy.
- Dữ liệu cũ chỉ có created dạng ngày: dùng ngày để xếp, ghi rõ chưa có giờ; không bổ sung hay ghi đè thời gian gốc. Trường hợp không có mốc nào ghi Chưa có thời gian cập nhật. Bốn ô công nợ giữ nguyên.
- Nhãn gọn Đã nhắc · HH:mm, chạm mở lịch sử đầy đủ/đã gửi; cảnh báo 24h không đổi. Bảng có danh sách khách chuyển dạng thẻ ở <=650px, số tiền không cắt bằng ellipsis.
- Báo giá chờ vẫn có chuông/Hộp thư; khách quá hạn chuyển vào Thêm → Khách quá hạn.
- PASS TỰ ĐỘNG: dashboard-ui.cjs kiểm tra top5/tạo/sửa, ngày tạo giữ nguyên, thanh toán không đổi thứ tự, mốc fallback không làm đổi nguồn, các trạng thái header (synced/busy/offline/queue/conflict). android-reminder-ui.cjs kiểm tra 4 ô, thẻ gần đây/mở chi tiết, nhãn/route/modal và menu. Các kết quả này chưa thay thế S24 Ultra.
- Chưa có nghiệm thu Android/PWA vật lý cho r3; kết quả trình duyệt/viewport sẽ bổ sung sau kiểm tra trực tiếp.

### Trình duyệt Edge kết nối / viewport r3
- Có viewport capability được hỗ trợ; không dùng DevTools bị chặn ở môi trường cũ.
- Đã kiểm tra chỉ đọc trên dữ liệu sẵn có: viewport 412×915 hiển thị 5 đơn, bốn ô thống kê, ô tổng tiền dài không tràn; chạm đơn mở modal chi tiết.
- Phát hiện thật: danh sách thẻ vẫn kế thừa min-width 610px của table cũ, gây tràn trang ở 412/360 dù từng số tiền không tràn. Đã sửa min-width:0 riêng bảng thẻ mobile. Không coi DOM test trước đó là bằng chứng layout đạt.
- Không tạo/sửa/thu thử trên dữ liệu sẵn có của trình duyệt; các tình huống này dùng dữ liệu giả tự động. Online/offline/queue/busy/conflict của renderer đã kiểm tra tự động, chưa kích hoạt đồng bộ hoặc đổi mạng của thiết bị người dùng để thử.

### Đo lại sau sửa CSS mobile
- Edge extension, viewport 360×800: table min-width computed 0px; document scrollWidth <= clientWidth; không có ô tiền trong danh sách thẻ bị tràn.
- Edge extension, viewport 412×915: không tràn trang/ô tiền; Tổng quan có đúng 4 ô và 5 đơn; header không tràn. Chạm đơn đã mở modal chi tiết.
- Mục Thêm vẫn có Hộp thư Cloud, quản lý đồng bộ và Khách quá hạn; vị trí các nút computed static.
- Kho trình duyệt hiện chưa bật đồng bộ: chỉ kiểm chứng trực tiếp trạng thái Chưa kết nối. Không cấp quyền thiết bị mới hoặc đổi mạng của máy chủ xưởng để tạo trạng thái giả. Các trạng thái khác mới đạt test tự động.
- Không có nhãn còn hiệu lực trong kho trình duyệt này nên hành vi chạm nhãn r3 chưa kiểm chứng trực tiếp; DOM test và test 24h giữ nguyên cơ chế cảnh báo. Không tự tạo sự kiện trên dữ liệu thật chỉ để lấy ảnh.
- Chưa kiểm thử phần cứng S24 Ultra, cài PWA, khóa màn hình/chuyển ứng dụng và share sheet trong đợt này. Không đánh dấu PASS vật lý.

## UI-R4 — theo hình 19041.png đã duyệt
- Lớp hiển thị mới ui-r4.js/css: tông than chì, 4 ô thống kê có màu/icon tương ứng, header đồng bộ nhỏ không có khung lớn; không đổi trạng thái engine.
- Chuẩn hóa Khách hàng, Nhà cung cấp, Đơn hàng, Khách còn nợ, Công nợ NCC, Trung tâm nhắc nợ và Quá hạn thành hàng gọn. Menu từng dòng giữ sửa/xóa/nhân bản/thu-chi/xuất. Chạm nội dung mở chi tiết.
- Tìm kiếm không dấu, 8 cách sắp xếp, 3 bộ lọc kết hợp, xóa bộ lọc; lựa chọn chỉ ở bộ nhớ giao diện, không sửa bản ghi/localStorage.
- Hai tab Nhắc nợ: Tất cả còn nợ / Quá hạn, dùng nguyên due() và balance(). Gỡ liên kết quá hạn khỏi nhóm Đồng bộ/Hộp thư Cloud.
- PASS tự động: ui-r4.cjs (1.200 dòng, 8 sắp xếp, tổ hợp bộ lọc/tìm kiếm, không mutate); ui-r4-dom.cjs (7 màn hình, giữ hành động, tab, reset, 4 ô/top5, không đổi state).
- Chạy lại sync.cjs: 24 transaction đối soát; audit 5/5; các bài nhắc nợ/cảnh báo được giữ.
- docs/v2.3/ui-r4-readonly.html là trang QA với dữ liệu giả chỉ trong RAM, không gọi init IndexedDB/Worker, commit/save bị chặn. Không phải dữ liệu thật hay seed của ứng dụng. Dùng để kiểm tra hình ảnh/danh sách, không dùng nghiệm thu lưu/sync.
- Chưa nghiệm thu S24 Ultra vật lý. Bằng chứng trình duyệt và ảnh sau triển khai được cập nhật riêng khi thực hiện.

### UI-R4 — bằng chứng staging ngày 22/11/2026
- Commit giao diện 4deaeb99bc5022195046bab4fc59b2f40c457ba1; sửa đường dẫn trang QA ở 760c00ccfcfb8c20900099d96f4de0ca6d7d64ae. Chính sách base-uri chặn thẻ base: trang QA chuyển sang đường dẫn tài nguyên tuyệt đối, không nới CSP.
- Cloudflare Preview đã success: https://d95057ef.tungcnc-congno.pages.dev/ . Trang chụp kiểm thử https://d95057ef.tungcnc-congno.pages.dev/docs/v2.3/ui-r4-readonly (dữ liệu giả RAM; không lưu/sync).
- PASS TRÌNH DUYỆT DESKTOP: Tổng quan 4 ô/top5; danh sách khách 4 bản ghi; sắp xếp công nợ cao-thấp; lọc quá hạn còn 3; kết hợp tìm không dấu `dung` còn 1; Xóa bộ lọc trả 4. Nhắc nợ Tất cả (4) / Quá hạn (3) chuyển đúng. Số tiền 995.304.321đ và tên dài hiển thị trên desktop; có ảnh Tổng quan và tab Quá hạn sau triển khai.
- npm test chạy lại toàn bộ 6 bộ: sync (24 atomic commits), reminder-history, android-reminder-ui, dashboard-ui, ui-r4 (1200 dòng), ui-r4-dom đều PASS tự động. Không coi DOM test là nghiệm thu thiết bị.
- CHƯA KIỂM THỬ trong UI-R4: viewport render thực 360px/412px (công cụ viewport hiện không khả dụng), Samsung S24 Ultra vật lý, PWA offline/update/share sheet; trạng thái engine online/busy/queue/conflict qua mạng thật. Các trạng thái renderer/engine đạt tự động, browser QA chỉ hiển thị Chưa kết nối đúng thực tế.
- CHƯA XÁC MINH toàn bộ dữ liệu lịch sử từ phiên bản đầu bằng bản sao của chủ xưởng. Không truy cập/sửa dữ liệu kinh doanh thật để chụp ảnh. Không thay đổi schema, API đồng bộ, Worker hoặc D1. Chưa đủ bằng chứng để coi UI-R4 đã nghiệm thu Android hoàn toàn.
- PR #7 giữ draft; không merge main/production. Cần chủ xưởng nghiệm thu lại Android trước phát hành.


## UI-R4.1 — tinh chỉnh theo hình đã duyệt 22/11/2026
- Nguồn f65d8b6, commit giao diện 9fcfcb651e0cedfd48c4ce39506f900d5d65cb2e. Không thay engine/API/Worker/D1/schema/công thức.
- Nguyên nhân chiều cao UI-R4: media <=400px ép nhãn sang dòng riêng và tiền đơn hàng sang dòng mới; đã bỏ. Partner row giữ ba cột nội dung/nhãn/menu, avatar 30px, dòng phụ số đơn + số tiền, bỏ điện thoại khỏi dòng thứ ba (vẫn tìm theo điện thoại và mở hồ sơ đầy đủ). Tên dài giới hạn 2 dòng, có title và chi tiết; số tiền không ellipsis. Vùng mở/menu 46px.
- Đơn gần đây vẫn 5 theo helper gốc; thẻ 66px thay vì khoảng 80px cũ, khoảng cách 0; nhãn nhỏ. Tiền bên phải, không đổi thời gian/số dư. Bốn thống kê/header/filter/tab/màu giữ nguyên.
- Đối chiếu mẫu: cùng bố cục tên + số đơn/tiền bên trái, pill bên phải, menu cuối hàng; recent order icon/tên/khách-giờ/nhãn bên trái, giá trị/còn nợ bên phải. Không sao chép tên/số liệu mẫu. Khác biệt có chủ ý: tên rất dài được xuống tối đa 2 dòng để bảo vệ thông tin; desktop vẫn dùng khung rộng và 4 thống kê ngang, mobile giữ 2x2.
- PASS tự động: npm test toàn bộ 6 bộ (sync 24 atomic commits, reminder-history, android-reminder-ui, dashboard-ui, ui-r4 1200 dòng, ui-r4-dom 7 route); audit 5/5. Không sửa state trong các thao tác hiển thị. Lịch sử nhắc/24h/sent được kiểm thử hồi quy.
- PASS trình duyệt Chromium staging với dữ liệu giả RAM ở /docs/v2.3/ui-r4-readonly: tìm không dấu `khach kiem thu an` + lọc Đã nhắc + sort công nợ thấp-cao => 1/4; xóa bộ lọc, chuyển Quá hạn =>3; nhãn mở đúng lịch sử và nút xác nhận đã gửi (không bấm ghi); Tổng quan 4 ô/5 đơn. Chụp Tổng quan/Nhắc nợ/Quá hạn sau triển khai.
- Đo responsive qua zoom UI Chromium: innerWidth 340 (clientWidth337), partner rows 60–63.1px, recent rows66.55px, document không tràn; các ô tiền thử nghiệm clientWidth=scrollWidth (tới 990.854.321đ/995.304.321đ). innerWidth454 (client449), partner rows60–65.6px, nhãn nằm cùng hàng và không tràn. Đây là browser zoom mô phỏng, không thiết bị Android. Đã trả zoom về100%.
- CHƯA KIỂM THỬ chính xác viewport360/412; môi trường hiện không có API viewport và thao tác resize hệ thống không thay đổi cửa sổ. Không đánh dấu thay thế bằng340/454. S24 Ultra vật lý/PWA/share sheet và toàn bộ dữ liệu lịch sử thật chưa nghiệm thu. Ảnh bàn giao là desktop QA, không phải ảnh Android vật lý.
- Không ghi dữ liệu thật/không phát sinh giao dịch hoặc sự kiện nhắc nợ. Không tuyên bố dữ liệu lịch sử tương thích hoàn toàn. PR7 giữ draft, main/production không đổi. Cần chủ xưởng nghiệm thu mobile trước phát hành.

## UI-R4.2 — Thu/Chi và báo cáo PNG, 22/11/2026
- Nguồn 3ecd0a8; triển khai UI 23e544f, sửa nhóm thanh toán báo cáo ea5662b. Không thay đổi schema/IndexedDB/D1/Worker/giao thức sync hoặc công thức số dư. PR7 draft, main/production giữ nguyên.
- Thu/Chi: một thẻ cho nhóm có bằng chứng từ paymentGroups(), giữ giao dịch cũ thiếu bằng chứng riêng; menu vẫn dùng formPayment/removePayment gốc. Tìm không dấu + lọc Thu/Chi, tháng thực tế, hình thức; sort ngày/giá trị/tên; xóa lọc. Không ghi lại lịch sử để hiển thị.
- Hai báo cáo dùng chung cột Ngày / Nội dung-Hạng mục / Khối lượng-ĐVT / Đơn giá / Thành tiền cho PNG, Excel, PDF. Đơn chi tiết có tiêu đề cha, hạng mục/vật liệu/kích thước và dòng tổng đơn phân cấp; tổng kết chỉ dùng amount đơn gốc, không cộng các dòng hiển thị. Thiếu số liệu đơn giá/khối lượng ghi dấu gạch, không suy đoán. Thanh toán dùng nhóm liên kết đã chứng minh, tổng không đổi.
- Trình xem ảnh riêng: PNG blob được cache theo chính snapshot báo cáo/ngày, cùng blob cho img/File tải/share; không render HTML giả thay cho PNG. Nút zoom, fit, kéo chuột, Pointer Events hai ngón; tên file chỉnh được và cleanExportName gốc. Có kiểm tra lại snapshot ngay trước output sau hộp thoại 24h; stale data chặn xuất; không đánh dấu xuất lúc xem trước. Dùng runReminderExport (cùng perform gốc) để giữ 24h/ghi lịch sử sau output, không tự gửi.
- PASS tự động: npm test 7 bộ gồm sync24 commits, reminder-history, android-reminder-ui, dashboard-ui, ui-r4, ui-r4-dom, ui-r42. ui-r42 dùng canvas thật tạo PNG, kiểm tra cùng blob/cache, đổi dữ liệu tạo lại, Khối lượng/ĐVT + Đơn giá, phân cấp đơn/hạng mục và tổng đơn4.301.000 không cộng trùng, lọc Thu/Chi không mutate state. Audit công nợ5/5.
- PASS trình duyệt Chromium trên trang QA chỉ RAM: Thu/Chi2 thẻ từ3 phân bổ; lọc Tháng này còn1 thẻ300.000 (khoản150.000 tháng10 bị loại); tìm binh ra giao dịch cũ. Chọn riêng hai báo cáo, PNG có đầy đủ cột, vật liệu/kích thước; nhấn zoom125%, kéo => translate60px45px/scale1.25; Fit trả100%.
- Đối soát QA khách An: tổng đơn10.850.000, thu300.000, còn10.550.000; hai phân bổ100.000/200.000 cùng mã nhóm thành1 dòng300.000 trong báo cáo. Chưa chạm dữ liệu thật. Nhấn tải có cảnh báo24h, Hủy không tải; Vẫn nhắc lại mở đặt tên, tải file PNG thực2000x1452; SHA25639c6078cb647b86805e14ce149decc687b52dc51e654536f22bfc84d70f617a0. QA commit bị chặn theo thiết kế, thông báo không ghi được dấu nhắc xuất hiện; dữ liệu giả được trả về snapshot. Đây không phải nghiệm thu lưu lịch sử production.
- Responsive mô phỏng Chromium zoom: Thu/Chi width340/client337 không tràn (scroll337), thẻ95–97px, tiền clientWidth=scrollWidth85px. Viewer width454x312 không tràn ngang, vùng ảnh55px (chiều cao viewport thấp do zoom), footer còn trong màn hình. Đã trả zoom100%. Ảnh bàn giao desktop có dữ liệu giả rõ ràng, không phải S24 Ultra vật lý.
- CHƯA KIỂM THỬ: exact360/412 viewport, pinch hai ngón Android vật lý, share sheet/Zalo/SMS, PDF nhiều trang và Excel mở trên Android sau thay cột, dữ liệu lịch sử từ phiên bản đầu/ảnh rất dài thực tế. PNG cao>30000px vẫn từ chối rõ ràng, hướng sangPDF/Excel. Không coi mô phỏng/DOM là nghiệm thu Android. Không production release.

## UI-R4.2.1 — căn lề báo cáo, 22/11/2026
- Căn phải cả tiêu đề/giá trị Khối lượng/ĐVT, Đơn giá, Thành tiền và Số tiền thanh toán trên PNG/PDF/Excel. Ngày và Nội dung vẫn trái. Mép phải tổng kết dùng đúng inset của cột tiền bảng (PNG14px, PDF1mm); không thay công thức/số liệu/nhóm thanh toán.
- PNG/PDF cột số không chia chuỗi thành nhiều dòng; thu nhỏ font theo độ rộng ô nếu cần, không cắt chữ số. Nội dung dài vẫn xuống dòng và PDF tiếp tục phân trang. XLSX chỉ ô được chỉ định rightCells dùng alignment right, wrapText0, shrinkToFit1; tác dụng mặc định exporter khác không đổi.
- PASS tự động npm test7 bộ; target ui-r42 chạy lại sau sửa inset. Canvas thật ghi nhận3,5 m² và1.000.000đ textAlign right; ngày left, không mutate dữ liệu. Tạo PNG, PDF và XLSX thật ở kho test.
- Kiểm tra XLSX ZIP/XML thực: style8 căn phải/no-wrap/shrinkToFit, các ô cột số/header và tổng kết được đánh dấu đúng. Giá trị tiền xuất giữ nguyên dạng chuỗi đã định dạng hiện có; không chuyển đổi dữ liệu kế toán.
- PDF thực kiểm tra bằng PyMuPDF: ba giá trị12.500.000đ ở thân và tổng kết có mép phải552.712/552.708/552.699pt (sai biệt<0.1pt). Phát hiện inset tổng kết trước đó lệch1mm, đã sửa và đo lại đạt.
- PASS quan sát Chromium staging https://e2248ad5.tungcnc-congno.pages.dev/docs/v2.3/ui-r4-readonly: mở riêng cả hai PNG; khối lượng, đơn giá, thành tiền và lịch sử300.000 căn phải, tổng10.850.000/300.000/10.550.000 không đổi. Có ảnh chụp sau deploy, dùng dữ liệu giả RAM; không ghi dữ liệu kinh doanh thật.
- CHƯA NGHIỆM THU Android vật lý/S24 Ultra, PDF/Excel mở trong ứng dụng Android và số tiền cực đại trên thiết bị thật. Không đánh dấu Android PASS dựa trên canvas/DOM/desktop. UI viewer/gesture không sửa trong bản vá này. PR7 draft; không main/production, không schema/IDB/localStorage/D1/protocol change.


## DATA SAFETY AUDIT & SYNC ACCEPTANCE — 22/11/2026
- Báo cáo: [DATA-SAFETY-AUDIT.md](DATA-SAFETY-AUDIT.md); [Checklist Android/PC](RELEASE-ACCEPTANCE-CHECKLIST.md). UI-R4.2.1 giữ nguyên.
- PASS tự động: actual JSON export/preview/additive restore trong hai kho giả độc lập; kiểm tra đầy đủ partners/orders/payments/audit/trash/recovery/reminderTemplates/reminderEvents/excelImports; các ID và số dư nghiệp vụ giữ nguyên; nhập lại không viết; orphan chặn. Audit và recovery thêm1 đúng thiết kế, không phải nhân đôi nghiệp vụ.
- PASS tự động: data-safety-sync mở rộng source Worker+SQLite/3 fake IndexedDB với tạo/sửa/xóa/restore đơn và sửa/backdate/hủy/restore payment. So C.records từng thiết bị với cloud mỗi checkpoint; 32 atomic commits, không duplicate khi mấtACK. Các bài conflict/stale preview/replay/revoke/onboarding2100 và lịch sử nhắc vẫn đạt.
- Phát hiện có bằng chứng: nested quantity âm/unitPrice sai được core cũ chấp nhận. Đã thêm validation không coerce dữ liệu; Worker mô phỏng409, cloud không đổi, local+queue giữ. Sửa đường import reminder-history bị thiếu ở Worker; kiểm tra file import thực. **Chưa deploy Worker live bản vá**; metadata D1 staging đọc-only đúng binding riêng.
- Hồi quy7 bộ npm test và audit công nợ5/5. JSON evidence và log trong evidence/; bộ mới `npm run test:data-safety`.
- CHƯA XÁC MINH dữ liệu lịch sử đời đầu; schema1 giả parse thành công không thay bằng chứng đó. Android↔PC/PWA thật, quota/retention lâu dài, Worker live sau vá và disaster recovery D1 còn chưa nghiệm thu.
- KẾT LUẬN: CHƯA ĐỦ ĐIỀU KIỆN nghiệm thu phát hành/production; tiếp tục test giới hạn bằng dữ liệu giả. Không merge main, không dữ liệu thật, không production. Các rủi ro và cổng phát hành xem báo cáo.
