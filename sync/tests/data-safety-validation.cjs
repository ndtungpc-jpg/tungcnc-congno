const fs=require('fs'),path=require('path'),assert=require('assert');
global.TGSafety=require('../safety.js');global.TGReminderHistory=require('../../reminder-history.js');const C=require('../core.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/accepted-quote.json'))),before=JSON.stringify(source);C.validate(source);assert.equal(JSON.stringify(source),before);
for(const mutate of [s=>s.orders[0].quoteItems[0].quantity=-50,s=>s.orders[0].quoteItems[0].unitPrice='INVALID',s=>s.orders[0].quoteItems[0].sizes=[{widthMm:-1}],s=>s.orders[0].quoteItems=null]){const x=structuredClone(source);mutate(x);if(x.orders[0].quoteItems===null){C.validate(x);continue;}assert.throws(()=>C.validate(x),/không hợp lệ/);}
const numericStrings=structuredClone(source);numericStrings.orders[0].quoteItems[0].quantity='3.5';numericStrings.orders[0].quoteItems[0].sizes=[{widthMm:'',heightMm:'2000',count:'1'}];const snapshot=JSON.stringify(numericStrings);C.validate(numericStrings);assert.equal(JSON.stringify(numericStrings),snapshot);
const decimal=structuredClone(source);decimal.orders[0].amount=3.5;assert.equal(C.validate(decimal).orders[0].amount,3.5);
// Check real relative Worker import paths, unlike VM tests that strip imports.
for(const match of fs.readFileSync(path.join(__dirname,'../worker.js'),'utf8').matchAll(/import\s+['"]([^'"]+)['"]/g))assert(fs.existsSync(path.resolve(__dirname,'..',match[1])),'Missing Worker import '+match[1]);
console.log('PASS invalid nested details rejected; blanks/numeric legacy strings preserved without conversion; fractional historical order total preserved; real Worker relative imports resolve');

for(const value of [NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'3.5',null]){const x=structuredClone(source);x.orders[0].amount=value;assert.throws(()=>C.validate(x),/orders.*amount/);}
const original=structuredClone(decimal);assert.deepEqual(C.moneyDiagnostics(decimal),[{kind:'orders',id:decimal.orders[0].id,field:'amount',value:3.5,type:'number',compatible:true}]);assert.deepEqual(decimal,original);
global.TGSyncCore=C;const R=require('../reconcile.js');const huge=structuredClone(source);huge.orders[0].note='x'.repeat(5000001);assert.throws(()=>R.batches(huge,[],()=>({})),/5.000.000/);console.log('PASS exact diagnostic IDs/values, no mutation, invalid money rejected, snapshot cap blocks even no-op');
