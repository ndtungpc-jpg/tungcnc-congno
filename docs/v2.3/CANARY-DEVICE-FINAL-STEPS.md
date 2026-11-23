# V2.3 — Các bước cuối trên PC / S24

Ngày23/11/2026. **Chỉ Production-PC119 là nguồn phát hành. Không lấy dữ liệu nghiệm thu118 hoặc canary.** Không deploy/mở ghi/khởi tạo Production trong các bước dưới.

## A. Nguồn thật — một lần kiểm tra

- PC mở `https://tungcnc-congno.pages.dev/` → Dữ liệu → Sao lưu JSON. File đã được yêu cầu tải dưới tên `TG_PC_Production_119_PreGoLive_2026-11-23.json`; kiểm tra Downloads rồi gửi file. Nếu chưa có thì xuất lại. Giữ riêng một bản độc lập; không phục hồi/nhập gì vào PC Production. Giữ TEST và119 đối tác. Chưa có file đọc được thì chưa chốt hash/snapshot cuối.
- S24 mở đúng `https://tungcnc-congno.pages.dev/` → Dữ liệu → Kiểm tra dữ liệu, gửi ảnh số lượng. Theo chủ xưởng, origin này chưa dùng; vẫn cần đọc kho thực tế. Mong đợi0 đối tác/0 đơn/0 thu chi. Nếu có dữ liệu hoặc lỗi đọc thì dừng và sao lưu riêng. Không Clear Site Data, uninstall, reset hoặc nhập backup nghiệm thu.

## B. Một kho giả riêng cho tất cả kiểm thử còn lại

**Link canary PC và S24:**
https://tungcnc-v23-canary-ui-20261123.ndtung-pc.workers.dev/

Phải thấy dải vàng **KHO CANARY RIÊNG · CHỈ DỮ LIỆU GIẢ · KHÔNG NHẬP BACKUP THẬT**. Origin/IDB riêng, hai Worker canary chỉ chấp nhận origin canary này; DB canary UUID `5075bdfd-c1df-472d-904c-6539a9e9f3d5`, không có binding Production. Đây là cùng UI RC1 đã chốt, bọc cảnh báo môi trường thử; không thêm chức năng nghiệp vụ. Link dùng asset pin commit9348654, không trỏ source mới tự động.

1. **Kết nối hai máy:** trên link canary, mở Thêm → Đồng bộ → chẩn đoán → Bật đồng bộ thử nghiệm; đặt tên `CANARY PC` / `CANARY S24`, gửi hai mã thiết bị để duyệt **chỉ trên D1 canary**. Không chọn bootstrap/khởi tạo snapshot: D1 canary đã có dữ liệu giả. Sau duyệt bấm Thử đồng bộ lại; nhận119 khách tên SYNTHETIC CANARY…,619 đơn giả,48 paymentrows ban đầu, cursor5. Nếu không nhận/khác nguồn hoặc gặp lỗi1102, dừng, giữ queue và báo; không tạo lại khoản thu. Trước sửa gì, hai máy xuất đối soát và kiểm tra queue0/conflict null. Không nhập JSON thật vào link này.
2. **ZIP/Excel/JSON một lượt:** S24 Chrome xuất ZIP, mở bằng Files, có backup.json/backup.xlsx/SHA256.json; mở XLSX bằng Excel/WPS, kiểm tra9sheet và dữ liệu tiền phân lẻ, gửi ZIP để kiểm hash. Nếu dùng PWA, lặp tải ZIP trong PWA. Trên PC canary, xuất JSON và preview phục hồi **chính file canary vừa xuất**, trước khi tạo giao dịch mới: thử Hủy phải giữ nguyên; sau đó xác nhận và export lại để so ID/tổng/lịch sử. Không phục hồi vào origin Production hoặc A/B. Nếu preview có bản ghi bị loại hoặc thiếu thì dừng, không xác nhận.
3. **Offline và conflict gộp một lượt:** chọn khách giả `SYNTHETIC CANARY 0` và một đơn giả. S24 bật máy bay, ghi khoản thu giả75.000 và đổi ghi chú khách thành `S24 kiểm thử`; đóng/mở lại tab/PWA, hàng đợi vẫn còn, chưa báo đã đồng bộ. Trong lúc S24 offline, PC canary đổi ghi chú **cùng khách ID** thành `PC kiểm thử` và đồng bộ. S24 tắt máy bay → thử lại: phải báo conflict, giữ hai bản. Mở Đối chiếu/Tiếp nhận → xem hai nội dung, chọn rõ bản ghi chú cần giữ; các payment/audit mới phải được bảo toàn, không gộp khách. Kiểm tra số dư dự kiến rồi xác nhận. Sau đó hai máy retry và xuất đối soát: cursor bằng nhau/queue0/conflict null, đúng một khoản thu75.000, tổng/ID khớp. Gửi hai JSON và ảnh trạng thái. Không thử airplane/restore/conflict bằng sổ thật.

D1 canary đã PASS rollback/cloud conflict qua Node clients; các bước trên chứng nhận UI/Android/OS thật, hiện **OPEN**, không được đánh dấu PASS trước khi có bằng chứng. Kho canary dùng hai schema trong một D1 riêng vì tài khoản đã chạm10database; Production vẫn dùng hai D1 riêng. Không đưa canary fixtures vào artifact Production.

## C. Xác nhận năng lực Cloudflare — không mua hoặc đổi gói tự động

Sync canary CPU p99=121505µs =121.505ms; vượt ngân sách Workers Free10ms. Account đang bị giới hạn10D1, không tạo được D1 thứ11. Cần chủ xưởng kiểm tra tên gói Workers Free/Paid và phương án CPU/quota trong Dashboard. Bộ cấu hình đã chuẩn bị `cpu_ms=1000` và khóa ghi mặc định; **cần Workers Paid/capacity phù hợp**, chưa áp vào Production. Không cần gửi thông tin thẻ/thanh toán. Nếu cần nâng gói, chủ xưởng tự phê duyệt và thao tác; chưa có quyền thực hiện giao dịch này.

Sau khi A/B/C hoàn tất mới lập đề nghị phát hành riêng: đúng file PC119/hash/device mới/D1 UUID/backup_ref/manifest; bootstrap nguyên tử một request, giữ TEST, rồi S24 Production kiểm tra trống và nhận dữ liệu. Chưa xin xác nhận mở Production khi các gate vẫn còn mở.
