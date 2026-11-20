# Kiểm toán bảo mật v2.1.7 — phạm vi và giới hạn

Phạm vi: mã triển khai staging v2.1.7, nền v2.1.5 đã kiểm thử, ZIP v2.1.6/v2.1.7, cây tệp GitHub hiện hành, 27 commit và 65 blob trong lịch sử git cục bộ tới main e0ebd56. Không phải kiểm thử xâm nhập toàn diện hoặc kiểm toán tài khoản GitHub/Cloudflare.

## Phát hiện
| Mức | Phát hiện | Trạng thái / xử lý |
|---|---|---|
| Cao khi thất lạc/chia sẻ file | Bản sao JSON chứa tên, liên hệ, giá, nợ, lịch sử và bản phục hồi ở dạng rõ | Chưa có mã hóa. Đã thêm cảnh báo ngay tại kiểm tra file. Chỉ lưu/chia sẻ tại nơi được phép; SHA không thay mã hóa. Cần thiết kế mã hóa và quản lý khóa trước đồng bộ. |
| Cao khi thiết bị/profile bị truy cập hoặc mã cùng origin bị chiếm | Chưa có đăng nhập/phân quyền; JS cùng origin đọc được IndexedDB và localStorage | Kho cục bộ không phải cơ chế kiểm soát truy cập. Khóa máy và quản lý profile; không đủ điều kiện làm hệ thống nhiều người dùng/đa thiết bị. |
| Trung bình | Nhiều inline handlers nên CSP cần unsafe-inline; XSS vẫn có tác động lớn nếu có điểm chèn chưa phát hiện | Đã kiểm tra escaping tên, ID, ghi chú, hạng mục và soạn nhắc nợ bằng payload; chưa thấy thực thi trong phạm vi kiểm thử. Thêm CSP nguồn self, chặn external connect/script/img và form; cần tách handlers để bỏ unsafe-inline trong đợt riêng. Không coi CSP hiện tại là chống XSS tuyệt đối. |
| Trung bình | Lưu cục bộ có thể bị xóa khi dọn dữ liệu, mất máy, ẩn danh hoặc đầy bộ nhớ; origin thử nghiệm có kho riêng | Lỗi ghi được rollback, bản phục hồi lưu nguyên tử, có export/restore đã kiểm thử. Bản phục hồi trong cùng kho không thay bản sao ngoại tuyến. |
| Trung bình (đã xử lý trên staging) | ZIP cũ chỉ kiểm tra sơ bộ, không kiểm tra sâu bản phục hồi và lịch sử trước import | Hợp nhất bộ integrity đã sửa, kiểm tra sâu bản sao trước phục hồi, chặn ID/link/money sai và không tự sửa. |
| Thấp | Hash chỉ là dấu vết đối chiếu, không xác thực người tạo hoặc chứng minh đầy đủ | SHA-256 byte gốc, cho nhập hash đã lưu độc lập; nêu rõ giới hạn. |

Không tìm thấy lỗ hổng mức Nghiêm trọng đã được chứng minh trong phạm vi trên. Điều này không chứng minh không có lỗ hổng.

## Trả lời các điểm bắt buộc
1. Không thấy đường gửi dữ liệu công nợ ra server trong mã đã kiểm tra. Fetch ứng dụng chỉ version.json và tài nguyên SW cùng origin; không gắn record vào request. Clipboard/Share chỉ thực hiện sau thao tác người dùng. Host vẫn nhìn thấy metadata truy cập thông thường; chưa kiểm toán nội bộ hạ tầng hoặc extension trên máy người dùng.
2. Repository public. Quét cây hiện tại và lịch sử cục bộ không thấy backup kinh doanh, dữ liệu khởi tạo không rỗng hoặc mẫu khóa bí mật theo pattern. Các MIGRATION đã kiểm tra đều rỗng. Pattern scan không đủ để cam kết toàn bộ nội dung lịch sử/ảnh/assets hoặc mọi nhánh không lộ dữ liệu.
3. Không tải thư viện JS/CDN bên ngoài trong mã ứng dụng. Excel encode/decode dùng script đi kèm. Mã bất kỳ cùng origin, extension được cấp quyền hoặc bản triển khai bị chiếm vẫn có thể đọc dữ liệu cục bộ.
4. Có: người lấy được file JSON có thể đọc. Chưa mã hóa; hash không che nội dung.
5. Chỉ xác minh được repository public và tệp nguồn; không có quyền/phạm vi kiểm toán đầy đủ IAM, MFA, token, quyền thành viên, log, Cloudflare dashboard/build secrets, Pages Functions hoặc cài đặt bảo vệ nhánh. Không thay đổi quyền hoặc lịch sử Git.
6. Escaping dữ liệu tại HTML/text/ID được giữ; có thử payload ở tên/nội dung/nhắc nợ. CSP bổ sung giảm tải mã và gửi dữ liệu ra ngoài, cùng chống iframe. Vẫn có giới hạn unsafe-inline, browser extensions, mã cùng origin và supply chain tài khoản triển khai.
7. Same-origin tách kho theo origin; không phải mã hóa, không thay đăng nhập/phân quyền. Preview origin khác production nên không truy cập kho thật. Không bảo vệ khỏi người mở được cùng profile hoặc JS chạy cùng origin; không tự đồng bộ và không bảo đảm lưu vĩnh viễn.

## Cơ sở kỹ thuật
- MDN Same-origin policy: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy
- MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

## Khuyến nghị
Đủ để tiếp tục thử nghiệm có kiểm soát với dữ liệu giả. Trước thực nghiệm dữ liệu thật: xác minh backup cũ đã loại nhạy cảm, đối soát phục hồi, thử Samsung/PWA; bảo vệ thiết bị và nơi giữ backup. Chưa phù hợp triển khai đồng bộ nhiều thiết bị hoặc coi là an toàn tuyệt đối. Cần đăng nhập, phân quyền, backend, TLS, kiểm soát tenant, audit và backup mã hóa trong v2.2/v2.3.
