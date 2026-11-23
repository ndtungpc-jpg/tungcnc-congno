"""Read saved workbook independently. Never imports application code or uses network."""
import sys,json,zipfile
from pathlib import Path
import openpyxl
p=Path(sys.argv[1]);raw=json.loads((p/'backup.json').read_text());meta=json.loads((p/'metadata.json').read_text());s=raw['data']
w=openpyxl.load_workbook(p/'backup.xlsx',data_only=False)
assert w.sheetnames==['Khách hàng','Nhà cung cấp','Đơn hàng','Hạng mục','Kích thước','Thanh toán và phân bổ','Tổng hợp công nợ','Lịch sử nhắc nợ','Thông tin sao lưu và đối soát']
def records(name):
    data=list(w[name].values);return [dict(zip(data[0],r)) for r in data[1:]]
assert len(records('Khách hàng'))==meta['counts']['customers']
assert records('Khách hàng')[0]['Điện thoại']=='0900123456'
assert len(records('Nhà cung cấp'))==meta['counts']['suppliers']
orders=records('Đơn hàng');assert {r['ID đơn'] for r in orders}=={o['id'] for o in s['orders']}
for r in orders:
    o=next(o for o in s['orders'] if o['id']==r['ID đơn']);assert r['Giá trị đơn gốc']==o['amount'];assert r['Ngày tạo gốc']==o['created']
items=records('Hạng mục');sizes=records('Kích thước');assert len(items)==meta['counts']['items'];assert len(sizes)==meta['counts']['sizes']
assert any(r['ID hạng mục gốc']=='bkr-existing-item-id' for r in items)
assert any(r['ID kích thước gốc']=='bkr-existing-size-id' for r in sizes)
keys={r['Khóa dòng sao lưu'] for r in items};assert all(r['Khóa dòng hạng mục'] in keys for r in sizes)
for r in items:
    o=next(o for o in s['orders'] if o['id']==r['ID đơn']);x=o[r['Nguồn mảng']][r['STT gốc']-1]
    assert r['Đơn giá gốc']==x.get('unitPrice');assert str(r['Thành tiền hạng mục'])==str(x.get('amount'));assert r['ĐVT']==x.get('unit')
    if x.get('quantity')=='2.50':assert r['Khối lượng gốc']=='2.50'
payments=records('Thanh toán và phân bổ');assert len(payments)==len(s['payments'])
for r in payments:
    original=next(x for x in s['payments'] if x['id']==r['ID thanh toán/phân bổ']);assert r['ID đơn']==original['orderId'];assert r['Số tiền phân bổ']==original['amount'];assert r['Ngày thực tế gốc']==original['date']
group=[r for r in payments if r['ID nhóm gốc']=='bkr-group'];assert len(group)==3 and sum(r['Số tiền phân bổ'] for r in group)==600000
summary=records('Tổng hợp công nợ');assert sum(r['Còn phải thu'] for r in summary)==meta['totals']['receivable'];assert sum(r['Còn phải trả'] for r in summary)==meta['totals']['payable']
assert sum(r['Tổng giá trị chưa hủy'] for r in summary)==sum(o['amount'] for o in s['orders'] if not o.get('cancelled'))
assert len(records('Lịch sử nhắc nợ'))==len(s['reminderEvents'])
for sheet in w:
    for row in sheet:
        for c in row:assert c.data_type!='f', 'No macros/formulas/external calculation dependencies'
    for row in sheet.iter_rows(min_row=2):
        for c in row:
            if isinstance(c.value,(int,float)) and not isinstance(c.value,bool):assert c.alignment.horizontal=='right'
with zipfile.ZipFile(p/'backup.xlsx') as z:
    assert not any('externalLink' in n or 'vbaProject' in n for n in z.namelist())
print('PASS independent XLSX: nine sheets, original IDs/phones/dates/amounts, three allocations, no double counting, no formulas/macros/external links, right aligned numeric values')
