const assert=require('assert'),U=require('../../ui-r4.js');
const rows=Array.from({length:1200},(_,i)=>({id:String(i),name:(i%2?'Bình ':'Anh ')+i,search:'Khách '+i+' 0900',at:i,value:i*100000,debt:i%3?i*10000:0,count:1,overdue:i%4===0,reminded:i%5===0}));
const snapshot=JSON.stringify(rows);
for(const sort of ['new','old','az','za','valueDesc','valueAsc','debtDesc','debtAsc']){const result=U.selectRows(rows,{sort});assert.equal(result.length,1200);assert.notEqual(result,rows);}
const combined=U.selectRows(rows,{q:'khach 10',debt:'open',overdue:'yes',reminded:'yes',sort:'debtDesc'});assert(combined.length);assert(combined.every(r=>U.normalize(r.search).includes('khach 10')&&r.debt>0&&r.overdue&&r.reminded));for(let i=1;i<combined.length;i++)assert(combined[i-1].debt>=combined[i].debt);
assert(U.selectRows(rows,{debt:'paid'}).every(r=>r.debt===0));assert(U.selectRows(rows,{overdue:'no',reminded:'no'}).every(r=>!r.overdue&&!r.reminded));
assert.equal(JSON.stringify(rows),snapshot);assert.equal(U.normalize('Đặng Hữu NGỌC'),'dang huu ngoc');console.log('PASS AUTOMATED UI-R4: 1200 rows, eight sorts, combined accent-insensitive search/debt/overdue/reminder filters, no mutation');
