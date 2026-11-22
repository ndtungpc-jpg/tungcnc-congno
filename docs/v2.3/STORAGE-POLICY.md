# V2.3 — Storage Policy

Ngày22/11/2026. Baseline `ca71ea794c84c36ecb4d5e654aa140bf927718b9`. Nhánh `feature/v2.3-sync-foundation`.

**A03 vẫn mở, mức Cao.** Đã đo nguồn tăng trưởng, thiết kế retention và vá một lỗi báo đồng bộ thành công giả khi hết quota. Chưa bật cleanup/checkpoint tự động vì chưa có đủ bằng chứng lưu trữ/ACK/khôi phục để xóa snapshot an toàn. Không xóa dữ liệu nghiệp vụ, outbox, snapshot cũ, nonce hoặc log trên staging/production.

## 1. Kho dữ liệu và dung lượng thực đo

| Kho | Tình trạng / tăng trưởng | Chính sách |
|---|---|---|
| IndexedDB `tunggiang-congno-v2`, version1, store `state`, key `main` | Toàn JSON nghiệp vụ. audit/trash/recovery/reminderEvents tăng theo sử dụng; audit có before/after, recovery chứa snapshot | Không tự xóa, cắt hoặc gộp nghiệp vụ. Cần ZIP ngoài thiết bị và theo dõi bytes |
| Cùng store, key `tg-sync-v23` | CryptoKey riêng, cursor/versions/outbox/conflict/backups. Mỗi remote op thêm snapshot main; các lần tick cũng clone/ghi lại meta | Outbox chưa ACK và hai phía xung đột luôn được giữ. Retention chưa triển khai |
| localStorage fallback `tunggiang-congno-offline-v2` | Một bản JSON đầy đủ, quota tách biệt IDB; có thể đầy dù IDB còn chỗ | Không tự gộp/xóa fallback. Ghi lỗi phải báo không lưu |
| localStorage hộp thư/phiên/giao diện/xác thực inbox | Hộp thư có cap500 mục nhưng không có ngân sách byte tổng. Phiên có cap1.500.000 ký tự, không phải bảo đảm đủ quota | Không đưa token vào GitHub. Không dùng Clear Site Data để giải phóng dung lượng |
| CacheStorage | Asset PWA cùng prefix; SW chỉ dọn cache asset phiên bản cũ | Không có thao tác xóa IDB. Asset tải lại được, không coi đây là backup nghiệp vụ |
| D1 sync staging | File438.272byte lúc đọc; một state trung tâm + log operations/devices/nonces/rates | Không chạy cleanup trong audit này |
| D1 hộp thư staging | File57.344byte lúc đọc; quotes/devices/rates/claims | Không giải phóng claim để nhận lại báo giá: nguy cơ tạo đơn trùng |

**CHƯA ĐO dung lượng/quota thật trên S24 Ultra/PC của chủ xưởng.** Không gọi navigator.storage.estimate trên hồ sơ người dùng hoặc đọc IDB thật. Số byte JSON dưới đây không bao gồm structured-clone/CryptoKey/index, overhead SQLite/CacheStorage hay quota hệ điều hành. Quota/plan Cloudflare hiện tại chưa được xác minh; không suy diễn từ tên backend D1 `production`.

D1 đọc-only (payload bytes logical, không bằng kích thước file/index):

| Bảng | Dòng | Payload byte ước tính bằng SQL |
|---|---:|---:|
| sync_state | 1 | 17.597 |
| sync_operations | 19 | 23.777 |
| sync_nonces | 1.619 | 148.948 |
| sync_rates | 5 | 360 |
| sync_devices | 8 | 2.040 |
| quote_inbox | 2 | 2.625 |
| inbox_devices | 2 | 411 |
| inbox_rates | 1 | 72 |
| inbox_claims | 2 | 282 |

Evidence: `evidence/storage-production-inventory.json`. Các truy vấn không ghi; không xuất tên/token/payload vào báo cáo công khai.

## 2. Mô hình tăng trưởng đo bằng dữ liệu giả

Mỗi đơn giả có2 hạng mục/2 dòng kích thước,2payment và1audit lưu bản ghi đơn. Không đại diện mọi đơn thực tế.

| Đơn | Payment | JSON main (byte) | Main +100 full snapshot (byte, xấp xỉ) |
|---:|---:|---:|---:|
| 100 | 200 | 161.485 | 16.309.985 |
| 1.000 | 2.000 | 1.623.085 | 163.931.585 |
| 3.000 | 6.000 | 4.891.085 | 493.999.585 |
| 4.000 | 8.000 | 6.525.085 | 659.033.585 |

Ở main1,62MB,1.000snapshot tương đương khoảng1,62GB trước overhead. Nếu kích thước state tăng đều qua nhiều lần sửa, tổng snapshot có thể tăng bậc hai theo lịch sử; không dùng bảng này để hứa hỗ trợ một số đơn cố định. Worker hiện chặn state>5.000.000byte và request>1.000.000byte theo mã nguồn, độc lập giới hạn D1. Mẫu4.000đơn vượt cap state; chưa thử tải thật lên server.

Client tick15giây, tối thiểu2 request ký/tick khi rảnh. Mô hình3thiết bị mở8giờ/ngày tạo11.520nonce/ngày,345.600/tháng; khoảng31,8MB logical/tháng ở92byte/dòng, chưa tính index/overhead. Pull nhiều trang, retry hoặc nhắc nợ đọc cloud làm tăng thêm. operations/rates/versions tombstone và quote/claims cũng chưa retention.

Evidence `storage-growth.json`; script `sync/tests/storage-growth.cjs` chỉ đo byte, không ghi dữ liệu ứng dụng.

## 3. Checkpoint/retention đề xuất — CHƯA TRIỂN KHAI runtime

### Các điều kiện bắt buộc trước dọn bất kỳ snapshot kỹ thuật

1. Checkpoint bất biến có sequence, schema, record versions/tombstones, counts/totals, hash và cấu hình nguồn. Checkpoint phải phục hồi được trong kho riêng, không chỉ có checksum.
2. Có bản ngoài origin/thiết bị và ngoài Cloudflare đã kiểm tra. ZIP app không bao gồm đủ outbox/conflict metadata; dùng thêm xuất đối soát đồng bộ `syncReview` hiện có và kế hoạch khôi phục thủ công. File này không tự khôi phục queue/private key.
3. Biết low-watermark ACK của **mọi** thiết bị đang có quyền. Thiết bị offline không mặc nhiên đã nhận. Hiện API chưa có registry ACK/checkpoint đầy đủ; đây là blocker, không được prune operations dựa riêng cursor của một máy.
4. Giữ pinned: before-first-sync, before-explicit-reconciliation có pending/conflict, snapshot liên quan outbox chưa ACK, hai phiên bản xung đột chưa xử lý, mọi bản chưa có bằng chứng đối soát ngoài thiết bị.
5. Dry-run liệt kê ID/hash/byte trước-sau và các pin; đối chiếu số dư/ID bằng nhau. Chưa đủ bằng chứng thì không dọn, kể cả khi vượt ngân sách.
6. Lần compact có backup meta ngoài thiết bị, CAS serial và transaction nguyên tử; có journal rollback kỹ thuật. Không đưa private key vào JSON công khai. Đóng app giữa compact phải giữ nguyên bản trước hoặc bản mới hoàn chỉnh.

Retention dự kiến chỉ cho **snapshot kỹ thuật đủ điều kiện**: giữ10checkpoint gần nhất +1checkpoint/ngày trong7ngày, cùng mọi pinned snapshot; đây là đề xuất, không cap dữ liệu nghiệp vụ và chưa có scheduler. Ngân sách byte phải chốt sau đo thiết bị; không dùng số lượng snapshot đơn thuần. Không xóa bản sao cũ ngoài thiết bị tự động.

### D1

- `sync_operations`: chưa prune. Chỉ archive sau checkpoint phục hồi đã kiểm và all-device ACK; cần xử lý thiết bị quá cũ bằng bootstrap có xác nhận, giữ bằng chứng idempotency/quote uniqueness. API hiện yêu cầu cursor liên tục, nên DELETE log sẽ làm khách cũ kẹt hoặc mất nguồn đối soát. Không làm trong bản vá này.
- `sync_nonces`: thiết kế TTL24giờ (đề xuất) sau backup; mã xác thực hiện từ chối thời gian lệch>120giây trước tra nonce. Cần test biên clock/replay và chỉ dọn nonce hết cửa sổ, không đồng nghĩa được xóa device/ops. Chưa chạy DELETE trên D1.
- `sync_rates`/`inbox_rates`: chỉ bucket giờ đã hết hạn +buffer24giờ, sau kiểm thử rate-limit; không reset bucket đang hoạt động. Chưa triển khai.
- `inbox_claims`, fingerprint/idempotency/versions tombstone: không tự hết hạn; giữ khi có khả năng thiết bị gửi lại hoặc báo giá được nhận lại. Không suy luận “đã cũ nên an toàn”.
- Khách/NCC/đơn/payment/audit/reminderEvents/outbox chưa ACK: không retention phá hủy. Lịch sử nghiệp vụ dài hạn cần giải pháp lưu trữ được duyệt riêng khi gần cap5MB, không cắt lịch sử để vượt cap.

### Cảnh báo dự kiến

Đo main/meta/backups/outbox riêng và navigator.storage.estimate khi API có hỗ trợ; ghi thời gian/nguồn đo, không khẳng định quota chính xác. Đề xuất cảnh báo70%, mức85% yêu cầu backup và xử lý, mức95% dừng thao tác kỹ thuật có nguy cơ tạo snapshot lớn, giữ khả năng cứu JSON. Ngưỡng này chưa có enforcement/UI mới; không đổi giao diện trong nhiệm vụ này. Không xóa dữ liệu khi gần đầy. navigator.storage.persist nếu được cấp chỉ giảm rủi ro eviction, không thay backup.

## 4. Lỗi đã chứng minh và kiểm thử

**A03-Q01:** trước vá, persistent quota làm receive/persist-error cùng thất bại; finally đọc meta cũ và báo “Đã đồng bộ”. Proof `storage-failure-before.log`: assertion actualĐã đồng bộ/expectedLỗi đồng bộ. Dữ liệu chưa bị ghi đè nhưng trạng thái gây hiểu nhầm.

Vá tối thiểu `sync/engine.js`: giữ failure tạm trong bộ nhớ, hiển thị Lỗi đồng bộ và error ngay cả khi không ghi được metadata hoặc DB đã đóng. Không đổi record/schema/protocol/queue, không chuyển tiền. SW đổi cache asset để nhận engine mới. Sau quota được giải phóng, retry vẫn dùng cursor/queue gốc và hội tụ.

| Kiểm thử | Kết quả | Bằng chứng/giới hạn |
|---|---|---|
| Mọi metadata write bị QuotaExceeded | PASS mô phỏng | Main/cursor/queue/backups nguyên; trạng thái lỗi; retry nhận đúng |
| Local save quota | PASS mô phỏng | Throw, không cập nhật main/outbox một nửa |
| IDB đóng/read lỗi | PASS mô phỏng | Không báo synced, không xóa pending |
| Abort sau cả2put + close/reopen | PASS fake IndexedDB | Rollback main/queue/cursor, pending payment còn nguyên |
| commit UI lỗi IDB và localStorage thật trong VM | PASS mô phỏng | Trảfalse, báo Chưa lưu, không toast Đã lưu; JSON cũ còn |
| ZIP Android fix | PASS tự động |15checks ở evidence/android-backup-zip.*, giải nén/openpyxl; S24 sau vá chưa nghiệm thu |
| Hồi quy sync/công nợ/restore/UI | PASS tự động |7suite +3data-safety +5debt tests, thêm storage-policy và ZIP |
| Quota thấp thật/flash đầy/mất điện/kill PWA trong transaction | CHƯA KIỂM THỬ vật lý | Abort/read-error chỉ mô hình hóa, không thay power-loss trên S24/PC |
| Retention tự động/checkpoint/all-device ACK | CHƯA TRIỂN KHAI | Không đủ chứng cứ dọn an toàn, A03 chưa đóng |

Chạy `npm run test:storage-policy`; log/evidence cùng thư mục. Không dùng dữ liệu công nợ thật để gây lỗi. Kết luận **NO-GO production** tới khi có giới hạn thực tế, checkpoint/retention được chứng minh và nghiệm thu thiết bị.
