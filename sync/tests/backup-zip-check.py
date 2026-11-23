"""Only synthetic saved files; no application runtime or network."""
import sys,json,hashlib,zipfile
from pathlib import Path
import openpyxl
p=Path(sys.argv[1]);dest=p/'extracted';dest.mkdir()
with zipfile.ZipFile(p/'backup.zip') as z:
    assert z.testzip() is None
    assert set(z.namelist())=={'backup.json','backup.xlsx','SHA256.json'}
    z.extractall(dest)
manifest=json.loads((dest/'SHA256.json').read_text())
for row in manifest['files']:
    assert hashlib.sha256((dest/row['name']).read_bytes()).hexdigest()==row['sha256']
b=json.loads((dest/'backup.json').read_text());assert b['exportedAt']==manifest['exportedAt']
assert b['backupIntegrity']['snapshotSha256']==manifest['snapshotSha256']
s=b['data'];w=openpyxl.load_workbook(dest/'backup.xlsx',data_only=False)
assert len(w.sheetnames)==9
assert w['Đơn hàng'].max_row-1==len(s['orders'])
assert w['Thanh toán và phân bổ'].max_row-1==len(s['payments'])
rows=list(w['Tổng hợp công nợ'].values)[1:]
assert sum(r[6] for r in rows)==manifest['totals']['receivable']
assert sum(r[7] for r in rows)==manifest['totals']['payable']
assert b['data']['payments'][0]['paymentGroupSize']==3
print('PASS independent ZIP extraction/CRC/SHA256; extracted XLSX opens with nine sheets and reconciled totals without app or Cloudflare')
