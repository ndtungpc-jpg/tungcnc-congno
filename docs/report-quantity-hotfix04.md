# Hotfix Khối lượng / ĐVT — Preview 04

Base: fix/overview-v1.1-preview @ de6ce0d. Branch: hotfix/report-quantity-preview. Preview only; no production merge/deploy.

## Nguyên nhân

reportOrderRows ưu tiên quantity trước basisQuantity, ghép với unit tính giá. Với đơn Excel cũ, quantity là số sản phẩm còn basisQuantity là diện tích/chiều dài tính giá. Chi tiết đơn cũ đã lấy basisQuantity nhưng báo cáo lại lấy quantity. Không có bằng chứng lỗi do số dòng kích thước; bản sửa không dùng sizes.length làm khối lượng.

## Đối chiếu dữ liệu gốc

Đã đọc bản sao lưu ngày 23/11/2026, đối chiếu chính xác các trường quantity, basisQuantity, unit, unitPrice và amount ở dòng nguồn 10127–10130, 10132. Không đọc/ghi D1 production. Cần nghiệm thu tiếp trên dữ liệu thiết bị hiện tại nếu có sửa sau ngày sao lưu.

| Dòng | Nội dung | Báo cáo trước | Báo cáo sau | Đơn giá gốc | Thành tiền giữ nguyên |
|---|---|---|---|---:|---:|
| 10127 | Vách 870×2700, 2 tấm | 2 m² | 4,698 m² | 1.250.000 | 5.872.500 |
| 10128 | Nóc CNC 1940×870 | 1 m² | 1,6878 m² | 1.250.000 | 2.109.750 |
| 10129 | Diềm CNC ~7md | 7 m dài | 7 md | 150.000 | 1.050.000 |
| 10130 | Triện thọ D60 | 1 (không ĐVT) | 1; Cần kiểm tra: Thiếu ĐVT | Chưa lưu | 300.000 |
| 10132 | Cắt CNC 6 cánh 386×413 | 6 m² | 0,956508 m² | 200.000 | 191.301,6 |

Dòng cuối vẫn giữ 191301.6 trong dữ liệu; định dạng tiền hiện hữu làm tròn khi hiển thị báo cáo, không đổi logic định dạng tiền. Không suy đơn vị Triện thọ hoặc chia thành tiền cho đơn giá để suy khối lượng.

## Cách sửa

Projection chỉ đọc: đơn cũ m²/md dùng basisQuantity; hạng mục chi tiết và vật tư dùng quantity đã lưu; đơn vị đếm dùng quantity. Tự nhập giữ quantity/unit/amount. Không suy giá trị thiếu từ kích thước, nội dung hoặc tổng tiền. Kích thước chỉ dùng phát hiện mâu thuẫn, không ghi lại kết quả tính. Cảnh báo thiếu ĐVT/khối lượng, hai khối lượng hạng mục mâu thuẫn, loại tính giá lệch ĐVT, khối lượng × đơn giá lệch thành tiền, kích thước lệch khối lượng đã lưu. Sai lệch tiền chỉ kiểm tra khi đủ trường, dung sai 1 đơn vị tiền do làm tròn.

Chi tiết đơn đọc cùng projection. Xem trước/PDF/Excel/PNG bảng thống kê và đối chiếu đều dùng reportSections/reportOrderRows. Cột cảnh báo tự xuống dòng khi xuất PDF/PNG. Tổng đơn và tổng báo cáo tiếp tục lấy amount, không cộng lại từ khối lượng.

## Kiểm thử

- PASS cú pháp report-tools.js, order-details.js, sw.js.
- PASS report-quantity.cjs, có đối chiếu 5 dòng thật với bản sao lưu riêng; dữ liệu khách không đưa vào git.
- PASS mô hình bảng xem trước, dòng Excel; xuất PNG thật và PDF thật có giá trị/cảnh báo tương ứng.
- PASS m², md, cái/bộ/tấm/khung, tự nhập, thiếu dữ liệu, số không hợp lệ và mâu thuẫn; state không đổi sau xem chi tiết và xuất các định dạng.
- PASS overview-v11.cjs và preview-hotfix03.cjs hồi quy giao diện/thu tiền.
- Bộ ui-r42.cjs cũ dừng ở kiểm tra .r4-filter vì giao diện V1.1 đã thay; không dùng kết quả này để tuyên bố toàn bộ bộ cũ PASS. Kiểm thử xuất đã được thực hiện riêng trong report-quantity.cjs.

Không migration, không đổi IndexedDB/D1/API/sync/công nợ/thanh toán/nhắc nợ. Chỉ đổi projection hiển thị, chi tiết đơn, cache version và metadata Preview. Chưa nghiệm thu thao tác trực tiếp trên S24 Ultra/PWA và dữ liệu production hiện tại; chưa đủ điều kiện Production vì Triện thọ còn thiếu ĐVT gốc.
