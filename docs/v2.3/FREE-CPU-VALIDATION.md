# V2.3 RC1 — kiểm chứng Cloudflare Free

Ngày23/11/2026. Phạm vi: một người,2–3thiết bị, IndexedDB offline, đồng bộ delta khi có Internet. Không A03/v2.4, không UI mới, không Paid, không Production deployment.

**Kết luận:** phương án RC1 đã giảm đáng kể CPU và bảo toàn dữ liệu qua các phép thử. Chưa GO Production: còn nguồn PC119 cuối/backup, nghiệm thu thiết bị, slot phục hồi và xác nhận tài khoản Free. Không đánh dấu PASS tiêu chí “mọi request≤10ms”: vòng cuối có lần ghi đầu11ms; vòng trước20ms. Không hứa vận hành vô hạn trong snapshot một dòng.

## Số đo tách bootstrap và delta

Dùng invocation log `cpuTimeMs`, ghép đúng `cf-ray` với phase/request, không dùng thời gian HTTP hoặc CPU Node thay CPU Worker. Chỉ lưu ray/path/status/CPU/wall/outcome/version; không xuất headers/khóa/IP/geo. Dữ liệu Cloudflare hoàn toàn giả119partner/619order/46payment/1.438audit, UUID36ký tự, snapshot1.647.911byte bằng bản lịch sử đã biết. Đây là kiểm thử cùng quy mô, **không phải nghiệm thu snapshot PC Production mới nhất**.

| Bản / thao tác | Mẫu | CPU thực tế ms | Kết luận |
| --- | ---: | --- | --- |
| RC1 cũ: bootstrap nén qua Worker | 1 | 139 | Không thích hợp Free10ms |
| RC1 cũ: delta nhỏ, vòng đầu | 10 | 27–53 | Cần sửa, không thể gộp lỗi vào bootstrap |
| RC1 cũ, traces tắt, vòng so sánh | 15 | 48–109 | Tắt tracing riêng không giải quyết thuật toán |
| Khởi tạo quản trị một SQL + trigger | 1 import + fault/retry | 0 invocation bootstrap Worker | PASS nguyên tử/hash/quyền/đích trống; CPU D1 không phải CPU Worker |
| Bản SQL tối ưu trước guard cuối | 15 ghi | 6–20 (lần đầu20) | 14mẫu≤10, không PASS tuyệt đối10ms |
| Bản RC1 cuối: xác thực `/api/device` | 5 | 1–3 | PASS mẫu đã chạy |
| Pull delta rỗng `/api/sync/pull` | 5 | 2–3 | PASS mẫu đã chạy |
| Chẩn đoán `/api/sync/status` | 5 | 7–9 | PASS mẫu đã chạy |
| Snapshot `/api/sync/snapshot` | 2 | 7–8 | PASS mẫu đã chạy |
| Thêm payment + audit `/api/sync/push` | 5 | 8–11, p50=9 | Lần ghi đầu11; không PASS tuyệt đối10ms |
| Phân bổ một khoản thu3đơn + audit | 5 | 7–9, p50=8 | PASS dữ liệu/phiên thử |
| Sửa nguyên đơn + audit | 5 | 8–10, p50=9 | PASS dữ liệu/phiên thử |
| Retry cùng operationId | 15 | 1–3 | PASS: không thêm receipt/payment |
| Cursor client lớn hơn server | 1 | 1, HTTP409 | PASS fail-closed |
| Public bootstrap bị khóa | 1 | 1, HTTP403 | PASS |

Vòng cuối **49/49request** có log CPU,15ghi+15retry; toàn snapshot/root metadata/versions khớp oracle, seq62. Không invocation lỗi1102 trong49request này. p95 với5mẫu chỉ là thống kê mô tả, không phải cam kết tải dài hạn/cold isolate. Trước đó một harness so sánh bị timeout sau commit; đã lưu FAIL và chạy lại bằng cùng operationId/body khi transport retry. Không gọi timeout là mất/trùng dữ liệu. Một harness empty-client vô tình giữ syntheticPadding đã đúng bị chặn; sửa fixture trống rồi3client PASS, không bỏ điều kiện conflict.

Nguồn: `evidence/free-cpu/release-cpu-summary.json`, `release-telemetry.json`, `sql-lite-release-requests.json`, `owner-admin-cloudflare.json`, `admin-final-requests.json`. Worker cuối `tungcnc-v23-free-sql-lite`, version `1a9ec0f8-005e-4ae4-b03e-559457018d8b`, D1 canary `5075bdfd-c1df-472d-904c-6539a9e9f3d5`, namespace riêng `free23_admin_sync_*`; origin duy nhất `https://v23-free-profile.invalid`, không nhận ghi từ Production/UI thật. Traces tắt, invocation logs bật100%; không nâng CPU hoặc mua gói. Public key thiết bị benchmark được owner-admin provision trực tiếp trên namespace giả; không giả định registration thực tế đã nghiệm thu bằng thao tác này. Registration/signed replay/revoke được regression riêng kiểm tra.

Không có sample inbox per-endpoint mới trong telemetry truy vấn; regression inbox/generated Production đã PASS nhưng **không chứng nhận CPU mọi endpoint inbox**. Đây là giới hạn bằng chứng, không suy từ CPU sync sang inbox.

## Bản vá tối thiểu và tính toàn vẹn

- Giữ snapshot+versions+receipt cùng schema và transaction CAS hiện hành. D1 trả projection chỉ trường validator đọc của dữ liệu cũ và versions các ID bị chạm; payload mới/sửa vẫn kiểm đầy đủ. Giữ kiểm quan hệ, oversum, ngày, nhóm phân bổ, báo giá trùng. History cũ không có cross-reference tài chính giữ nguyên trong DB, không parse lại; history mới kiểm đầy đủ. Không bỏ financial validation để giảm CPU.
- D1 cập nhật JSON chỉ các mảng bị chạm, dùng raw JSON numeric lexemes để không đổi số phân lẻ; không SQL SUM tiền hoặc làm tròn. Append tối đa15record dùng JSONB vì D1 giới hạn32đối số; lớn hơn chuyển sang cùng giao dịch rebuild, không chia transaction. Byte guard kiểm data+versions trước commit, vượt thì413 và giữ queue.
- Snapshot/pull trả JSON đã lưu thay vì parse/stringify toàn lịch sử. Tổng chẩn đoán giữ nguyên thứ tự cộng IEEE-754. Không đổi IDB identity/schema/UI.
- Poll15s→60s khi đang hiển thị/online; lưu/online/pageshow/visibility vẫn kích hoạt ngay. Android đóng PWA không bảo đảm chạy nền. Offline tiếp tục lưu cục bộ và gửi lại khi mở/có mạng.
- Chặn delta chứa envelope bootstrap quản trị; `/pull` trả409 khi cursor server lùi, không false “đã đồng bộ” sau restore.

Regression toàn bộ, safety,59case differential, owner import fault/rollback/retry và generated package PASS: `release-*.log`, `head-guard-final.log`. SQLite/native fake-IDB không thay nghiệm thu OS thật. Bản lịch sử119 riêng kiểm bootstrap/restore và giao dịch trên bản sao PASS, source hash không đổi; bản này chưa phải file cutover cuối.

## Khởi tạo một lần, không dùng Worker để xử lý snapshot lớn

1. Sau phê duyệt riêng, chốt PC Production119 gồm TEST. Kiểm JSON cuối, pending/conflict, source file SHA256, snapshot hash, device/origin và backup độc lập đã restore thử. Không dùng A/B118/canary.
2. Kiểm đúng UUID D1 Production trống. Package public bootstrap=disabled, writeblocked. Offline `scripts/prepare-v23-owner-initial.cjs` tạo private plan, kiểm toàn bộ validation và byte; không gửi mạng.
3. Chỉ khi owner xác nhận device/hash/backup/đích mới cài optional `sync/admin-initial.sql` và grant trên đích trống. Gửi1INSERT qua D1 API với bound params: trigger cùng transaction ghi snapshot, versions, biên nhận seq1, tiêu thụ grant. Không upload2.223delta, không tách batch hoặc UPDATE/INSERT quản trị nhiều transaction.
4. Mất ACK kiểm receipt đúng device/payloadHash/seq và toàn snapshot/versions; retry exact plan operationId/body. Đích có dữ liệu hoặc grant khác bị từ chối. Đối soát đầy đủ rồi PC preview0khác biệt để giữ dữ liệu gốc; S24 kiểm trống mới nhận.

Cloudflare thực tế đã kiểm missing-grant deny, ép lỗi bước cuối rollback snapshot+receipt+guard, exact hash/versions/giá trị, retry0receipt mới, đích không trống deny. `meta.changes` D1 gồm side effects trigger; không dùng nó làm số payment/receipt. Dữ liệu thật chưa được gửi bằng cơ chế này.

## Giới hạn và phục hồi

Nguồn chính thức kiểm23/11/2026: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

| Giới hạn | Đánh giá RC1 |
| --- | --- |
| Workers Free100.000request/ngày,10ms CPU/request |3máy polling60s×2call≈8.640request/ngày nếu mở24h, cộng save/retry/inbox. Không phải số đo dùng thực tế. Free có linh hoạt burst hiếm, nhưng vượt liên tục có thể1102; không dựa vào burst để bảo đảm an toàn |
| D1 Free5triệu rowsread/100.000rowswrite mỗi ngày | nonce+index≈17.280writes/ngày cho polling trên, cộng nghiệp vụ/inbox/tài nguyên khác cùng account. Không coi riêng app là toàn account; theo dõi metrics trước cutover |
| D1 Free10DB,500MB/DB,5GB toàn account | Đang10/10DB; hai DB Production12.288byte chỉ `_cf_KV`. Không xóa tài nguyên để né quota. Cần backup kho thử + phê duyệt riêng giải phóng1slot cho recovery độc lập |
| D1 row2.000.000byte; app guard1.900.000 | Lịch sử đã biết snapshot1.647.911,state+versions1.760.541: dư139.459byte tới guard, không nhiều. Fake UUID fixture state1.775.716. Đo lại file PC cuối/receipt; quá guard dừng trước ghi, không chia snapshot |
| App snapshot5.000.000byte / delta request1.000.000 /2.000changes | Cần đồng thời đạt row guard, không chỉ5MB. Owner initial1SQL có bound params, không đi qua requestlimit app1MB |
| SQL text100.000byte,100params,32function args,30squery | Không literal INSERT toàn snapshot. Bound params; append≤15record, fallback atomically. Chưa stress mọi tổ hợp2.000changes trên Cloudflare, vượt giới hạn lỗi thì queue giữ nguyên |
| Free TimeTravel7ngày | Là lớp bổ sung, không thay JSON/ZIP/SQL backup độc lập và delta offline từng thiết bị |

Account billing API403; `default_usage_model=standard` không đủ chứng nhận đang Free. Không thay plan/subscription. Chủ xưởng chỉ cần xác nhận tên Free trong Dashboard, không gửi thẻ/khóa.

Phục hồi: khóa ghi, xuất queue/conflict từng thiết bị, lưu baseline+mọi receipt sau backup, restore vào D1 độc lập mới/unbound với bound params, phát lại delta theo operationId và đối soát full snapshot/versions/receipts trước đổi binding. Không restore đè DB nguồn, không reset IDB, không dùng JSON import để giả phục hồi signed queue. Full-copy SQLite+delta PASS và canary code rollback trước PASS; **restore ledger1,65MB vào D1 vật lý khác với giao dịch mới chưa chạy do account10DB**, chưa đánh PASS. Không cài lại optional trigger khởi tạo để restore ledger đã có receipt.

Phương án nhanh: đóng filePC/thiết bị và slot recovery, chốt CPU theo workload thật trên bản sao; lỗi an toàn mới thì sửa tối thiểu. Không mở rộng sang normalized storage/checkpoint/cleanup hoặc realtime. Chưa xin phê duyệt mở ghi Production khi các gate bắt buộc còn mở.
