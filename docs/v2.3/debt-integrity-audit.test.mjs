import test from 'node:test';
import assert from 'node:assert/strict';
import {auditDebtSnapshot} from './debt-integrity-audit.mjs';

const fixture=()=>({
 partners:[{id:'c1',type:'customer',name:'Khách A'},{id:'s1',type:'supplier',name:'NCC B'}],
 orders:[{id:'o1',partnerId:'c1',amount:1000000,quoteTransferId:'q1'},{id:'o2',partnerId:'s1',amount:500000}],
 payments:[{id:'p1',orderId:'o1',amount:250000},{id:'p2',orderId:'o2',amount:100000}]
});
test('correct receivables and payables',()=>{
 const r=auditDebtSnapshot(fixture());
 assert.deepEqual(r.issues,[]);
 assert.equal(r.totals.receivable,750000);
 assert.equal(r.totals.payable,400000);
});
test('detect duplicate quote import and payment IDs',()=>{
 const d=fixture();d.orders.push({id:'o3',partnerId:'c1',amount:100,quoteTransferId:'q1'});
 d.payments.push({id:'p1',orderId:'o1',amount:250000});
 const codes=auditDebtSnapshot(d).issues.map(x=>x.code);
 assert.ok(codes.includes('DUPLICATE_QUOTE_TRANSFER'));
 assert.ok(codes.includes('DUPLICATE_ID'));
});
test('flag orphan payment and cancelled order with existing payment',()=>{
 const d=fixture();d.orders[0].cancelled=true;d.payments.push({id:'p3',orderId:'missing',amount:10});
 const codes=auditDebtSnapshot(d).issues.map(x=>x.code);
 assert.ok(codes.includes('ORPHAN_PAYMENT'));
 assert.ok(codes.includes('CANCELLED_WITH_PAYMENT'));
 assert.equal(auditDebtSnapshot(d).totals.receivable,0);
});
test('detect overpayment and invalid money',()=>{
 const d=fixture();d.payments[0].amount=1500000;d.orders[1].amount=NaN;
 const codes=auditDebtSnapshot(d).issues.map(x=>x.code);
 assert.ok(codes.includes('OVERPAID_ORDER'));
 assert.ok(codes.includes('INVALID_ORDER_AMOUNT'));
});
test('read-only audit never modifies source',()=>{
 const d=fixture(),before=JSON.stringify(d);
 auditDebtSnapshot(d);
 assert.equal(JSON.stringify(d),before);
});
