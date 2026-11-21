from pathlib import Path
import re,base64,sys
root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]) if len(sys.argv)>1 else root/'TungGiang_CongNo_v2.1.10_OFFLINE.html'
html=(root/'index.html').read_text()
def inline(m):
 code=(root/m.group(1).removeprefix('./')).read_text()
 if m.group(1).endswith('recovery.js'):
  code=code.replace('async function readExistingLegacy(name){','async function readExistingLegacy(name){if(name!==DBNAME)throw Error("Bản offline chỉ đọc kho thử nghiệm riêng");')
  code=code.replace('const names=await indexedDB.databases();','const names=[];')
 return '<script>'+code.replace('</script','<\\/script')+'</script>'
html=re.sub(r'<link rel="stylesheet" href="([^"]+)">',lambda m:'<style>'+(root/m.group(1).removeprefix('./')).read_text()+'</style>',html)
html=re.sub(r'<script src="([^"]+)"></script>',inline,html)
html=re.sub(r'<link rel="stylesheet" href="\./workshop.css">',lambda m:'<style>'+(root/'workshop.css').read_text()+'</style>',html)
# Remove online update detection and SW registration in the standalone artifact.
html=re.sub(r'<script>\s*let waitingAppWorker=null;[\s\S]*?</script>','',html)
html=re.sub(r'<script>\s*// Independent update detection[\s\S]*?</script>','',html)
html=html.replace('tg-ui-session-v219-r2','tg-offline-ui-session-v219-r2')
html=html.replace('tg-theme-v219','tg-offline-theme-v219').replace('tg-backup-download-v219','tg-offline-backup-download-v219')
html=html.replace("DBNAME='tunggiang-congno-v2'","DBNAME='tunggiang-offline-test-v219'")
html=html.replace("STORAGE_KEY='tunggiang-congno-offline-v2'","STORAGE_KEY='tg-offline-test-v219-state'")
html=html.replace("QUOTE_INBOX_KEY='tungcnc_quote_inbox_v215'","QUOTE_INBOX_KEY='tg-offline-test-v219-inbox'")
html=re.sub(r'<link rel="manifest"[^>]+>','',html)
for name in ['icon-192.png','icon-512.png','icon-maskable-512.png']:
 data='data:image/png;base64,'+base64.b64encode((root/'icons'/name).read_bytes()).decode()
 html=html.replace('./icons/'+name,data)
html=html.replace('Sổ công nợ · 2.1.10','OFFLINE THỬ NGHIỆM 2.1.10 · Kho riêng')
html=html.replace('<main class="wrap">','<main class="wrap"><p class="warn">Bản HTML offline dùng kho thử nghiệm riêng, không đồng bộ website. Sao lưu JSON trước khi đổi tên, di chuyển file hoặc đổi trình duyệt. File:// có thể hạn chế lưu bền vững, chia sẻ, tải file, WebCrypto và PWA; khi lỗi lưu, không tiếp tục nhập dữ liệu thật.</p>')
assert '<script src=' not in html and 'navigator.serviceWorker.register' not in html
assert "DBNAME='tunggiang-congno-v2'" not in html
output.parent.mkdir(parents=True,exist_ok=True);output.write_text(html)
print(output)
