# V2.3 UI cleanup — checkpoint / hướng dẫn tiếp tục

Ngày24/11/2026. Base Production3731cc670c5950a375188a52ab94868d1297b53f. Nhánh preview/v23-ui-cleanup; không merge main, không deploy Worker/D1, không migration hoặc sửa dữ liệu. Phê duyệt hiện tại: triển khai kế hoạch giao diện trên bản xem trước.

## Phạm vi đã làm

1. Cất công cụ kỹ thuật trong Hỗ trợ nâng cao mặc định đóng; bỏ cardSupabase/chưa kíchhoạt đã lỗi thời và núttrước-thựcnghiệm. Giữ backupJSON+Excel, nhập/phục hồi và kiểmtoànvẹn; không xóa hàm phục hồi.
2. Đồng bộ: trạng thái tiếng Việt, tênthiếtbị, counts, nútĐồngbộngay/Đóng. ID/URL/cursor/error chi tiết/export/reconcile/revoke vào details. Thiếtbị pending không được hiển thịĐãđồngbộ. Không sửaengine/protocol/quyền/queue.
3. LegacyLine/CU-create và bổsung sourceDetail lầnđầu với đúng nhómtrườngenrichment không còn tính là activitymới; rawcreated luôn giữnguyên. Toàn bộ619đơn trong filePC đã xác minh không bị gắn cậpnhậtmới bởi619nhậtkýenrichment. Sửađổi nghiệpvụthật vềsau vẫn được thấy. Legacyrow trongToànbộđơn hiển thịngàyđơngốc. Dashboard vẫn cólinkToànbộđơn khi khôngcóhoạtđộngmới.
4. Thu/chi mặcđịnhNhậptrênứngdụng; chọnBaogồmsổExcelcũ để xemtoànbộ. Không ẩn/xóa khoảnExcelkhỏisổ, không sửa p.date/enteredAt. Nhóm23phânbổ vẫn giữnguyên. Mới/cũ vẫn sắp theo ngày thu lưu, không thờiđiểmnhập.
5. NútXemtrướcnhắcnợ mởPNGviewertrực tiếp cho2bảng; cùng một PNG immutable cho preview/download/share. Cachepromise tránh render haiảnh đồngthời. Giữmessageđangsoạn, snapshotstaleguard và lịch sử chỉghi khi người dùng xuất/gửi rõràng; không tựgửi.
6. Hồsơliênhệ thu gọn, không placeholderdài, notes trong details, edit nhỏ; bỏTạođơnnhanh ởprofile. MenuThêm bỏ các shortcutnhập/thu/chitrùng — các hànhđộng vẫn trong danh sách/hồsơKH/NCC. Dashboard vẫngiữTạođơnnhanh vàNhắcnợ.

## Bằng chứng đã kiểm

- `node sync/tests/display-date-policy.cjs`: import/enrichment không giảactivitymới; updateamountthật vẫn hiện; ngày gốc không đổi.
- `DISPLAY_SOURCE_PATH=/private/CongNo_2026-11-23.json node sync/tests/display-date-policy.cjs`: 619legacy dates giữ nguyên, sourceJSON/data không đổi; không commit filekinhdoanh.
- `node sync/tests/ui-cleanup.cjs`: default/allpayments và thứ tựngàythu; backup/recovery còn truycập; hồsơgọn; renderđồngthờichung1PNG; nútpreview2bảng mởảnhlớn/messagecònlại; human-sync/technicalhidden/pending-device; mainJSON không đổi.
- `node sync/tests/ui-r42.cjs`: regression7route + thực canvasPNG/XLSX/PDF và tổng/align/cache PASS.
- Node syntax7file và git diff--check PASS. Chưa chứng nhận physicalAndroid hoặc visual viewport thực tế chỉ từjsdom.

## Nếu Work bị ngắt

1. Đọc checkpoint này và GitHub branch, không reset IDB/restore PC hoặc bootstrap lại. Production đang chạy3731cc6; các sửa này CHƯA thay main.
2. Không chạy lại tests đã PASS nếu source không đổi. Chỉ xử lý failure còn mở hoặc kiểm visual/responsive trên bảnpreview. Dữ liệuCloudflare thật không được cần để kiểmUI; preview chỉ cóblank hoặc bảnsaocụcbộ riêng, không dùng sổProduction để thử.
3. Previewhostname không thuộcallowlist Production sync/client, không tự kết nối WorkerProduction. Không đổi Worker origins để thửUI. Không đưa filebackupngườidùng vàoGit hoặcassetscôngkhai.
4. Khi đưa lênProduction sau review: giữD1/DBidentity/devicekeys/outbox, tăngcacheShell/versionHTML vàversion.json thốngnhất để nhậnassetmới, không táidiễn bannerloop. ChỉdeployPages, không triểnkhaiWorker/schema.
5. Work dừng không tự dừng dịchvụPages/Workers. Nếu chưamerge, phầnđanglàm không thay mã đang dùng; không hứa loại trừ lỗi dịchvụ hoặcquotaCloudflare chỉ vì Work đãđược checkpoint.

## Còn lại trước phát hành UI

Xem trực quan trên viewportPC/S24, xác nhận nhắcnợpreview trên máy thật và rà các nhãn khoảngtrống. Không yêu cầu diễn tập dữliệu/sync lại cho patch UI này; nếu cócodefix mới thì chạy đúng test liênquan. Chưa đánhPASS các kiểmtra máy thật chưa thực hiện.
