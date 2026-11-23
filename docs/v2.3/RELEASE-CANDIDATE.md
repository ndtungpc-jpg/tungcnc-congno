# V2.3 RC1 — frozen release candidate

Ngày 23/11/2026 (Việt Nam). Nhánh `feature/v2.3-sync-foundation`.
Frozen application baseline: `93486544ed9af0e0b651bb1a73dbe404f7e3c0bf`.
Bootstrap runtime: `302000ab5e51dfed70fe1f4e15307e3a0cbacf94`.

**RC1 đóng băng. NO-GO Production cho đến khi đóng các gate trong [FINAL-RELEASE-GATE.md](FINAL-RELEASE-GATE.md).** Không merge main, deploy Production, thay đổi UI, A03/v2.4, reset IndexedDB, làm tròn hoặc chỉnh sổ kinh doanh trong nhiệm vụ này.

Phạm vi thay đổi chuẩn bị: bộ đóng gói offline chuyển cấu hình exact-origin/endpoint/D1 sang Production; sửa nhận diện vai trò sender trên hostname Báo Giá Production; wrapper khóa ghi mặc định; kiểm thử và tài liệu. Mã chạy staging và UI RC1 giữ nguyên. Không chép quyền thiết bị/khóa staging sang Production.

## Bằng chứng đã chạy lại

| Phạm vi | Kết quả | Bằng chứng |
| --- | --- | --- |
| Regression sync, reminder, dashboard, UI R4/R4.2 | PASS tự động | `evidence/final/regressions.log` |
| Validation, restore, atomic sync và dữ liệu không hợp lệ | PASS tự động | `evidence/final/data-safety.log` |
| ZIP CRC/SHA256, JSON phục hồi, Excel 9 sheet mở bằng openpyxl độc lập, giá trị dài giữ nguyên dạng text | PASS tự động | `evidence/final/backup-zip-excel.log` |
| Quota, transaction abort, reopen, giữ main/outbox/cursor | PASS mô phỏng | `evidence/final/storage-offline.log` |
| Bootstrap nguyên tử: grant, hash, backup, quyền thiết bị, mất ACK, retry, conflict, không ghi đè đích | PASS tự động | `evidence/final/initial-bootstrap.log` |
| Production artifact: CSP/origin/assets PWA/schema IDB; sender Production; khóa ghi 503 giữ durable job; dữ liệu lịch sử COPY; restore database mới + giao dịch sau backup | PASS tự động, không remote write | `evidence/final/production-preparation.log` |
| Inbox role, approval/revoke, claim cạnh tranh, lost ACK, khóa revision | PASS tự động | `evidence/final/inbox.log` và suite Production |
| Debt integrity | PASS 5/5 | `evidence/final/debt-integrity.log` |
| PC A ↔ S24 B dữ liệu thật và giao dịch giả tách biệt | PASS trong phạm vi đã nghiệm thu | `PC-S24-ACCEPTANCE-RESULT.md`; không mở rộng thành nghiệm thu Production |
| ZIP S24 Chrome/PWA, Excel ứng dụng thật, JSON restore, airplane/reopen, conflict người dùng chọn | CHƯA NGHIỆM THU vật lý | Các bước bắt buộc trong final gate |

Không lấy dòng `physicalPCAndS24: NOT YET TESTED` của fixture tự động làm trạng thái hiện tại: nghiệm thu vật lý sau đó được ghi riêng ở `PC-S24-ACCEPTANCE-RESULT.md`. Ngược lại, nghiệm thu mô phỏng ngắt mạng không chứng nhận airplane mode hoặc OS kill.

## Cập nhật xác nhận TEST — 23/11/2026

Đã đóng blocker119/118: xác nhận chủ xưởng + so backup119/export118 chỉ khác đúng xóa TEST có trash/audit/revision; mọi đơn/payment và lịch sử cũ giữ nguyên; hash2.224records khớp D1 live seq2. Chi tiết và phạm vi ở mục2a final gate. Không phục hồi TEST hoặc thay đổi Production. Fresh cutover exports/backup và các gate thiết bị/rollback vẫn mở.

## Bổ sung go-live preparation — nguồn PC119

Chủ xưởng chọn PC Production119 giữ TEST; S24 Production owner-confirmed chưa dùng, vẫn cần kiểm kho. A/B118 không phải nguồn cutover. Canary rollback/version và explicit conflict trên Cloudflare đã PASS với dữ liệu giả; còn nghiệm thu OS/UI. CPU sync p99=121.505ms không có headroom Free10ms; package mới chuẩn bị cpu_ms1000/requiresWorkersPaid, chưa triển khai/nâng gói. File119 lịch sử kiểm lại bootstrap/restore exact PASS, snapshot1.647.911/row1.760.541/request222.347byte; chưa được coi là file PC cuối. Xem final gate2b/2c và CANARY-DEVICE-FINAL-STEPS.md.

## Tái tạo và kiểm tra bộ phát hành

```sh
npm test --prefix sync
npm run test:data-safety --prefix sync
npm run test:backup-recovery --prefix sync
npm run test:storage-policy --prefix sync
npm run test:initial-bootstrap --prefix sync
node quote-inbox/tests/worker.cjs
node docs/v2.3/debt-integrity-audit.test.mjs
node scripts/test-v23-production.cjs
python scripts/prepare-v23-production.py --out /absolute/new-empty-directory/v23-production
```

Để chạy thêm bản sao lịch sử cục bộ, đặt `BOOTSTRAP_SOURCE_PATH` là đường dẫn JSON riêng trước `node scripts/test-v23-production.cjs`. Không đưa backup, payload kinh doanh, khóa hoặc token vào Git. Test sử dụng SQLite/IndexedDB tạm, giữ nguyên file nguồn. Artifact gồm `pages/`, `workers/sync/`, `workers/quote-inbox/`, `manifest.json` và ZIP có SHA256; không chứa dữ liệu hay quyền thiết bị.

Cấu hình đóng gói: `RELEASE_WRITES=blocked`; `INITIAL_BOOTSTRAP_TARGET=production-v23`. Chưa cấp grant, chưa áp schema hoặc đăng ký thiết bị Production. Không dùng file runtime staging trực tiếp để deploy Production. Các nhãn giao diện RC1 chưa đổi; không tự mở rộng UI trong chuẩn bị phát hành.

Báo Giá Production hiện nằm ở branch `test/direct-quote-bridge`, khác RC1. Artifact đóng gói UI RC1 đã chốt, không tự thay production branch. Chỉ phát hành phần Báo Giá sau khi xác nhận đúng artifact/origin và nghiệm thu lại đường gửi/nhận. Không suy ra việc push nhánh RC1 sẽ triển khai cả hai Pages.
