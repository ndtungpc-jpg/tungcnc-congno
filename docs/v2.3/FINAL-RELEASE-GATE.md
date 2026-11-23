# V2.3 — Final release gate

Ngày23/11/2026 (Việt Nam). **NO-GO Production; tiếp tục RC1 trên Free. Canary/rollback và bản tối ưu delta đã kiểm thử; còn file PC119 cuối, nghiệm thu thiết bị, CPU dư địa nhỏ và phương án recovery khi đủ10 D1.**

**Nguồn authoritative đã được chủ xưởng chọn: PC Production, giữ nguyên119 đối tác bao gồm TEST. Không sử dụng bản nghiệm thu118 hoặc canary để khởi tạo Production.** S24 Production chưa từng dùng theo xác nhận chủ xưởng; chưa kiểm IndexedDB thực tế, phải kiểm trước nhận.
Không merge main hoặc triển khai Production trong nhiệm vụ này. PASS nghiệm thu PC/S24 không đồng nghĩa phê duyệt cutover. Tài liệu này thay thế kết luận/inventory cũ của `PRODUCTION-READINESS.md`; A03 không phải điều kiện của v2.3, vẫn để v2.4.

## 1. Gate thực tế

| Gate | Trạng thái | Bằng chứng / việc phải đóng |
| --- | --- | --- |
| RC1 đóng băng, không đổi UI/schema IDB | PASS kiểm tra nguồn | Baseline UI giữ nguyên; bản vá CPU/khóa bootstrap/cursor được ghi tại `FREE-CPU-VALIDATION.md`; không A03 hoặc đổi schema IndexedDB |
| Đồng bộ lịch sử và hai chiều | PASS phạm vi nghiệm thu | `PC-S24-ACCEPTANCE-RESULT.md` |
| Regression, JSON/ZIP/Excel, quota, conflict, revoke | PASS tự động | `evidence/final/*.log` |
| Artifact Production không dùng stage origins/D1, cached assets đầy đủ | PASS kiểm thử artifact | `production-preparation.log`; wrappers mặc định khóa ghi |
| Sender bare hostname Production | PASS sau sửa đóng gói | Exact origin thay `origin.includes('.baogia-tungcnc.')`; suite inbox end-to-end chạy với hostname thật |
| Fail-closed 503 giữ snapshot job/main/cursor, retry | PASS độc lập | Actual generated wrapper + engine trên bản sao lịch sử, không false ACK |
| Restore baseline + giao dịch mới + retry | PASS SQLite độc lập | Restore database mới, phát lại signed delta bằng Worker, kiểm tra toàn state/versions/receipts; nguồn gốc giữ nguyên |
| Rollback code Cloudflare + reconnect client | PASS canary thực tế | API đổi100% traffic A→B→A→B, pending được giữ, retry đúng1payment; Node clients, không phải OS/thiết bị thật |
| Live same-ID conflict/explicit resolution | PASS canary protocol | Giữ hai candidates, explicit choice, recovery backup; cuối seq5/5receipts, full hashes khớp |
| CPU/quota Workers Production | CÓ ĐIỀU KIỆN, chưa PASS tuyệt đối10ms | Chỉ Free. Ghi cuối15 mẫu: 14 mẫu≤10ms, lần ghi đầu11ms; vòng trước có20ms. Không chứng nhận mọi request≤10ms. Bootstrap owner-admin1SQL đã PASS, không chạy Worker lớn. Xem FREE-CPU-VALIDATION.md; gói cpu_ms1000 cũ bị thay thế, không dùng |
| ZIP Android / Excel ứng dụng thật / JSON restore kho riêng | CHƯA NGHIỆM THU thiết bị | Checklist mục 5 |
| Airplane/reopen và giải quyết conflict bằng UI trên kho riêng | CHƯA NGHIỆM THU thiết bị | Mô phỏng đã PASS, không chứng nhận airplane/OS kill |
| Chênh lệch 119/118 do xóa TEST | PASS — CLOSED | Chủ xưởng xác nhận có chủ đích; backup119 → export118 chỉ khác đúng TEST/trash/audit/revision; hash D1 live khớp. Evidence test-deletion-*.json |
| Authoritative | OWNER CONFIRMED | PC Production119 giữ TEST; A/B118 chỉ là bằng chứng nghiệm thu |
| File nguồn mới + backup trước cutover và S24 local storage | OPEN | PC đã yêu cầu tải JSON nhưng chưa đọc/kiểm hash file; S24 owner-confirmed chưa dùng, IndexedDB thực tế chưa kiểm |
| Production runtime bindings/secrets/approval trực tiếp | CHƯA DEPLOY, chưa xác minh live | Chỉ xác minh config package; resource inventory đọc-only |
| Backup độc lập trước cutover + restore kiểm tra | CHƯA ĐỦ bằng chứng hiện thời | Backup nghiệm thu cũ có; backup Production-PC vừa yêu cầu tải chưa xác nhận thành công; D1 Production trống chưa áp schema |
| Cho phép phát hành riêng của chủ xưởng | CHƯA YÊU CẦU | Chỉ xin sau các gate bắt buộc đã đóng |

## 2. Kiểm kê nguồn và lựa chọn authoritative

| Nguồn | Trạng thái đã quan sát | Quyết định |
| --- | --- | --- |
| PC A, device `8f9aa3a1-0b47-47b6-b4e9-cbb3d93696f9` | Acceptance endpoint; cursor2, queue0, không lỗi; 118 KH/619 đơn/46 payment | CHỈ THAM CHIẾU nghiệm thu, không phải nguồn cutover; không đổi đích metadata đang enabled |
| S24 B, device `43609c24-dc34-4551-9fb7-9eb5d475bdb2` | Export nghiệm thu đã so khớp A/D1; cần export mới nếu phát sinh giao dịch | CHỈ THAM CHIẾU nghiệm thu; không chép ledger118 sang Production |
| Acceptance D1 seq2 | 2.224 keyed records; 1.439 audit; 2 trash | CHỈ THAM CHIẾU; không dùng D1 acceptance làm nguồn khởi tạo Production |
| PC origin `https://tungcnc-congno.pages.dev/` | UI v2.1.12, integrity0 lỗi/0 cảnh báo; **119 đối tác/619 đơn/46 payment**; phải thu hiển thị1.250.365.237;118 khách có nợ | NGUỒN CHÍNH do chủ xưởng chọn, giữ119 gồm TEST. Không ghi đè/import; cần đọc JSON mới nhất để chốt hash |
| S24 origin Production | OWNER CONFIRMED chưa từng nhập dữ liệu, chỉ dùng nghiệm thu | Vẫn kiểm IDB thực tế0/0/0 trước đồng bộ; nếu không trống thì dừng/backup riêng |
| Rehearsal C | 1 khách giả/3 đơn/5 paymentrows, seq4, queue0 | Tuyệt đối loại khỏi cutover |

**Hash và số lượng dưới đây thuộc bản A/B118, không phải hash nguồn Production119 cuối.** Bản A/B đã nghiệm thu: raw receivable `1250365237.2799997`, received `158896322.4`. Records hash `fef2d33ef5bfd3336ef022f1e76a6d9fa79874ddb6b5fa15622a9efc91e8c3bd`; root metadata bỏ technical recovery hash `5a5d56e24efdc102c8e5f171542fc020fb798d3886354f796eadbddc3636ff76`.
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

Giới hạn: nguồn119 là backup độc lập đã nhận, không phải file export Production mới. Xác nhận chủ xưởng và phép đối soát này đủ đóng nguyên nhân119/118; không chứng nhận chưa có giao dịch mới ở mỗi origin. Fresh inventory/backup và device acceptance vẫn OPEN; rollback live đã được bổ sung ở mục2b; tổng thể NO-GO cho đến khi hoàn tất, không xin hoặc suy diễn quyền merge/deploy.

## 2b. Canary và rollback Cloudflare thực tế — 23/11/2026

- D1 mới riêng `tungcnc-v23-canary-sync-20261123` UUID `5075bdfd-c1df-472d-904c-6539a9e9f3d5`, kiểm trống trước áp schema; chỉ dữ liệu giả. Tạo D1 inbox thứ11 bị403/code7406: giới hạn10database/account. Không xóa database để né quota. Hai Worker canary dùng hai nhóm bảng riêng trên D1 mới này; **không tuyên bố đã thử tách hai D1 canary**. Production vẫn hai UUID riêng đã chuẩn bị.
- Sync canary version A khóa ghi `a3d28fa5-f90d-43b1-9d36-c243278463fa`; B enabled chỉ thử `7c0d4e4c-2c55-4769-bf29-cc323c127039`. Inbox A `2dd4e3ff-f2af-4114-a752-a3c55bb1a85f`; B `91a74b75-eb7d-41fc-b34d-62355c521d14`.
- Live fail-closed503, staging origin403, OPTIONS204; enrollment pending/approve đúng ID. Một snapshot **giả**1.737.872byte, row1.812.401byte, request295.855byte đã commit nguyên tử và client khác nhận chính xác. Không gửi snapshot thật tới canary.
- Tạo giao dịch sau bootstrap/backup boundary; retry operationId không trùng. Tạo quote/claim/import qua hostname Production giả lập Origin; một fixture tay sai type/sizes bị400 đúng, đã sửa fixture rồi chạy lại, không sửa runtime để nới validation.
- Rollback bằng deployment API100% trở về đúng A. Ledger seq2/hash `465bec92790413c42497086318b7dbb715e43d9f440b24d8065a516cb7fdb65e`, operations hash `1d1c57fe3c3251f812adb2efd7ed349cfbc57b9600e5987f2f6d905b2c35ebd2`, inbox hash `acc9dde0cfd7c034d8fe32a09af5877dc9f5dd538fbbf14690aad86fc1dceff7` giữ nguyên hoàn toàn. Client giữ main/outbox/cursor và khoản thu mới chưa gửi; inbox GET được/POST503. Không restore đè D1.
- Deploy lại B, pending được commit đúng1lần; hai clients seq3/queue0; quote cũ vẫn duplicate. Sau đó sửa cùng ID trên hai clients, giữ hai candidates, preview/chọn local rõ ràng; kết quả seq5/5receipts,48payments, hash records `803cfc865bcb3b68abd5f98a54ce46409908ebf65eb2e3510868e997c4b02bd4` khớp client/server, payments không bị mất.
- Đã quay về A và xác minh503. `/settings` có thể hiển thị bindings của bản upload mới nhất B dù traffic đã rollback A; vì vậy kiểm deployment active→GET version resources.bindings + HTTP thực tế, không chỉ nhìn settings.
- Để chủ xưởng nghiệm thu UI thật, sau drill tạo version C **chỉ cho origin canary UI riêng**, trả403 với Production origin; bật ghi canary cho các thiết bị còn pending approval, không bật Production. Link/chi tiết ở `CANARY-DEVICE-FINAL-STEPS.md`; pinned shell chỉ proxy GET asset RC1 immutable, không có D1 binding, không forward cookie/body/dữ liệu người dùng. Cảnh báo dữ liệu giả chỉ ở canary, không đổi UI sản phẩm.

Evidence: `live-canary.json`, `canary-cloudflare-proof.json`, `canary-final-server.json`, `canary-ui-smoke.json`, `canary-ui-deployment.json`. Script tái tạo `scripts/canary-v23-live.cjs` dùng Node clients bộ nhớ, private key không export; không chứng nhận durable OS storage. Khôi phục baseline+delta vào SQLite mới đã PASS ở production-preparation.log và production-119-config-test.log. **Chưa restore mới trên Cloudflare D1 với ledger lớn vì không còn slot D1**; row lớn phải dùng bound parameters/batch nguyên tử trên đích mới, không dùng literal SQL INSERT vượt100KB. Không xóa/ghi đè nguồn để diễn tập.

## 2c. Kiểm tra dung lượng, CPU và cấu hình cuối

File119 lịch sử đã có, SHA256 `2841c2f2a16784ffd3941a68aedced88936f323ea7f84444e8e115bc096dd46b`: snapshot1.647.911, state+versions+op1.760.541, request222.347, receipt row1.648.289byte, TEST vẫn active; tất cả byte guard PASS. Headroom state chỉ139.459byte so ngưỡng1.900.000. Đây là **reference file preflight, không phải snapshot PC cuối mới nhất**. Script `measure-v23-source.cjs` đọc-only để đo lại đúng JSON mới; file JSON backup8,8MB gồm recovery cục bộ không đồng nghĩa sync snapshot vượt5MB.

Guard ứng dụng: snapshot5.000.000byte; request1.000.000byte; base64≤800.000; giải nén/state row/receipt≤1.900.000; ordinary operation≤2.000changes; client reconcile≤900.000byte; inbox≤250.000byte,≤300items,≤1.000sizes/item. Vượt bất cứ guard nào: dừng, không chia nhỏ hoặc làm tròn.

Theo [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) kiểm23/11: string/blob/row2.000.000byte, SQL100.000byte,100bound params/query, query duration30s; Free50queries/invocation. SQL runtime dùng bind nên không nhúng snapshot thành SQL literal. Theo [Workers limits](https://developers.cloudflare.com/workers/platform/limits/): memory128MB/isolate, Free10msCPU và100.000requests/ngày/account; request network Free100MB không thay thế guard ứng dụng1MB.

GraphQL analytics09:26–09:38UTC cũ có sync p99=121.505ms/inbox p99=4.485ms; đây là aggregate, **không phân loại bootstrap/delta** và không còn là số đo của bản vá mới. Đã thay bằng invocation logs từng endpoint/operation: bootstrap Worker139ms; delta cũ27–53ms; bản cuối15ghi có14mẫu≤10ms, một lần11ms. Chi tiết và mọi giới hạn tại FREE-CPU-VALIDATION.md. Không đánh PASS tuyệt đối10ms, cũng không dùng số aggregate cũ để yêu cầu Paid. Billing Read403 nên cần owner xác nhận Free. **Cấu hình cpu_ms1000/requiresWorkersPaid cũ bị hủy sử dụng**; package mới chỉ Free/defaultCPU, public bootstrap disabled và RELEASE_WRITES=blocked. Còn cần slot recovery độc lập, không A03.

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
2. Nguồn đã được chọn: PC Production119, giữ TEST và mọi dữ liệu gốc. Đọc JSON mới nhất, so ID/raw values/lịch sử với backup119 trước; ghi totals/hash/file SHA256. A/B118 chỉ tham chiếu giải thích TEST, không sao chép tombstone/xóa TEST sang Production. S24 owner-confirmed chưa dùng vẫn cần xác minh local trống. Khác biệt mới chưa giải thích: DỪNG.
3. Lưu release manifest, Pages deployment IDs, Worker modules/config/binding metadata không có secret, SQL riêng từng D1, bookmark, SHA256 và khóa/credentials theo chính sách chủ xưởng. SQL cần mở bằng SQLite/integrity_check và thử restore database mới. Backup SQL trung tâm không bao gồm giao dịch offline chưa gửi.
4. Recheck account + cả hai UUID Production và không có dữ liệu nghiệp vụ. Nếu populated bất ngờ: DỪNG, export/đối soát/cách ly, không apply schema hoặc bootstrap để ghi đè. Không sử dụng D1 stage/acceptance làm đích.
5. Sau phê duyệt triển khai: áp từng schema package vào đúng D1 trống, deploy Workers mặc định `RELEASE_WRITES=blocked`; verify live bindings/CSP/origins/read+denied write. Không mở ghi nếu runtime khác manifest. Thực hiện canary/rollback code trên Worker/D1 độc lập trước.
6. Phát hành đúng Pages artifact đã duyệt, không thay đổi Production branch ngầm. PC Production origin giữ DB đang có. Không nhập backup nghiệm thu hoặc sửa PC Production để khớp118. Nguồn là dữ liệu PC hiện tại119; nếu export cuối khác bản đã đối soát thì dừng cập nhật hash/đối soát, KHÔNG import đè. Không tự đổi metadata sync đã enabled. Thiết bị Production tạo ID/khóa mới vì origin khác A/B, không yêu cầu khớp ID A cũ.
7. Chỉ sau phê duyệt triển khai/mở enrollment riêng: register/approve đúng PC Production device/origin; ngừng nhập tại thời điểm chốt, xuất JSON mới, kiểm pending/conflict và lưu bản sao độc lập. Tạo kế hoạch offline bằng `scripts/prepare-v23-owner-initial.cjs`; đối chiếu device/hash/SHA nguồn/backup_ref/UUID và byte của cả state lẫn receipt. **Public bootstrap lớn bị khóa trên gói Free.** Trình chủ xưởng bảng kiểm cụ thể trước gửi dữ liệu thật.
8. Sau xác nhận riêng: chỉ trên đúng D1 Production còn trống mới áp optional `owner-admin-initial.sql` và grant đúng device/hash/backup_ref/target production-v23. Gửi **một INSERT có bound parameters** bằng API quản trị; trigger kiểm grant/đích, ghi snapshot+versions+receipt và tiêu thụ grant trong cùng transaction. Không chia2.223change, không dùng literal SQL1,7MB. Lỗi/mất ACK: kiểm receipt và full snapshot hash, retry cùng operationId/body; không lập operation mới. Kiểm PC/D1 mọi ID, giá trị gốc, phân bổ/ngày/history/rootmetadata/versions trước tiếp nhận trên PC. PC có sẵn dữ liệu chỉ resolve sau preview chứng minh0khác biệt; không gửi lại2.223delta.

9. S24 mở đúng Production origin, xuất/kiểm kê local trước. Register/approve ID/khóa Production mới. Local trống mới receive; local khác thì preview/conflict rõ ràng, không tự ưu tiên server. Sau nhận xuất đối soát cả hai, queue0/conflict null, toàn ID/hash/raw totals khớp D1. Không dùng khách/đơn thanh toán giả kiểm thử sổ thật.
10. Backup độc lập sau cutover cho **cả hai D1**, verify SQLite + restore đích mới, ghi seq/bookmark và thời điểm. Duy trì exports từng thiết bị cho pending chưa gửi. RPO phải bao gồm pending thiết bị; chưa đo thời gian thực thì không công bố RTO/RPO đã đạt.

Giới hạn thực thi delta: snapshot5.000.000byte; request1.000.000byte; tối đa2.000change/operation; state+versions/receipt mỗi dòng D1 giới hạn an toàn1.900.000byte. Production Free dùng khởi tạo quản trị1SQL nguyên tử, public bootstrap nén bị khóa; các giới hạn request/base64 của route nghiệm thu cũ không được dùng làm cơ chế Production. Số snapshot5MB không bảo đảm D1 nhận được; guard giới hạn thấp hơn vẫn áp dụng. Bản lịch sử nghiệm thu khoảng1,65MB snapshot/1,76MB row/222KB request, còn ít dư địa row. Đo lại trên snapshot cuối, vượt bất cứ ngưỡng nào đều dừng. A03 không triển khai và không chia transaction để né giới hạn.

**Rollback:** khóa ghi server trước, thông báo ngừng nhập mọi thiết bị, export pending/main/conflict + backup SQL mới nhất và mọi operation sau backup. Không rollback mù về v2.1.12 khi có giao dịch v2.3: bản cũ không xếp outbox. Ưu tiên Worker fail-closed + forward fix; chỉ rollback artifact RC1 tương thích metadata đã diễn tập. Nếu cần khôi phục dữ liệu, restore baseline vào D1 MỚI, phát lại signed/reconciled delta theo operationId và so toàn ID/versions/receipt; nếu thiếu delta/pending/key thì DỪNG để điều tra, không mở ghi. Không replay receipts bằng SQL đè state, không khôi phục đè D1 nguồn hoặc nhập JSON để giả khôi phục queue. Giữ nguyên nguồn và chứng cứ. Diễn tập SQLite đã PASS không thay thế drill Cloudflare binding/cutback.

## 5. Bàn giao thao tác cuối tối giản

Hướng dẫn cụ thể: [CANARY-DEVICE-FINAL-STEPS.md](CANARY-DEVICE-FINAL-STEPS.md).

1. Gửi JSON PC Production119 mới nhất; S24 mở Production → kiểm tra kho0/0/0, không nhập/sync.
2. Hai máy mở link canary riêng, bật đồng bộ và gửi2mã thiết bị; chỉ approve trên D1 canary. Nhận dữ liệu giả rồi làm ZIP/Excel/JSON-restore cùng một lượt.
3. Gộp airplane/reopen/pending và same-ID UI conflict thành một lượt trên canary; gửi2export/ảnh, không thao tác thử trên sổ thật.
4. Xác nhận Dashboard đang Workers Free (API billing403, chưa thể tự chứng nhận gói). Không nâng cấp. Account đã10/10D1: cần phương án sao lưu/đối soát kho thử rồi phê duyệt riêng giải phóng một slot phục hồi; chưa xóa D1 nào.

Còn chặn: chưa đọc file PC cuối và kiểm backup độc lập; S24 IndexedDB thực tế chưa kiểm; ZIP/PWA/Excel/JSON-restore/airplane/UI-conflict vật lý chưa có bằng chứng; CPU lần đầu11ms chưa đạt tiêu chí mọi request≤10ms, gói tài khoản và slot recovery chưa xác minh/đóng. Không dùng tối ưu không thiết yếu để mở rộng phạm vi; không đổi sang Paid. Canary/rollback protocol đã PASS không thay các bước OS/UI. D1 Production còn trống nghiệp vụ, Worker Production chưa tồn tại nên binding/live write-lock Production chỉ được kiểm sau phê duyệt triển khai riêng; không coi đó là việc được phép làm trong chuẩn bị.

Chỉ sau các gate trên mới lập đề nghị phê duyệt phát hành riêng với file PC119/hash/device Production mới/D1 UUID/backup_ref/manifest. Không bootstrap dữ liệu thật, merge main hoặc mở ghi Production khi chưa được phê duyệt riêng.

## 6. Cập nhật phạm vi Free — 23/11/2026

Phương án đơn giản nhất giữ RC1: IndexedDB mỗi máy; khởi tạo quản trị nguyên tử một lần sau phê duyệt; sau đó delta tự động sau lưu/online/hiện trang và kiểm tra mỗi60giây khi trang đang mở. Không realtime, không A03, không thêm UI, không Paid. Khi offline hoặc trang ẩn không polling; Android đóng ứng dụng không được hứa chạy nền.

Bản vá mới đã PASS regression, safety,59ca differential validation, owner-admin rollback/retry, generated Production package và toàn ID/hash/metadata trên3client mô phỏng độc lập. Cloudflare cuối49request đã ghép ray đầy đủ;15ghi và15retry, không lỗi1102, dữ liệu khớp. CPU nhỏ nhưng có1mẫu11ms nên ghi rõ **chưa PASS tuyệt đối10ms**; đây không phải bằng chứng mất dữ liệu hoặc lý do nâng gói. Số liệu theo endpoint, giới hạn và chứng cứ: [FREE-CPU-VALIDATION.md](FREE-CPU-VALIDATION.md).

Production kiểm lại read-only20:19 ngày23/11 (VN): hai UUID trên vẫn chỉ `_cf_KV`, rows_written0, changed_db=false; hai Worker Production chưa tồn tại. Evidence `evidence/free-cpu/production-readonly-inventory.json`. Cấu hình Free đã kiểm TOML/binding/origin/CSP/khóa ghi mặc định; binding/khóa runtime Production chưa tồn tại nên không đánh PASS live.

Gói Production cũ có `cpu_ms=1000`/requiresWorkersPaid đã **SUPERSEDED — KHÔNG TRIỂN KHAI**. Gói chuẩn bị mới không cấu hình nâng CPU, public bootstrap disabled, writeblocked. Chỉ đề nghị phê duyệt phát hành riêng sau kiểm nguồn/backup, thiết bị và quyết định CPU/recovery có bằng chứng; không tự merge/main/deploy/bootstrap/mở ghi.
