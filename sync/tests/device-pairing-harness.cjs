// Only v2.4 pairing and its existing sync integration; isolated SQLite + fake IndexedDB.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const pairingEnv={};
let preamble=fs.readFileSync(path.join(__dirname,'sync.cjs'),'utf8').split('(async()=>{')[0];
preamble=preamble.replace("const makeEngine=store=>new Engine({store,api:'https://sync.test',origin,","const makeEngine=(store,originOverride=origin)=>new Engine({store,api:'https://sync.test',origin:originOverride,");
preamble=preamble.replace("const ctx={TGSyncCore:C,", "const ctx={TGDevicePairing:require('../pairing.js'),TGSyncCore:C,").replace(".replace('export default','globalThis.worker=')", ".replace(\"import './pairing.js';\",'').replace('export default','globalThis.worker=')").replace('worker.fetch(req,{DB})',"worker.fetch(req,{DB,ENABLE_DEVICE_PAIRING:'true',...pairingEnv})");
const {sql,makeStore,makeEngine,change,cloud,network,C,worker,DB}=new Function('require','__dirname','pairingEnv',preamble+';return {sql,makeStore,makeEngine,change,cloud,network,C,worker,DB};')(require,__dirname,pairingEnv);
sql.exec(fs.readFileSync('sync/schema-pairing.sql','utf8'));

module.exports={worker,DB,pairingEnv,sql,makeStore,makeEngine,change,cloud,network,C};
