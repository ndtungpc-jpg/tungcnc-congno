'use strict';
// v2.1.6: Read-only debt collection center. No schema migration, no automatic messages.
function debtSearchText(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().trim()}
function debtCenterView(){
 const q=debtSearchText(filter),ps=debtCustomers().filter(p=>debtSearchText([p.name,p.phone,...p.open.flatMap(o=>[o.code,o.title])].join(' ')).includes(q));
 const overdue=ps.filter(p=>p.open.some(o=>due(o))),totalDebt=ps.reduce((s,p)=>s+p.open.reduce((a,o)=>a+balance(o),0),0);
 return `<div class="panel"><div class="split"><div><h2> Nhắc nợ</h2><p class="muted">${ps.length} khách · ${money(totalDebt)} còn phải thu · ${overdue.length} khách có đơn quá hạn</p></div><div class="actions"><button class="btn" onclick="tab('collections')">← Danh sách công nợ</button><input class="search" placeholder="Tên, SĐT, mã đơn, hạng mục (không dấu)..." value="${esc(filter)}" oninput="search(this.value)"></div></div><p class="hint">Tin nhắn được tạo từ số dư hiện tại. Kiểm tra trước khi gửi; ứng dụng không tự gửi tin hoặc tự ghi nhận thanh toán.</p>${table(['Khách hàng / Liên hệ','Đơn còn nợ','Số tiền','Tình trạng','Thao tác'],ps.map(p=>{const sum=p.open.reduce((a,o)=>a+balance(o),0),late=p.open.some(o=>due(o));return `<tr><td><button class="customer-link" onclick="openCustomer('${jsid(p.id)}')">${esc(p.name)}</button><div class="muted">${esc(p.phone||'Chưa có SĐT')}</div></td><td>${p.open.length}</td><td><b>${money(sum)}</b></td><td>${late?'<span class="red">Quá hạn</span>':'Chưa xác định quá hạn'}</td><td><button class="smallbtn" onclick="sendDebtReminder('${jsid(p.id)}')"> Nhắc nợ</button><button class="smallbtn" onclick="statement('${jsid(p.id)}')">Bảng kê</button><button class="smallbtn" onclick="formMultiPaymentFor('${jsid(p.id)}')">Thu tiền</button></td></tr>`}).join(''))}</div>`;
}
function debtReminderText(pid){
 const p=partner(pid);if(!p||p.type!=='customer')return '';
 const os=state.orders.filter(o=>o.partnerId===pid&&balance(o)>0).sort((a,b)=>(a.due||'9999-99-99').localeCompare(b.due||'9999-99-99'));
 if(!os.length)return '';
 const sum=os.reduce((n,o)=>n+balance(o),0);
 return `TÙNG GIANG CNC xin gửi thông tin đối chiếu công nợ đến ${p.name}:\n`+os.map((o,i)=>`${i+1}. ${o.code||'Đơn hàng'} - ${o.title||'Hạng mục'}: ${money(balance(o))}${o.due?' (hạn '+date(o.due)+')':''}`).join('\n')+`\nTỔNG CÒN NỢ: ${money(sum)}.\nKính mong quý khách kiểm tra và sắp xếp thanh toán. Nếu có sai lệch xin phản hồi để đối chiếu. Xin cảm ơn!`;
}
async function sendDebtReminder(pid){
 const p=partner(pid),message=debtReminderText(pid);if(!message)return alert('Khách hàng không có công nợ cần nhắc.');
 modal('Soạn thông báo công nợ · '+p.name,`<p class="hint">Xem lại nội dung trước khi gửi qua Zalo/SMS. Chia sẻ sử dụng chức năng của điện thoại, không gửi tự động.</p><textarea id="debtReminderDraft" style="width:100%;min-height:250px;padding:12px" aria-label="Nội dung nhắc nợ">${esc(message)}</textarea><div class="foot"><button class="btn" onclick="statement('${jsid(pid)}')">Bảng kê / Xuất ảnh</button><button class="btn" onclick="copyDebtReminder()">Sao chép</button><button class="btn primary" onclick="shareDebtReminder()">Chia sẻ qua điện thoại</button><button class="btn" onclick="closeModal()">Đóng</button></div>`);
}
async function copyDebtReminder(){const text=document.getElementById('debtReminderDraft')?.value;if(!text)return;try{await navigator.clipboard.writeText(text);toast('Đã sao chép tin nhắn')}catch{const el=document.getElementById('debtReminderDraft');el.focus();el.select();alert('Hãy chọn Sao chép từ menu điện thoại.')}}
async function shareDebtReminder(){const text=document.getElementById('debtReminderDraft')?.value;if(!text)return;if(navigator.share){try{await navigator.share({text});return}catch(e){if(e.name==='AbortError')return}}await copyDebtReminder();alert('Không mở được bảng chia sẻ. Hãy dán nội dung đã sao chép vào Zalo/SMS.');}
