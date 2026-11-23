// Only v2.4 pairing and its existing sync integration; isolated SQLite + fake IndexedDB.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let preamble=fs.readFileSync(path.join(__dirname,'sync.cjs'),'utf8').split('(async()=>{')[0];
preamble=preamble.replace("const ctx={TGSyncCore:C,", "const ctx={TGDevicePairing:require('../pairing.js'),TGSyncCore:C,").replace(".replace('export default','globalThis.worker=')", ".replace(\"import './pairing.js';\",'').replace('export default','globalThis.worker=')").replace('worker.fetch(req,{DB})',"worker.fetch(req,{DB,ENABLE_DEVICE_PAIRING:'true'})");
const {sql,makeStore,makeEngine,change,cloud,network,C}=new Function('require','__dirname',preamble+';return {sql,makeStore,makeEngine,change,cloud,network,C};')(require,__dirname);
sql.exec(fs.readFileSync('sync/schema-pairing.sql','utf8'));

module.exports={sql,makeStore,makeEngine,change,cloud,network,C};
