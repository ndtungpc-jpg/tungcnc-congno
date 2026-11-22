# A03 — Kiến trúc lưu trữ dài hạn và checkpoint an toàn

Ngày22/11/2026. Baseline `d02d8d5cb8f3e8a314672be2a0910824f179de5e`. Đây là thiết kế có prototype cô lập, **không phải giao thức đã triển khai lên app/Worker/D1**. Không sửa UI, IDB hoặc dữ liệu staging; không có cleanup executor.

## Quyết định kiến trúc

Không tăng riêng cap5MB rồi tiếp tục sao chép cả sổ nợ ở mỗi thao tác. Chọn lưu **từng bản ghi JSON nguyên trạng**, giao dịch nguyên tử theo operation, delta theo cursor, checkpoint bất biến chia trang và archive kỹ thuật có kiểm chứng. IndexedDB vẫn là nguồn offline, Worker+D1 là trung tâm, 2–3 thiết bị cùng chủ sở hữu; không WebSocket/ERP/phân quyền nhân viên.

| Phương án | Nhận định |
|---|---|
| Chỉ tăng cap5MB hoặc gzip toàn state | Không chọn: vẫn ghi/clone/validate/copy toàn state, snapshot tăng nhanh, mobile RAM và body/CPU vẫn nghẽn |
| Chia đơn theo năm thành các DB khác nhau ngay | Không chọn mặc định: thu chung nhiều đơn/năm cần giao dịch xuyên DB, khó bảo đảm công nợ |
| Per-record JSON + SQL indexes + delta + checkpoint/archive | Chọn cho bước tiếp: giữ business payload/ID, bỏ ràng buộc tổng state phải nằm trong một JSON5MB |

Payload orders vẫn chứa quoteItems/purchaseItems/sizes như hiện tại. Payment ID/group/allocation, partnerId/orderId, ngày, tiền, audit/reminder giữ nguyên. Không gộp khách/đơn/payment theo tên/ngày/số tiền. Không coi chuyển biểu diễn lưu trữ kỹ thuật là lý do chuẩn hóa/làm tròn dữ liệu lịch sử.

## 1. Mô hình trung tâm đề xuất

- `records(kind,id,version,payload,tombstone,...)`: mỗi payload là JSON gốc; cột phụ/index partnerId/orderId/groupId là projection kỹ thuật để kiểm tra quan hệ/số dư. Unique `(kind,id)`.
- `operations(sequence,operationId,deviceId,changes,hash,...)`: log thay đổi giữ nguyên transaction. Full body có thể chuyển sang archive kỹ thuật sau cổng an toàn, không tự xóa.
- `operation_receipts(operationId,deviceId,payloadHash,sequence)`: chỉ mục idempotency nhẹ **giữ lâu dài**, kể cả khi body log đã archive. Không có TTL khiến retry cũ tạo lần thu mới.
- `quote_claims(transferId/fingerprint/sourceCode,orderId,...)`: giữ liên kết chống trùng cả khi đơn hủy/đưa thùng rác; không xóa claim để nhận lại báo giá.
- `device_progress(deviceId,checkpointId,receivedSequence,verifiedRoot,membershipEpoch,...)`: ACK đã xác thực, không suy ra từ lastSeen hoặc số ngày offline.
- `checkpoint_manifests` và `archive_catalog`: ID/hash/sequence/chunk/counts/totals/phiên bản codec, nguồn backup/biên bản restore; không public URL kinh doanh.

Prototype `sync/experiments/a03/model.cjs` dùng SQLite có indexes, transaction và các bảng kỹ thuật tương ứng; không được import bởi index.html/SW/Worker. D1 live chưa có các bảng này. Prototype không phải toàn bộ validator production: kiểm kích thước/hạng mục(A01), ngày, legacy, audit/thùng rác và auth nghiệp vụ còn phải tích hợp theo mã đã nghiệm thu. Caller thử nghiệm không tự tạo mọi audit/trash như UI hiện tại. Không được bỏ các kiểm tra này khi triển khai backend mới. Prototype vẫn chạy kiểm tra quan hệ SQL toàn bảng mỗi transaction; production cần kiểm tra theo affected order/group/partner bằng index, không bỏ kiểm tra mà phải hồi quy tương đương.

Mỗi operation: xác minh device → kiểm receipt/hash → BEGIN → CAS version từng record → áp dụng toàn bộ thay đổi liên quan → kiểm FK/số tiền/group/quote → ghi receipt/log/head → COMMIT. Payment và mọi phân bổ phải cùng transaction, không chia một nhóm tiền thành nhiều commit độc lập. Konflikt/validation lỗi rollback cả transaction. Log sequence tăng đúng1 cho transaction thành công, không tăng khi duplicate/conflict.

Không xóa tombstone/versions khi vẫn có thiết bị có thể gửi edit từ bản cũ. Dữ liệu tiền gốc giữ nguyên; định dạng lịch sử không qua preflight hiện tại phải có quy trình tương thích riêng, không tự đổi số.

## 2. Checkpoint và bootstrap nhiều trang

1. Chọn snapshot nhất quán tại sequenceS. Đọc trong transaction/snapshot hoặc từ SQL export đã đóng băng; lấy S từ chính snapshot, không đọc head trước rồi ghép nhiều trang latest đang thay đổi.
2. Ghi chunk bất biến tối đa256KiB/200record cho thử nghiệm. Mỗi chunk có byte size/count/SHA256. Records và receipts/quote claims/operation body đều được phân trang; không nhét toàn bộ metadata vào một JSON5MB.
3. Manifest chứa checkpointId, S, root, counts/totals, membership và tất cả chunk hashes. ID là hash manifest không chứa chính ID. Root/hash dùng codec/order xác định; cần hợp đồng canonical bytes và test Unicode/number giữa runtimes trước production. Prototype chỉ chứng minh Node→Node.
4. Lưu object theo content hash để tái dùng trang không đổi và index manifest. Object store riêng (R2 hoặc tương đương) chỉ là archive/checkpoint, D1 vẫn là nguồn giao dịch. Phải có thêm bản ngoài Cloudflare/offline, không dựa riêng R2/Time Travel. Content-addressed dedup và scheduler chưa triển khai trong prototype.
5. Thiết bị tải các trang vào shadow stores, kiểm hash/count/ID/totals/group và root **đủ toàn bộ** rồi mới activate bằng transaction/pointer nguyên tử. Không đưa nửa nhóm payment hoặc nửa checkpoint vào màn hình/sổ đang dùng.
6. Nhận tail operations `>S`, kiểm thứ tự và áp dụng nguyên tử, đối soát lại. Nếu cursor trước logFloor thì trả trạng thái `NEEDS_CHECKPOINT` rõ ràng, không trả danh sách rỗng rồi báo synced.

Nếu một order/group riêng lẻ lớn hơn page/request budget: cần upload chunks có checksum và commit transaction manifest một lần, hoặc chặn với hướng dẫn rõ. Không cắt mất dimensions/audit để vừa gói và không tách phân bổ độc lập. Fragmentation/oversized-group protocol **chưa triển khai hoặc đo trong prototype**.

Tăng quy mô tới10.000 đơn không còn phụ thuộc một state5MB, nhưng không có nghĩa vô hạn: SQL/index/audit vẫn tăng. Theo dõi byte thực theo từng kind, index/log/object và projection theo số lần sửa/payment, không chỉ số đơn. Khi gần quota/CPU thật của plan D1, nâng tài nguyên hoặc chuyển backend relational lớn hơn bằng SQL/NDJSON export kiểm chứng; không xóa lịch sử nghiệp vụ. Chưa xác minh quota/CPU/billing D1 của plan hiện tại, nên không hứa số năm cố định.

## 3. ACK đa thiết bị

ACK mới là thiết kế APIv2 riêng, không thay thế routev1 đang chạy. Device ký `{deviceId,checkpointId,sequence,verifiedRoot,membershipEpoch,...}` bằng danh tính riêng; không tin ACK của device khác hoặc số sequence do UI tự điền. Client chỉ ACK sau transaction durable hoàn tất và root/count/totals khớp. Chữ ký xác nhận danh tính gửi, **không tự chứng minh ổ đĩa đã ghi**; code client đúng và thử abort/crash là điều kiện bắt buộc.

- Membership gồm mọi device liên quan tại checkpoint và mọi approved device mới. Thêm device làm đổi epoch, bắt bootstrap/checkpoint mới hoặc chứng minh đã ACK cùng snapshot; không bỏ qua device mới.
- Offline/mất ACK: chặn retention; gửi lại cùng ACK phải idempotent. ACK giảm sequence, root/checkpoint khác hoặc chữ ký khác bị chặn.
- Device vắng lâu không tự được coi đã nhận. Thu hồi/retire phải có lệnh chủ xưởng và đối soát backup/pending; không chỉ đổi TTL để được dọn.
- Server log pruning và local snapshot pruning là hai cổng khác nhau. Server không biết chắc outbox/conflict của máy offline. Local cleanup phải lock/CAS serial/main hash/pending pins ngay lúc áp dụng; proof cũ không đủ.
- Quyền gửi/nhận thật vẫn cần tích hợp xác thực, anti-replay, D1 concurrency và retry hiện tại. Prototype ACK ký ECDSA bằng Node chỉ là protocol test, không phải integration device đã nghiệm thu.

## 4. Dry-run và retention

Không tự xóa orders/payment/audit/reminder/trash hoặc pending outbox; không tự gộp pending op để giảm số lượng. Được batch transport nhưng vẫn giữ từng operationId/receipt và tính nguyên tử nghiệp vụ.

Một plan phải khóa vào checkpoint/root/membershipEpoch/log range/head/local serial; gồm danh sách giữ/dự kiến, byte trước-sau, lý do pin, backup receipt, restore report và rollback+tail report. Khi thực thi tương lai phải tính lại các điều kiện, không dùng boolean cũ do UI gửi.

Điều kiện đồng thời:

1. Checkpoint phục hồi được và counts/ID/số dư/root/log/receipts/quote claims khớp.
2. Có backup ngoài thiết bị đã đọc lại/verify, ưu tiên ngoài Cloudflare; kiểm tra quyền truy cập/mã hóa.
3. Mọi device liên quan ACK đúng checkpoint, không âm thầm loại offline device.
4. Không dọn snapshot pinned bởi pending/conflict/first-sync/reconciliation hoặc dữ liệu sau S.
5. Rollback kỹ thuật đã diễn tập **checkpoint +tail mới hơn**, không khôi phục đè làm mất giao dịch mới.
6. Có full operation body archive trước khi xem xét log hot; receipts/tombstones/quote claims vẫn truy xuất được. V1 client chưa hỗ trợ logFloor/bootstrap nên **không prune log đang chạy**.
7. Dry-run không ghi; operator review/owner authorization, CAS/transaction và thao tác rollback riêng trước cleanup.

Prototype chỉ trả `eligibleForManualReview`, luôn `executable:false`; **không có hàm DELETE/cleanup**. Positive case dùng attestation giả lập để kiểm nhánh logic, không phải backup ngoài thiết bị thật. Trong benchmark, bản copy ngoài-device chỉ ở thư mục khác cùng máy nên dry-run thực tế bị BLOCKED. Không dùng nhánh positive đó làm giấy phép dọn staging.

Retention dự kiến cho technical snapshot đủ điều kiện:10gần nhất +7bản ngày +mọi pinned, đồng thời byte budget phù hợp thiết bị thực đo. Chunk dùng chung không được GC nếu còn bất kỳ manifest/pin/reference. Business audit và lịch sử nhắc không nằm trong retention này. Giới hạn và policy cần chốt sau đo S24/PC, không tự xóa bản sao cũ.

## 5. IndexedDB dài hạn và migration

Không giữ `main` và toàn bộ backups/outbox trong một object được rewrite mỗi tick. Đề xuất stores kỹ thuật per-kind/per-record, outbox/op receipts/version/cursor/checkpoint và before-images chỉ cho record bị tác động. Một transaction ghi record+outbox/cursor; không copy cả sổ trước mỗi pull. Before-image liên quan pending/conflict vẫn pinned tới khi đủ điều kiện.

Business payload/ID không đổi nhưng physical store schema cần migration riêng. **Chưa thực hiện**: cần JSON+syncReview backup, shadow import, so toàn ID/totals, thử interrupted migration, khóa single writer/old-client, kiểm old-version đọc/rollback tương thích. Không bật dual-write âm thầm và không xóa main/v2 cũ. Nếu chưa có rollback tương thích, chỉ cho phép forward recovery theo quy trình đã nghiệm thu. Update source/schema phải được kiểm tra riêng trước khi chạm staging có dữ liệu.

Chỉ chia trang server mà client vẫn clone/validate/render toàn main sẽ không giải quyết mobile RAM/CPU nhiều năm. Cần đọc/index theo màn hình và ledger projections cùng test; việc này chưa thực thi vì không được thay UI và storage đang dùng trong nhiệm vụ này.

## 6. Phạm vi triển khai tiếp

1. Duyệt kiến trúc và backup/ACK/lease policy; giữ NO-GO.
2. Tạo Worker/D1 **mới cho thử nghiệm v2**, không migrate/cleanup D1 hiện tại; tích hợp auth/ACK/paged bootstrap +client shadow store.
3. Chạy cùng ma trận1k/3k/5k/10k trên D1 live và S24/PC; thêm offline/restart/restore+tail/oversized-group/concurrent-write/low-quota.
4. Thử dry-run bằng backup ngoài thiết bị thật, các device ACK thật, checksum và rollback thật. Chỉ khi đủ proof mới đề xuất một lần compact kỹ thuật được duyệt; không log pruning cho v1.
5. Nghiệm thu dữ liệu đời đầu và production cutover riêng. Không merge main hoặc rollout trong nhiệm vụ này.
