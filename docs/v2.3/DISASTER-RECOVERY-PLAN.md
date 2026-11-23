# V2.3 — Disaster Recovery Plan

Ngày22/11/2026. **Đạt diễn tập SQL của D1 sync staging vào database riêng; chưa chứng nhận toàn bộ disaster recovery production.** Không restore đè nguồn, không xóa D1/IndexedDB, không tạo dữ liệu thử vào production.

## 1. Các bản sao khác nhau

| Bản sao | Bao phủ | Không bao phủ |
|---|---|---|
| ZIP app: backup.json/backup.xlsx/SHA256.json | Cùng committed snapshot, JSONv2 toàn data, hộp thư cục bộ kèm riêng; Excel9sheet đọc độc lập | D1/server quotes, device private key, outbox/cursor phiên sync, draft/theme/cache |
| Xuất đối soát đồng bộ hiện có | main + syncReview(cursor/outbox/conflict/backups), giữ bằng chứng pending | Không có private key và không tự nhập lại queue/versions vào máy mới |
| SQL D1 sync | sync_state/operations/devices/nonces/rates, versions/tombstone/sequence và dữ liệu trung tâm | Local chưa gửi, private key, server inbox D1 khác, code/secret Cloudflare |
| SQL D1 inbox riêng | quote_inbox/devices/rates/claims khi được xuất riêng | Không có trong SQL sync lần này; cần backup/drill riêng trước production |
| Git + build/config manifest | Mã nguồn, asset, config không chứa secret | Không có dữ liệu IndexedDB hoặc secret value. Không dùng Git làm nơi chứa backup kinh doanh |

JSON ứng dụng không phải bản sao D1. D1 không chứa thay đổi offline chưa gửi. Excel là bản đọc/đối soát, không phải định dạng phục hồi đầy đủ. Giữ nguồn riêng của mỗi thiết bị khi có khác biệt.

## 2. Diễn tập đã thực hiện

- Nguồn: D1 sync staging `49163cc1-a60d-49b1-9c93-da7a6f939977`, Worker vẫn dùng nguồn này.
- Export SQL toàn bộ bằng API D1, tải file độc lập khỏi Cloudflare. Snapshot bookmark `0000001c-00000000-0000512b-43da755ca8192e4bebc55bd99c7fc083`; file319.732byte; SHA256 `1b9094d4c0e0c65a16a7e2a5d989dfe0ea8f4576964f7de8b53830130ebdfb4c`.
- Mở SQL bằng SQLite cục bộ, integrity_check=ok. Đây là bản SQL đọc/phục hồi được ngoài Cloudflare, không chỉ Time Travel hoặc URL ký tạm.
- Tạo **D1 mới** `tungcnc-sync-v23-dr-20261122`, ID `0e536fcd-f683-4dc9-9392-bcd11974a914`, ban đầu không có bảng sync. Restore1.658statement trong10batch. Chỉ PRAGMA/CREATE/INSERT của export; không DELETE/DROP trên nguồn hoặc đích. Không xóa database thử sau diễn tập.
- D1 đích không gắn Worker nào; kiểm tra lại binding của2Worker staging vẫn trỏ các nguồn cũ. Không mở endpoint cho database phục hồi.
- Đọc toàn bộ từng dòng đích, so với bản SQL nguồn đã mở bằng SQLite, canonical hóa/sắp xếp dòng để so nội dung, không chỉ đếm. Raw SQL/dữ liệu/URL export không đưa vào repository. Evidence công khai chỉ aggregate/hash.

| Bảng | Trước | Sau | Nội dung tất cả dòng |
|---|---:|---:|---|
| sync_devices | 8 | 8 | PASS |
| sync_nonces | 1.619 | 1.619 | PASS |
| sync_rates | 5 | 5 | PASS |
| sync_state | 1 | 1 | PASS |
| sync_operations | 19 | 19 | PASS |

| Đối soát nghiệp vụ staging | Trước | Sau | Kết quả |
|---|---:|---:|---|
| KH / NCC | 6 / 1 | 6 / 1 | PASS |
| Đơn/phiếu | 9 | 9 | PASS |
| Payment | 4 | 4 | PASS |
| Tổng đã thu / còn phải thu | 2.500.000 / 20.927.300 | 2.500.000 / 20.927.300 | PASS |
| Đã chi / còn phải trả | 300.000 / 500.000 | 300.000 / 500.000 | PASS |
| Lịch sử nhắc | 4 | 4 | PASS |
| Sequence / log operations | 19 / 19 | 19 / 19 | PASS |

41 bản ghi đồng bộ có ID/nội dung chính xác. Toàn bộ JSON string state/versions và body log khớp byte nên hạng mục/kích thước, liên kết phân bổ cũng được giữ nguyên; C.validate bản phục hồi PASS. Điều này chỉ chứng nhận snapshot staging này, không chứng nhận backup đời đầu hay toàn bộ production.

Bộ SQL+manifest+README được giao riêng cho chủ xưởng, không public/GitHub; là plaintext, cần cất bản mã hóa dưới quyền chủ xưởng. Bản zip không chứa private device key hoặc secret Cloudflare. Evidence: `evidence/d1-disaster-recovery.json`, `storage-production-inventory.json`.

## 3. Quy trình backup độc lập (thiết kế vận hành)

1. Trước phát hành hoặc xử lý xung đột: từng thiết bị xuất ZIP app và đối soát sync nếu có pending/conflict; ghi origin, device label, revision/cursor, counts/totals và hash. Không ép gửi pending chỉ để được trạng thái xanh.
2. Export SQL **từng** D1 sync và inbox với tên/UUID môi trường rõ ràng, kèm cấu hình Worker binding/version/commit; không xuất secret value vào báo cáo. Đối chiếu snapshot nhất quán, không ghép các trang SELECT ở nhiều thời điểm làm backup chuẩn.
3. Tải file ngay khi export xong, kiểm tra hash/khả năng mở. Signed URL và Time Travel không là nơi lưu backup lâu dài.
4. Lưu ít nhất một bản ngoài Cloudflare và ngoài thiết bị dùng app, cộng một bản offline PC/USB được bảo vệ. Mã hóa bản lưu có thông tin kinh doanh/credential hash; khóa khôi phục do chủ xưởng giữ riêng, không gửi chat/GitHub.
5. Đề xuất: app ZIP cuối mỗi ngày và trước cập nhật; D1 SQL6giờ/lần khi production, RPO mục tiêu6giờ cho dữ liệu đã gửi. **Chưa có scheduler/offsite automation trong bản này**; trước khi có, backup thủ công chỉ bảo đảm RPO theo lần xuất thực tế. RTO mục tiêu4giờ chưa được đo end-to-end.
6. Đề xuất tầng lưu7bản ngày/4bản tuần/12bản tháng để lập kế hoạch dung lượng; không triển khai xóa tự động. Giữ mọi bản đang điều tra hoặc trước phiên bản; chủ xưởng quyết định xử lý sau kiểm tra.
7. Định kỳ phục hồi vào database/hồ sơ mới, đối chiếu từng ID/nội dung/totals và giấy tờ thu tiền. Không chỉ xác minh ZIP giải nén hoặc SHA đúng.

## 4. Khi cần phục hồi

### Mất điện thoại hoặc máy tính

Thu hồi đúng device/token qua thiết bị còn quyền hoặc chủ tài khoản Cloudflare; giữ nguồn khác, không gộp theo tên/SĐT. Cài/mở lại đúng origin, xuất backup mọi dữ liệu còn đọc được trước thao tác. Máy thay thế tạo định danh/key mới; private key không có trong ZIP và không chép sang máy khác.

Nếu central còn tốt: xem trước snapshot trung tâm và dữ liệu JSON, xử lý từng ID/xung đột rồi mới bật nhận/gửi. Bản offline chưa gửi có thể chỉ còn trong ZIP/đối soát của máy mất; nếu không có backup thì **không bảo đảm cứu được**, không tạo giao dịch bù suy đoán. Không replay nguyên op của device cũ dưới key mới; đối chiếu ID/receipt rồi tạo diff hợp lệ sau xác nhận.

### Mất website hoặc rollout hỏng

Giữ nguyên domain/hồ sơ lưu trữ, không uninstall/clear site data. Khôi phục asset/code tương thích, để app đọc lại IDB. Cache app/Excel cục bộ có thể hỗ trợ offline nếu còn. Website/GitHub không chứa kho IDB của từng máy. Giữ ZIP cục bộ ngoài app.

### Mất/corrupt D1 hoặc Cloudflare

Ngừng ghi server có kiểm soát, giữ local offline và outbox; không xóa queue. Tải/export trạng thái mới nhất còn đọc được và log sau checkpoint. Dựng **database mới** từ backup độc lập, không Time Travel đè nguồn đang có giao dịch mới. So ID/record/sequence/payments, áp dụng log mới còn thiếu qua quy trình có xác nhận; phát hiện lỗ hổng history thì dừng, không tự suy đoán.

Nếu Cloudflare không dùng được: SQL mở được bằng SQLite độc lập; Excel đọc được offline. Đây chưa phải backend thay thế đã triển khai. Chuyển nhà cung cấp/Worker cần kiểm thử API/chữ ký/idempotency/sequence và origin/thiết bị trước khi tái kết nối; không coi đổi DNS là đã khôi phục sync.

### Rollback code khác rollback dữ liệu

Code rollback không hoàn tác D1/IDB. Restore D1 cũ lên nguồn sẽ mất giao dịch sau backup và có thể tái nhận op/quote; **không thực hiện như rollback mặc định**. Giữ backup mới +log/outbox, phục hồi vào đích mới và đối chiếu delta. Bản code cũ cũng phải đọc được dữ liệu/metadata mới; nếu không có chứng cứ tương thích, ưu tiên forward-fix/fail-closed sync thay vì rollback mù làm thay đổi không được xếp vào outbox.

## 5. Kết quả và việc còn thiếu

| Hạng mục | Trạng thái |
|---|---|
| SQL sync export độc lập, mở SQLite và restore D1 mới, so toàn dòng/tổng | PASS thực tế API D1 +SQLite |
| Không sửa nguồn, nguồn vẫn sequence19; không bind Worker sang đích | PASS API đọc lại |
| JSON/XLSX/SHA ZIP giải nén, fresh app restore | PASS tự động ở backup acceptance |
| Quota/abort/reopen/pending | PASS mô phỏng; không phải power-loss vật lý |
| Android S24 Ultra Chrome/Zalo tải ZIP sau vá | CHƯA NGHIỆM THU chủ xưởng |
| SQL D1 inbox backup/restore độc lập | CHƯA DIỄN TẬP; chỉ đọc schema/counts trong nhiệm vụ này |
| Lịch backup tự động, mã hóa/offline do chủ xưởng quản lý, RPO/RTO | CHƯA TRIỂN KHAI/CHƯA ĐO |
| Mất toàn bộ Cloudflare + failover provider/device re-enrollment end-to-end | CHƯA KIỂM THỬ |
| Dữ liệu lịch sử đời đầu/production thật | CHƯA XÁC MINH |

Kết luận **NO-GO production** tới khi cổng trong PRODUCTION-READINESS.md được nghiệm thu riêng. Không xóa database DR thử; chủ xưởng quyết định lưu/retire sau, không phát sinh cleanup ngầm.
