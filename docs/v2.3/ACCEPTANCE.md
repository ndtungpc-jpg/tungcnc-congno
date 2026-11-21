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
