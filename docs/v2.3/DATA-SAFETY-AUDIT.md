# V2.3 — Data Safety Audit & Sync Acceptance

Ngày: 22/11/2026 (Việt Nam). Baseline: `7c3abf36778ebf1302f993b46b821e40603a93ee`. Nhánh `feature/v2.3-sync-foundation`; UI-R4.2.1 được giữ nguyên.

## Kết luận

**CHƯA ĐỦ ĐIỀU KIỆN nghiệm thu phát hành/production.** Có thể dùng nhánh này để tiếp tục kiểm thử có kiểm soát bằng dữ liệu giả. Các bằng chứng tự động tích cực không thay thế Android ↔ PC thật, dữ liệu lịch sử thật đã ẩn danh, thử giới hạn lưu trữ và đồng nhất mã Worker staging.

Không truy cập hay sửa bản ghi kinh doanh thật. Không reset IndexedDB/localStorage. Không restore lên thiết bị thật. Không merge main, không deploy production; không chạy SQL sửa/xóa D1 trong đợt audit. Hai sửa nguồn có bằng chứng nằm ở bộ kiểm tra chi tiết và đường import Worker; không sửa UI/công thức/giao thức.

## Phạm vi và phương pháp

- Đọc nguồn IndexedDB/fallback, commit/save, backup/restore, sync core/engine/client/Worker, D1 schema, service worker, session và reminder history.
- Chạy mã Worker gốc với adapter SQLite transaction in-memory và ba fake-indexeddb độc lập. Đây là **tự động mô phỏng API**, không phải D1 Cloudflare thật hay Android/PC thật.
- Chạy `exportData → importData → confirmBackupRestore` của ứng dụng hiện tại trong hai jsdom VM/kho IndexedDB thử độc lập. Không chỉ gán lại object để giả lập phục hồi.
- Xác minh read-only Cloudflare: Worker `tungcnc-sync-v23-staging`, binding `DB` → D1 `49163cc1-a60d-49b1-9c93-da7a6f939977`, đúng cấu hình staging riêng. Deployment đang chạy lúc đọc: `5bb2bc2f-5093-4802-9bd6-4fc343e6c14e`, version `7fb30e3e-478d-4b8c-8247-e64c0a474cb6`, 100%, 21/11/2026 20:25:41Z. Không đọc payload D1 hay khóa bí mật. Không khẳng định deployment đó đã chứa sửa nguồn của audit này.

## Bản đồ lưu trữ và nâng cấp

| Thành phần | Nguồn/kiểm soát | Nhận định |
|---|---|---|
| IndexedDB | `tunggiang-congno-v2`, version1, store `state`, key `main` | init chỉ đọc; tạo store nếu chưa có; không deleteDatabase/clear. `schemaVersion2` là phiên bản JSON, khác IDB version1. |
| Ghi cục bộ | `index.html` save/commit | IDB transaction so revision và snapshot; lỗi ghi trả về committed; không báo lưu thành công trước tx complete. |
| Fallback | localStorage `tunggiang-congno-offline-v2` | Kho riêng, không tự gộp; ghi yêu cầu navigator.locks. Chuyển fallback có thể khiến người dùng thấy kho khác, không đồng nghĩa dữ liệu đã bị xóa. |
| Queue/thiết bị | key `tg-sync-v23` trong cùng store | candidate + outbox cùng transaction; serial/CAS chống ghi đè. CryptoKey không xuất được JWK riêng; vẫn không chống được JavaScript độc hại cùng origin sử dụng key. |
| Đơn/hạng mục/kích thước | ID đơn và partnerId, quoteItems/sizes/purchaseItems lồng trong đơn | Giữ nguyên payload, không di chuyển/schema migration. Hạng mục chưa có khóa độc lập nên xung đột xử lý cả đơn. |
| Thanh toán | paymentId/orderId, paymentGroupId/size, marker cũ kèm nhật ký | Nhóm chỉ khi có bằng chứng. Không gộp theo tên/ngày/số tiền. Nhóm thiếu phân bổ hoặc số dư sai bị chặn. |
| Nhắc nợ | reminderEvents + reminderTemplates | Append sự kiện xuất/gửi thủ công; lịch sử không biến mất khi nhãn24h hết hạn; đồng bộ độc lập không đổi số dư. |
| Phiên/PWA | localStorage bản nháp/theme; CacheStorage asset | Bản nháp không phải giao dịch. SW xóa cache asset có prefix của app, không phải xóa IDB. Origin/hồ sơ trình duyệt khác có kho riêng. |
| Hộp thư báo giá | kho/API riêng của hộp thư | JSON công nợ có thể kèm hộp thư cục bộ nhưng phục hồi hộp thư riêng có xác nhận; không đồng nghĩa đã sao lưu toàn bộ D1 hộp thư. |

## Phát hiện và rủi ro

| ID | Mức | Bằng chứng | Trạng thái / xử lý |
|---|---|---|---|
| A01 | Cao | Trước vá, `TGSyncCore.validate` chấp nhận quoteItems.quantity=-50 và unitPrice='INVALID' khi tổng đơn hợp lệ. | Đã thêm validateDetails trong core: từ chối số âm/không hữu hạn, danh sách/dòng sai kiểu; cho phép trường thiếu/blank và numeric string hợp lệ mà không chuyển đổi. Tổng đơn không đổi. Worker mô phỏng phải409, giữ cloud, outbox/bản local còn để đối chiếu. **Worker live chưa triển khai vá này**. |
| A02 | Trung bình | Worker import `./reminder-history.js` nhưng không có file trong sync; VM cũ strip import nên không thấy lỗi. | Sửa thành `../reminder-history.js`, test kiểm tra file import thực tồn tại. Chưa chạy nghiệm thu bundler/Worker live sau vá. |
| A03 | Cao | engine.backups.push(snapshot) trước mỗi pull/đối chiếu; sync_operations/nonces/rates chưa retention. | Chưa sửa: không tự xóa lịch sử để giảm dung lượng. Cần đo quota và chính sách snapshot/checkpoint/backup ngoài thiết bị trước phát hành. Có giới hạn snapshot server5MB và request1MB; queue được giữ khi lỗi nhưng có thể dừng đồng bộ. |
| A04 | Cao — chặn phát hành | Chưa có bản sao đã ẩn danh từ phiên bản đầu, chưa chạy Android↔PC/PWA thật. | CHƯA XÁC MINH tương thích toàn bộ lịch sử và nghiệm thu đa thiết bị vật lý. Không dùng fixture giả để kết luận thay thế. |
| A05 | Trung bình | JSON backup và localStorage/IDB không mã hóa ở cấp ứng dụng; SHA256 chỉ nhận diện byte. CSP vẫn có unsafe-inline. | Ai lấy được file/hồ sơ trình duyệt có thể đọc; không khẳng định an toàn tuyệt đối hay đã pentest XSS. Chủ sở hữu phải bảo vệ thiết bị/thư mục backup; không upload backup kinh doanh lên GitHub. |
| A06 | Trung bình | C.validate yêu cầu tổng đơn/thanh toán VND nguyên; local TGSafety/backup validator chưa đồng nhất kiểm tra lồng sâu. | Dữ liệu cũ có tiền lẻ/định dạng số địa phương có thể bị chặn sync. Không tự làm tròn hay sửa bản cũ. Cần preflight trên bản sao và hướng dẫn sửa riêng có xác nhận. Vá A01 không có nghĩa mọi đường nhập cục bộ đã được chứng nhận. |
| A07 | Trung bình | Sync client và Worker allowlist chỉ có alias staging A/B/C; dùng D1 staging riêng. | Đây là giới hạn chủ ý. Chưa có cấu hình production, cutover/D1 backup/rollback đã diễn tập. Không merge để thử bật sync production. |
| A08 | Thấp/giới hạn kiểm thử | Restore additive thêm audit nhập + snapshot trước nhập; recovery cục bộ không đồng bộ như nghiệp vụ. | Không yêu cầu hai thiết bị có recovery giống nhau; phải so các bản ghi nghiệp vụ/ID và số dư. Outbox/private device key không nằm trong backup thông thường; thiết bị thay mới cần kết nối lại đúng quy trình. |

Không phát hiện mất/sai lệch công nợ trong các ca tự động đã chạy. Điều này không chứng minh không còn lỗ hổng hoặc dữ liệu thật đã được bảo toàn sau nâng cấp trên mọi thiết bị.

## Đối soát phục hồi JSON — ứng dụng thật trong kho thử cô lập

| Chỉ tiêu | Trước xuất | Sau phục hồi | Kết quả |
|---|---:|---:|---|
| Khách hàng | 1 | 1 | PASS |
| NCC | 1 | 1 | PASS |
| Đơn/phiếu nhập | 2 | 2 | PASS |
| Hạng mục/vật tư | 3 | 3 | PASS |
| Dòng kích thước | 2 | 2 | PASS |
| Phân bổ thanh toán | 1 | 1 | PASS |
| Tổng đã thu khách | 0 | 0 | PASS |
| Còn phải thu | 4,301,000 | 4,301,000 | PASS |
| Đã trả NCC | 300,000 | 300,000 | PASS |
| Còn phải trả NCC | 500,000 | 500,000 | PASS |
| Lịch sử nhắc | 1 | 1 | PASS |
| Mẫu nhắc | 1 | 1 | PASS |
| Dấu vân tay nhập Excel | 1 | 1 | PASS |
| Thùng rác | 1 | 1 | PASS |
| Nhật ký | 6 | 7 | PASS — thêm đúng một bản ghi kỹ thuật |
| Bản phục hồi | 1 | 2 | PASS — thêm đúng một bản ghi kỹ thuật |

ID/nội dung bản ghi gốc được so trực tiếp; audit cũ vẫn nguyên, thêm đúng audit nhập; recovery thêm đúng snapshot trước nhập. Nhập lại cùng backup không đổi state; orphan bị chặn. Synthetic schema1 parse được mà input không mutate — **không phải bằng chứng dữ liệu đời đầu thật tương thích**.

## Đối soát đồng bộ A/B/C — tự động, không thiết bị vật lý

Mỗi checkpoint assert toàn bộ `C.records(device) == C.records(cloud)`, không chỉ kiểm tra tổng. So cả ID/payload hạng mục/kích thước/thanh toán/lịch sử nhắc; revision/backup thiết bị là metadata riêng.

| Bước | KH/NCC | Đơn | Thanh toán | Giá trị đơn KH | Đã thu | Thu tháng11 | Còn phải thu | Phải trả NCC | Nhắc |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| before | 2102/2 | 4 | 2 | 11,801,000 | 1,000,000 | 0 | 10,801,000 | 600,000 | 2 |
| created | 2102/2 | 5 | 2 | 12,701,000 | 1,000,000 | 0 | 11,701,000 | 600,000 | 2 |
| paid | 2102/2 | 5 | 3 | 12,751,000 | 1,050,000 | 50,000 | 11,701,000 | 600,000 | 2 |
| payment-edited-backdated | 2102/2 | 5 | 3 | 12,751,000 | 1,060,000 | 0 | 11,691,000 | 600,000 | 2 |
| payment-cancelled | 2102/2 | 5 | 2 | 12,751,000 | 1,000,000 | 0 | 11,751,000 | 600,000 | 2 |
| order-deleted | 2102/2 | 4 | 2 | 11,801,000 | 1,000,000 | 0 | 10,801,000 | 600,000 | 2 |
| trash-restored | 2102/2 | 5 | 3 | 12,751,000 | 1,060,000 | 0 | 11,691,000 | 600,000 | 2 |

Khác biệt giữa các bước là thao tác thử chủ động, không phải sai lệch nâng cấp. Xóa đơn thử sau hủy thanh toán đưa các chỉ tiêu nghiệp vụ trở lại baseline. Khôi phục thùng rác giữ đúng ID/ngày/số tiền đã sửa; thanh toán lùi tháng không tăng thu tháng11. Hạng mục3/dòng kích thước3 giữ nguyên ở tất cả checkpoint.

## Ma trận nghiệm thu

| Hạng mục | Kết quả | Bằng chứng/giới hạn |
|---|---|---|
| A tạo → B/C; B thu → A/C | PASS tự động | Worker/SQLite +3 fake IndexedDB; không Android↔PC thật |
| Tạo/sửa/xóa/khôi phục đơn; ngày gốc | PASS tự động | data-safety-sync checkpoint/ID/payload assertions |
| Sửa/backdate/hủy/khôi phục thanh toán | PASS tự động | Số dư đối soát từng bước, không tạo trùng |
| Mất mạng/mất ACK/gửi lặp | PASS tự động | Cùng operationId; cloud có1 payment, outbox gửi lại |
| Đồng thời sửa/xung đột/chọn phiên bản | PASS tự động | Giữ hai bản; thiếu lựa chọn và snapshot stale bị chặn; ghi thất bại rollback |
| Hỏng transaction/quota | PASS lỗi ghi mô phỏng; CHƯA KIỂM THỬ quota thật | main/cursor/outbox cùng transaction, không chứng minh mọi lỗi phần cứng |
| Báo giá chỉ1 đơn toàn hệ thống | PASS tự động | Hai thiết bị offline cùng quote,1 accepted; bản local bị từ chối vẫn giữ |
| Queue sau restart | PASS engine restart | Chưa mô phỏng kill tiến trình Android/đóng IDB thật; không gọi đó là PWA restart PASS |
| Thu hồi thiết bị/replay request | PASS tự động | request signed/replayed401; revoked không push được; offline queue còn |
| Dữ liệu lớn2100 bản ghi | PASS tự động | <=200 thay đổi/đợt onboarding; edits liên quan nguyên tử; không phải benchmark quota lâu dài |
| Backup/restore đủ nghiệp vụ + lịch sử | PASS tự động | actual app functions trong hai kho giả độc lập; JSON evidence |
| Tương thích dữ liệu từ phiên bản đầu | CHƯA XÁC MINH | Chưa có backup lịch sử được cung cấp |
| Android→PC và PC→Android | CHƯA KIỂM THỬ trong audit này | Không suy diễn từ tên A/B/C; cần chủ xưởng thực hiện checklist |
| Worker/D1 thật sau vá A01/A02 | CHƯA KIỂM THỬ | Chỉ metadata read-only; chưa deploy Worker mới |
| Security/end-to-end disaster recovery | CHƯA KIỂM THỬ đầy đủ | Không pentest toàn diện; chưa diễn tập khôi phục D1 production |

## Chạy lại và bằng chứng

Node24 (node:sqlite), dependencies trong sync/package.json; từ thư mục sync chạy `npm test` và `npm run test:data-safety`. Test không gọi Cloudflare hay dữ liệu thật. JSON evidence trong `docs/v2.3/evidence/`; nhật ký chạy lưu cùng thư mục. Validation tests xác nhận không coerce numeric string, không sửa bản gốc, Worker import giải quyết đúng file.

Nguồn trọng yếu: `index.html` init/save/commit; `restore-safe.js`; `file-tools.js` exportData; `backup-check.js`; `safety.js`; `sync/core.js`, `engine.js`, `client.js`, `worker.js`, `schema.sql`; `payment-groups.js`; `reminder-history.js`; `session-tools.js`; `sw.js`.

## Checklist Android và PC — chủ xưởng nghiệm thu

Chỉ dữ liệu giả ở alias staging A/B/C; không nhập dữ liệu thật vào preview. Trước thực hiện phải triển khai/đối chiếu Worker staging với commit sửa đã kiểm thử, kiểm tra quota và xuất backup ngoài trình duyệt. Mỗi bước ghi thiết bị/trình duyệt/phiên bản, số dư trước/sau, ảnh và PASS/FAIL.

- [ ] PC A và Android B/C mở đúng alias staging; ghi version và ID; duyệt đúng thiết bị, không chia sẻ key/token.
- [ ] Xuất JSON từng kho; lưu ngoài trình duyệt, đối chiếu số bản ghi, checksum và khả năng đọc. Nếu thiết bị đã có dữ liệu khác, xem trước/đối chiếu từng ID trước bật sync; không tự gộp theo tên/SĐT.
- [ ] A tạo đơn nhiều hạng mục/kích thước; B/C kiểm tra toàn bộ vật liệu, đơn giá, tổng tiền và ngày gốc.
- [ ] B thu một lần chia3 đơn; A/C hiển thị1 lần thu; sửa số tiền/ngày về tháng trước, kiểm tra số dư từng đơn và thu tháng hiện tại.
- [ ] Hủy đúng lần thu, kiểm tra thùng rác/nhật ký và số dư; khôi phục có xác nhận; không ảnh hưởng lần thu khác.
- [ ] Tạo/sửa/xóa đơn thử (không còn payment); xác minh A/B/C và khôi phục đúng ID.
- [ ] Android offline tạo/sửa; chuyển app/khóa màn hình/đóng PWA; mở lại thấy draft và queue; online lại đồng bộ1 lần. Thử chập chờn/mất ACK.
- [ ] A và B offline sửa cùng đơn; online xuất hiện xung đột; không tự chọn. Hủy giữ bản cũ; xem trước số dư và chọn rõ phiên bản; C nhận đúng; lưu được backup hai bản.
- [ ] Nhập lại báo giá/file cũ; không tạo payment/đơn trùng. Nhắc nợ trên A, B/C thấy lịch sử24h; không tự gửi tin.
- [ ] Thu hồi B; B không gửi/nhận server được, dữ liệu local/queue còn. Kết nối thiết bị mới theo quy trình, không chép private key.
- [ ] Trong hồ sơ trình duyệt thử thứ ba, restore JSON, so ID/count/totals/hạng mục/kích thước/payments/reminder. Nhập lại không tăng bản ghi.
- [ ] Chạy tải lâu dài gần ngưỡng5MB/quota thấp; chặn ghi phải thông báo, không báo thành công, không mất queue. Kiểm tra file phục hồi dùng được.
- [ ] Có backup lịch sử đã ẩn danh: so từng ID và tổng trước/sau. Nếu chưa có, giữ CHƯA XÁC MINH.

## Điều kiện mở cổng production

1. Worker staging mới được build/deploy và test live bằng dữ liệu giả, khớp nguồn đang nghiệm thu.
2. Chủ xưởng ký PASS Android/PC checklist; bằng chứng queue/restart/conflict/thu hồi thiết bị và số dư.
3. Thông qua chiến lược quota/retention/backup ngoài thiết bị và diễn tập restore D1 trong môi trường riêng.
4. Xác minh bản sao lịch sử hoặc chủ xưởng chấp nhận giới hạn bằng quyết định riêng, không gắn nhãn tương thích hoàn toàn.
5. Phương án production origin/Worker/D1/cutover/rollback được duyệt riêng. Chỉ phát hành khi có xác nhận mới.
