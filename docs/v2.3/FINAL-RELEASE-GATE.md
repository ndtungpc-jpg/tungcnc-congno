# V2.3 — Final release gate

Ngày 23/11/2026 (Việt Nam). **NO-GO. Chuẩn bị hoàn tất phần tự động; chưa đủ điều kiện xin phát hành.**
Không merge main hoặc triển khai Production trong nhiệm vụ này. PASS nghiệm thu PC/S24 không đồng nghĩa phê duyệt cutover. Tài liệu này thay thế kết luận/inventory cũ của `PRODUCTION-READINESS.md`; A03 không phải điều kiện của v2.3, vẫn để v2.4.

## 1. Gate thực tế

| Gate | Trạng thái | Bằng chứng / việc phải đóng |
| --- | --- | --- |
| RC1 đóng băng, không đổi UI/schema IDB | PASS kiểm tra nguồn | Baseline và manifest tại `RELEASE-CANDIDATE.md`; package chỉ chuyển môi trường và vá role |
| Đồng bộ lịch sử và hai chiều | PASS phạm vi nghiệm thu | `PC-S24-ACCEPTANCE-RESULT.md` |
| Regression, JSON/ZIP/Excel, quota, conflict, revoke | PASS tự động | `evidence/final/*.log` |
| Artifact Production không dùng stage origins/D1, cached assets đầy đủ | PASS kiểm thử artifact | `production-preparation.log`; wrappers mặc định khóa ghi |
| Sender bare hostname Production | PASS sau sửa đóng gói | Exact origin thay `origin.includes('.baogia-tungcnc.')`; suite inbox end-to-end chạy với hostname thật |
| Fail-closed 503 giữ snapshot job/main/cursor, retry | PASS độc lập | Actual generated wrapper + engine trên bản sao lịch sử, không false ACK |
| Restore baseline + giao dịch mới + retry | PASS SQLite độc lập | Restore database mới, phát lại signed delta bằng Worker, kiểm tra toàn state/versions/receipts; nguồn gốc giữ nguyên |
| Rollback code bằng Cloudflare deployment + reconnect thiết bị | CHƯA DIỄN TẬP thực tế | Chưa có Production Worker; cần canary riêng và rollback drill trước mở ghi Production |
| ZIP Android / Excel ứng dụng thật / JSON restore kho riêng | CHƯA NGHIỆM THU thiết bị | Checklist mục 5 |
| Airplane/reopen và giải quyết conflict bằng UI trên kho riêng | CHƯA NGHIỆM THU thiết bị | Mô phỏng đã PASS, không chứng nhận airplane/OS kill |
| Chênh lệch 119/118 do xóa TEST | PASS — CLOSED | Chủ xưởng xác nhận có chủ đích; backup119 → export118 chỉ khác đúng TEST/trash/audit/revision; hash D1 live khớp. Evidence test-deletion-*.json |
| Authoritative, kiểm kê mới và backup trước cutover mọi origin PC/S24 | OPEN | Chênh lệch đã giải thích; vẫn cần export Production mới và kiểm kê S24 để loại trừ giao dịch phát sinh sau backup |
| Production runtime bindings/secrets/approval trực tiếp | CHƯA DEPLOY, chưa xác minh live | Chỉ xác minh config package; resource inventory đọc-only |
| Backup độc lập trước cutover + restore kiểm tra | CHƯA ĐỦ bằng chứng hiện thời | Backup nghiệm thu cũ có; backup Production-PC vừa yêu cầu tải chưa xác nhận thành công; D1 Production trống chưa áp schema |
| Cho phép phát hành riêng của chủ xưởng | CHƯA YÊU CẦU | Chỉ xin sau các gate bắt buộc đã đóng |

## 2. Kiểm kê nguồn và lựa chọn authoritative

| Nguồn | Trạng thái đã quan sát | Quyết định |
| --- | --- | --- |
| PC A, device `8f9aa3a1-0b47-47b6-b4e9-cbb3d93696f9` | Acceptance endpoint; cursor2, queue0, không lỗi; 118 KH/619 đơn/46 payment | Ứng viên nguồn đã đối soát chênh lệch TEST; không đổi đích metadata đang enabled |
| S24 B, device `43609c24-dc34-4551-9fb7-9eb5d475bdb2` | Export nghiệm thu đã so khớp A/D1; cần export mới nếu phát sinh giao dịch | Không dùng số hiển thị đã làm tròn để đối soát |
| Acceptance D1 seq2 | 2.224 keyed records; 1.439 audit; 2 trash | Chứa lịch sử thật được chủ xưởng duyệt; không lấy D1 rehearsal |
| PC origin `https://tungcnc-congno.pages.dev/` | UI v2.1.12, integrity0 lỗi/0 cảnh báo; **119 đối tác/619 đơn/46 payment**; phải thu hiển thị1.250.365.237;118 khách có nợ | Đang có dữ liệu thật! Không ghi đè/import. Chênh lệch TEST đã xác nhận; backup119 đối soát từng ID với A PASS, chưa có export Production mới |
| S24 origin Production | CHƯA KIỂM KÊ | Chủ xưởng xuất riêng nếu đã dùng; origin khác không chia sẻ IDB |
| Rehearsal C | 1 khách giả/3 đơn/5 paymentrows, seq4, queue0 | Tuyệt đối loại khỏi cutover |

Bản A/B đã nghiệm thu: raw receivable `1250365237.2799997`, received `158896322.4`. Records hash `fef2d33ef5bfd3336ef022f1e76a6d9fa79874ddb6b5fa15622a9efc91e8c3bd`; root metadata bỏ technical recovery hash `5a5d56e24efdc102c8e5f171542fc020fb798d3886354f796eadbddc3636ff76`.
119→118 ở acceptance có thao tác đưa TEST id `90adbc6d-904e-4490-ac18-13812306aaa3` vào trash, nhưng **Đã chứng minh** đó là toàn bộ khác biệt giữa backup lịch sử119 và export PC nghiệm thu118 đang có; chủ xưởng xác nhận nguồn gốc chênh lệch Production-PC ngày23/11/2026. Không tự loại bản ghi chỉ vì tên TEST. Trước cutover vẫn cần export Production mới để kiểm tra giao dịch phát sinh sau backup theo toàn bộ ID/nội dung/root metadata, payment group/phân bổ/ngày, tổng theo KH/đơn và raw tổng. Nếu có giao dịch độc lập ở Production, bảo toàn và đối soát thủ công trên bản sao trước chọn snapshot; không tự merge theo tên/SĐT, không lấy timestamp mới hơn làm chuẩn.

Backup nguồn ban đầu đã kiểm tra độc lập: SHA256 `2841c2f2a16784ffd3941a68aedced88936f323ea7f84444e8e115bc096dd46b`. Đây là backup trước thay đổi TEST, không thay thế export cutover mới. Backup app không chứa private key; export đối soát không tự khôi phục signed outbox. Không chuyển pending bằng cách import JSON.

## 2a. Đóng blocker TEST — xác minh ngày23/11/2026

Chủ xưởng xác nhận chủ động xóa khách TEST khi bắt đầu nghiệm thu, không phải mất dữ liệu. **CLOSED riêng blocker chênh lệch119/118**; không phục hồi khách TEST, không sửa Production.

- Partner TEST: `90adbc6d-904e-4490-ac18-13812306aaa3`; không có đơn đang liên kết trong backup119.
- Trash: `aecbee9b-5a9d-48bd-9194-334c3322a6b8`, kind partners; record khớp nguyên bản TEST. Xóa lúc14:38:07 ngày23/11/2026 (Việt Nam).
- Audit: `b558f7aa-fc00-4ddf-946b-6fe82176f379`, action delete/kind partners, đúng recordId, before khớp nguyên bản, after=null.
- 118 partner còn lại khớp toàn nội dung theo ID; 619 đơn và46 payment khớp nguyên mảng, nên số tiền phân lẻ, ngày, chi tiết và phân bổ không thay đổi. 1.438 audit cũ,1 trash cũ, recovery và mọi trường root khác giữ nguyên; revision1→2 đúng một thao tác.
- Raw receivable `1250365237.2799997`, received `158896322.4` không đổi. Export cursor2/outbox0/conflict null.
- Đọc lại acceptance D1: seq2,2.224 records, hash `fef2d33ef5bfd3336ef022f1e76a6d9fa79874ddb6b5fa15622a9efc91e8c3bd`, TEST không active, đúng trash/audit. API rows_written0/changed_db=false.

Bằng chứng: `evidence/final/test-deletion-reconciliation.json`, `test-deletion-live-d1.json`; tái chạy read-only bằng `node scripts/audit-v23-test-deletion.cjs /private/backup119.json /private/accepted118.json`. Script từ chối mọi khác biệt ngoài một delete có trash/audit/revision tương ứng, kiểm tra SHA nguồn không đổi. Không đưa dữ liệu gốc vào Git.

Giới hạn: nguồn119 là backup độc lập đã nhận, không phải file export Production mới. Xác nhận chủ xưởng và phép đối soát này đủ đóng nguyên nhân119/118; không chứng nhận chưa có giao dịch mới ở mỗi origin. Fresh inventory/backup, device acceptance và rollback live vẫn OPEN; tổng thể NO-GO cho đến khi hoàn tất, không xin hoặc suy diễn quyền merge/deploy.

## 3. Tài nguyên Production — đọc-only

CF account `de5012d37eb79706d59ccc39e1cb8b74`. Evidence API `evidence/final/production-inventory.json`, `changed_db=false`, `rows_written=0`.

| Tài nguyên | ID/đích | Hiện trạng |
| --- | --- | --- |
| Sync D1 `tungcnc-sync-v23-prod` | `bacea568-a449-4f7e-b392-c6ed54b72c57` | Trống nghiệp vụ, chỉ `_cf_KV`; chưa schema/grant/device |
| Inbox D1 `tungcnc-quote-inbox-prod` | `78e3141d-d03c-4012-adff-e1c2002085fa` | Trống nghiệp vụ, chỉ `_cf_KV` |
| Sync Worker dự kiến | `https://tungcnc-sync-v23-prod.ndtung-pc.workers.dev` | Chưa tồn tại; config package DB→sync D1 trên |
| Inbox Worker dự kiến | `https://tungcnc-quote-inbox-prod.ndtung-pc.workers.dev` | Chưa tồn tại; config package DB→inbox D1 trên |
| Pages Công Nợ | `https://tungcnc-congno.pages.dev`, branch main | Deployment `f3f53157-2416-432e-89b2-beb975e00d5a`, commit `e4d6d39b7110f5fc44302aaaac3d26b42cc5f09f` |
| Pages Báo Giá | `https://baogia-tungcnc.pages.dev`, branch test/direct-quote-bridge | Deployment `61bc40ff-74db-4c1a-956c-5d00a57dd70a`, commit `ec021150698753f66e80f59ae2b0ae7bdab45f23`; output bao-gia |

Exact origins: sync chỉ Công Nợ Production; inbox chỉ Công Nợ/Báo Giá Production. CSP package connect-src chỉ self và endpoint Production tương ứng; không wildcard, preview, staging, rehearsal. Direct message sender allowlist cũng chỉ hai origin Production. Giữ DB `tunggiang-congno-v2`, version1/store state/key main, manifest id/scope/start_url và fallback hiện hành.

Không shared secret sync: private P-256 nonextractable sinh riêng từng origin/device, approve đúng public JWK/device/origin. Inbox token ngẫu nhiên sinh riêng, server chỉ SHA256, quyền sender/receiver/origin/revoke; không tái sử dụng stage token. `SESSION_SIGNING_KEY` trên stage inbox là binding cũ không được source hiện tại sử dụng; không chép vào prod. Không đọc/ghi secret values trong chuẩn bị.

## 4. Cutover và backup/rollback — chỉ thực hiện sau phê duyệt riêng

1. Chốt thời điểm ngừng nhập ở mọi origin PC/S24. Xuất riêng JSON + ZIP + đối soát mỗi nguồn; queue0/conflict null mới được tiếp tục. Pending thì gửi về đúng nguồn cũ rồi đối soát; không đổi API, không xóa queue hoặc IDB. Tất cả bản sao cất độc lập dưới quyền chủ xưởng và thử restore trong kho riêng.
2. Diff toàn bộ nguồn Production-PC/S24 với A/B theo ID, raw values, lịch sử và root metadata. Chủ xưởng chọn rõ authoritative, ghi số lượng, raw totals, canonical hash và file SHA256. Nếu chưa giải thích hết khác biệt: DỪNG.
3. Lưu release manifest, Pages deployment IDs, Worker modules/config/binding metadata không có secret, SQL riêng từng D1, bookmark, SHA256 và khóa/credentials theo chính sách chủ xưởng. SQL cần mở bằng SQLite/integrity_check và thử restore database mới. Backup SQL trung tâm không bao gồm giao dịch offline chưa gửi.
4. Recheck account + cả hai UUID Production và không có dữ liệu nghiệp vụ. Nếu populated bất ngờ: DỪNG, export/đối soát/cách ly, không apply schema hoặc bootstrap để ghi đè. Không sử dụng D1 stage/acceptance làm đích.
5. Sau phê duyệt triển khai: áp từng schema package vào đúng D1 trống, deploy Workers mặc định `RELEASE_WRITES=blocked`; verify live bindings/CSP/origins/read+denied write. Không mở ghi nếu runtime khác manifest. Thực hiện canary/rollback code trên Worker/D1 độc lập trước.
6. Phát hành đúng Pages artifact đã duyệt, không thay đổi Production branch ngầm. PC Production origin giữ DB đang có. Nếu local khác authoritative, KHÔNG import đè; dừng để duyệt phương án tiếp nhận có preview trên bản sao. Không tự đổi metadata sync đã enabled. Thiết bị Production tạo ID/khóa mới vì origin khác A/B, không yêu cầu khớp ID A cũ.
7. Chỉ sau khi mọi gate đóng và owner cho mở enrollment: enable writes có kiểm soát, register/approve đúng PC Production ID/origin. Xem preview snapshot chưa gửi; ghi **device mới + snapshot hash + SHA backup + backup_ref**. Grant guard target production-v23 chỉ sau owner xác nhận; binding D1 trống phải kiểm tra lại. Tiếp theo hai checkbox xác nhận và gửi đúng một compressed atomic request. Không chia batch2.223change. Hash/limits sai: giữ dữ liệu, dừng.
8. Đối soát PC/D1 toàn ID, raw tổng, payments/phân bổ/ngày/history, versions và receipt. Retry cùng operationId sau mất ACK; không tạo bootstrap mới nếu đã commit. Giữ bản local job khi offline. Không cấp grant khác để ghi đè. Bootstrap chỉ seq0, target đúng, backup_ref có, device được duyệt; mọi điều kiện checked lại trong transaction.
9. S24 mở đúng Production origin, xuất/kiểm kê local trước. Register/approve ID/khóa Production mới. Local trống mới receive; local khác thì preview/conflict rõ ràng, không tự ưu tiên server. Sau nhận xuất đối soát cả hai, queue0/conflict null, toàn ID/hash/raw totals khớp D1. Không dùng khách/đơn thanh toán giả kiểm thử sổ thật.
10. Backup độc lập sau cutover cho **cả hai D1**, verify SQLite + restore đích mới, ghi seq/bookmark và thời điểm. Duy trì exports từng thiết bị cho pending chưa gửi. RPO phải bao gồm pending thiết bị; chưa đo thời gian thực thì không công bố RTO/RPO đã đạt.

Giới hạn thực thi: snapshot5.000.000byte; request1.000.000byte; tối đa2.000change/operation; bootstrap nén nguyên tử; snapshot giải nén và state+versions/receipt mỗi dòng D1 giới hạn an toàn1.900.000byte, base64 tối đa800.000. Số snapshot5MB không bảo đảm D1 nhận được; guard giới hạn thấp hơn vẫn áp dụng. Bản lịch sử nghiệm thu khoảng1,65MB snapshot/1,76MB row/222KB request, còn ít dư địa row. Đo lại trên snapshot cuối, vượt bất cứ ngưỡng nào đều dừng. A03 không triển khai và không chia transaction để né giới hạn.

**Rollback:** khóa ghi server trước, thông báo ngừng nhập mọi thiết bị, export pending/main/conflict + backup SQL mới nhất và mọi operation sau backup. Không rollback mù về v2.1.12 khi có giao dịch v2.3: bản cũ không xếp outbox. Ưu tiên Worker fail-closed + forward fix; chỉ rollback artifact RC1 tương thích metadata đã diễn tập. Nếu cần khôi phục dữ liệu, restore baseline vào D1 MỚI, phát lại signed/reconciled delta theo operationId và so toàn ID/versions/receipt; nếu thiếu delta/pending/key thì DỪNG để điều tra, không mở ghi. Không replay receipts bằng SQL đè state, không khôi phục đè D1 nguồn hoặc nhập JSON để giả khôi phục queue. Giữ nguyên nguồn và chứng cứ. Diễn tập SQLite đã PASS không thay thế drill Cloudflare binding/cutback.

## 5. Thao tác bắt buộc trên PC và S24

Chỉ thực hiện giao dịch/restore/conflict trên **kho thử riêng**, không dùng sổ thật. Nếu trang thử không có chức năng yêu cầu thì dừng và báo, không thử bằng production data.

1. PC: gửi file `TG_Production_PC_PreCutover_2026-11-23.json` đã tải nếu có; nếu chưa tải, vào Production → Dữ liệu → Sao lưu JSON và giữ riêng tên. S24: mở Production origin, chụp số lượng/integrity và xuất riêng nếu đã dùng; không import. Xuất đối soát mới A/B để kiểm tra queue/conflict nếu đã nhập thêm.
2. S24 Chrome và PWA: trong staging đã duyệt, xuất ZIP sao lưu; mở bằng Files, kiểm tra có backup.json/backup.xlsx/SHA256.json, gửi ZIP để kiểm tra hash. Mở XLSX bằng Excel/WPS, kiểm tra9sheet, ID/SĐT/ngày/phân bổ và khoản có phần lẻ so với JSON; không chỉ nhìn định dạng đã làm tròn.
3. Phục hồi JSON vào browser profile/kho IDB nghiệm thu hoàn toàn riêng, export lại và so từng ID/tổng; thử cancel giữ nguyên và file lỗi từ chối. Không làm bước này trên profile Production hoặc A/B đang giữ sổ thật.
4. Trên rehearsal riêng: airplane ON, tạo khoản thu giả, queue1 và chưa báo synced; đóng/mở lại tab/PWA vẫn giữ đúng ID/queue. Airplane OFF → retry, cả hai cursor bằng nhau/queue0, chỉ1payment. Đây là nghiệm thu mạng vật lý còn thiếu; không tuyên bố OS-kill/power-loss nếu chưa thử.
5. Kho riêng có UI conflict: hai máy offline sửa cùng ID khác nhau; reconnect phải báo conflict và giữ cả bản local/server; owner preview/chọn rõ, export trước/sau, so không mất thanh toán. Gửi evidence/export; không thao tác tương tự trên khách thật.

**Chỉ đề nghị GO** sau khi source difference được giải thích và owner chọn authoritative; backup/restore độc lập đầy đủ; các kiểm thử thiết bị và canary/rollback live bắt buộc PASS; artifact/binding live được duyệt. Khi đó trình tóm tắt snapshot hash/device/D1/manifest và xin **phê duyệt phát hành riêng**, không dùng nhiệm vụ chuẩn bị làm quyền triển khai.
