# V2.3 Production — triển khai theo phê duyệt chủ xưởng

Ngày23/11/2026. Owner đã cho phép merge main/deploy Production, chọn PC119 làm nguồn duy nhất và loại bỏ dữ liệu S24. Không nâng Paid, không A03. Runtime từ f57cb87, nghiệm thu nguồn mới tại886fe6b. Mã Production áp exact origins/endpoint/CSP và DB identity giữ nguyên; /deploy/v2.3 là cấu hình Worker Production, không dùng wrangler staging.

## Trạng thái theo giai đoạn

1. Hai D1 Production kiểm trống nghiệp vụ trước schema; sync bacea568-a449-4f7e-b392-c6ed54b72c57, inbox78e3141d-d03c-4012-adff-e1c2002085fa. Chỉ áp CREATE/INSERT initial-empty schema; chưa nhập công nợ thật.
2. Sync Worker c1c323b0-d936-4682-943b-04cb3ce28279 và inbox b06e47e5-c6f8-4f5a-9f4b-4c4f008c0d09 đã deploy default writeblocked. Active version binding đúng hai UUID. POST503, staging origin403, unsigned401 PASS. Inbox lần gọi đầu HTTP500 sau deploy; kiểm trực tiếp sau đó và kiểm lại503 PASS, chưa tái hiện; không có dữ liệu thật được gửi.
3. Phê duyệt GO cho mã và enrollment, **không gọi là hoàn tất bootstrap**. Chỉ cấp duyệt đúng PC Production ID/publicJWK/origin sau khi chủ xưởng bật trên PC. Mọi S24/device khác pending, không được approve trước receipt PC seq1. D1 nguồn ban đầu còn0records/seq0.
4. Nguồn duy nhất CongNo_2026-11-23.json SHA256538d02eb6eee1d23a050b31625369aadd177442e170e0c0e1014281270df9cd3,119partner619order46payment; snapshotHashaaa6d0f06f27f3e2d9951ce9bf1cd89bf538b0f33f2a5f7d8781e8fb3eb6cad6. Giữ TEST, mọi ID/ngày/tiền/lịch sử. Nếu PC có giao dịch sau export23:02:49VN thì nhận export mới/đối soát trước gửi snapshot; không suy diễn PC chưa đổi chỉ từ file cũ.
5. Chờ đúng ID PC và nguồn hash hiện thời mới đặt grant/optional trigger/owner-admin1INSERT. Không dùng ID/key nghiệm thu hoặc tạo key thay PC. Public bootstrap lớn disabled. Snapshot/request limit và row guard giữ nguyên. Gửi dữ liệu thật chưa thực hiện trong commit này.
6. Sau seed: preview PC phải0khác biệt, queue0, đồng bộ lên seq1. S24 chưa được mở app Production sync cho tới bước này. Owner cho bỏ S24 data: đóng tab/PWA cũ, xóa dữ liệu site **chỉ trên S24** origin Production (không PC), mở lại, register/approve đúngdevice rồi nhận từ D1. Không import S24 cũ và không restore JSON để sửa queue. Thiết bị trống bắt buộc, D1 phải có PC receipt trướcapprove.

## Bằng chứng và rủi ro còn lại

Không chạy lại suite PASS. Có full119-copy validation/restore+delta, Cloudflare canary rollback/idempotency, per-request CPU49samples đã lưu. CPU14/15ghi≤10ms, lần đầu11ms: owner phát hành Free, không biến số11thành PASS mọi request≤10ms. Account10D1 chưa có slot phục hồi vật lý thứhai; bản JSON độc lập đã kiểm và restore-copy PASS, không chứng nhận DR Cloudflare lớn hoặc OS tests chưa chạy. Nếu phát sinh1102, quota, hash/ID/balance mismatch, devicecollision hoặc mất recoveryproof thì khóa ghi/dừng, bảo toàn queue/main, báo ngay. Không xóa D1 test để né quota hoặc nâng Paid.

## Rollback tối thiểu

Giữ JSONnguồn và mọi giao dịch mới/offline. Trước bootstrap có thể rollback Pages về deployment f3f53157-2416-432e-89b2-beb975e00d5a và khóa Workers; D1 chưa có businessdata nên không mất ledger. Sau bootstrap/nhập mới: khóa ghi, xuất từng local queue/conflict+SQL receipt, không rollback mù về v2.1.12, không restore đè D1 hoặc xóa IDB PC. Code rollback chỉ bản tương thíchmetadata; dữ liệu phục hồi vào đích mới và replay mọidelta đúngoperationId. Backup cũ không thay giao dịch phát sinh.
