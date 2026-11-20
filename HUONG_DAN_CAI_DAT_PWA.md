# PWA Tùng Giang CNC - sửa điều kiện cài đặt

Đưa toàn bộ các tệp ở thư mục gốc lên GitHub; trong icons/ có ba PNG. _headers cũng phải nằm ở thư mục gốc.

Chờ Netlify Published. Kiểm tra các URL /manifest.webmanifest, /sw.js, /icons/icon-192.png và /icons/icon-512.png không trả 404.

Mở Chrome trên Android, tải lại trang và chọn menu > Cài đặt và tạo lối tắt > Cài đặt. Nếu Chrome vẫn từ chối, kiểm tra Application > Manifest và Service Workers bằng Chrome DevTools trên máy tính; không xóa dữ liệu trang web khi chưa sao lưu JSON.

PWA không đồng bộ IndexedDB giữa các thiết bị.
