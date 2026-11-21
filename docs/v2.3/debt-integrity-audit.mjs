// Read-only integrity audit for synthetic fixtures and exported normalized snapshots.
// No browser storage access, network requests, or mutations.
export function auditDebtSnapshot(snapshot) {
  const issues = [];
  const add = (code, entity, id, detail) => issues.push({code, entity, id: String(id ?? ''), detail});
  if (!snapshot || typeof snapshot !== 'object') return [{code:'INVALID_SNAPSHOT',entity:'snapshot',id:'',detail:'Missing snapshot'}];
  const partners = Array.isArray(snapshot.partners) ? snapshot.partners : [];
  const orders = Array.isArray(snapshot.orders) ? snapshot.orders : [];
  const payments = Array.isArray(snapshot.payments) ? snapshot.payments : [];
  for (const [kind, value] of [['partners',snapshot.partners],['orders',snapshot.orders],['payments',snapshot.payments]]) {
    if (!Array.isArray(value)) add('INVALID_COLLECTION',kind,'','Expected array');
  }
  const index = (records,kind) => {
    const map = new Map();
    for (const r of records) {
      if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id) { add('INVALID_ID',kind,r?.id,'Missing ID'); continue; }
      if (map.has(r.id)) add('DUPLICATE_ID',kind,r.id,'Repeated entity ID');
      else map.set(r.id,r);
    }
    return map;
  };
  const pmap=index(partners,'partners'), omap=index(orders,'orders');index(payments,'payments');
  const safeMoney = n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  const paidByOrder=new Map(), transferIds=new Map(), quoteCodes=new Map();
  for (const o of orders) {
    if (!o || typeof o !== 'object') continue;
    if (!pmap.has(o.partnerId)) add('MISSING_PARTNER','orders',o.id,'Order references missing partner');
    if (!safeMoney(o.amount)) add('INVALID_ORDER_AMOUNT','orders',o.id,'Amount must be nonnegative safe integer VND');
    if (o.quoteTransferId) {
      if (transferIds.has(o.quoteTransferId)) add('DUPLICATE_QUOTE_TRANSFER','orders',o.id,'Same transfer as '+transferIds.get(o.quoteTransferId));
      else transferIds.set(o.quoteTransferId,o.id);
    }
    // Quote codes may legitimately be reused by different sources: flag for review, not auto-delete.
    if (o.quoteSourceCode) {
      const key=String(o.quoteSourceCode).trim().toLocaleLowerCase('vi');
      if (quoteCodes.has(key)) add('REVIEW_DUPLICATE_QUOTE_CODE','orders',o.id,'Same code as '+quoteCodes.get(key));
      else quoteCodes.set(key,o.id);
    }
  }
  for (const pay of payments) {
    if (!pay || typeof pay !== 'object') continue;
    if (!omap.has(pay.orderId)) add('ORPHAN_PAYMENT','payments',pay.id,'Payment references missing order');
    if (!safeMoney(pay.amount) || pay.amount === 0) add('INVALID_PAYMENT_AMOUNT','payments',pay.id,'Payment must be positive safe integer VND');
    if (safeMoney(pay.amount) && omap.has(pay.orderId)) paidByOrder.set(pay.orderId,(paidByOrder.get(pay.orderId)||0)+pay.amount);
  }
  const totals={receivable:0,payable:0,unclassified:0,orderCount:orders.length,paymentCount:payments.length,partnerCount:partners.length};
  for (const o of orders) {
    if (!o || typeof o !== 'object' || !safeMoney(o.amount)) continue;
    const paid=paidByOrder.get(o.id)||0;
    if (!Number.isSafeInteger(paid)) {add('UNSAFE_PAYMENT_SUM','orders',o.id,'Payment sum exceeds safe integer');continue;}
    if (o.cancelled && paid>0) add('CANCELLED_WITH_PAYMENT','orders',o.id,'Cancelled order still has payments');
    if (!o.cancelled && paid>o.amount) add('OVERPAID_ORDER','orders',o.id,'Paid exceeds order amount');
    const debt=o.cancelled?0:o.amount-paid;
    const type=pmap.get(o.partnerId)?.type;
    if (type==='customer') totals.receivable+=debt;
    else if (type==='supplier') totals.payable+=debt;
    else totals.unclassified+=debt;
  }
  for (const k of ['receivable','payable','unclassified']) if (!Number.isSafeInteger(totals[k])) add('UNSAFE_DEBT_SUM','snapshot','',k+' exceeds safe integer');
  return {issues,totals};
}
