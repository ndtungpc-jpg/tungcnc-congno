// Targeted UI-only regression. No real storage, network or accounting operations.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),manifest=JSON.parse(fs.readFileSync('version.json','utf8'));
const script=html.slice(html.indexOf('let waitingAppWorker=null;'),html.indexOf("if('serviceWorker' in navigator&&location.protocol==='https:')"));
assert(script.includes("const APP_VERSION='"+manifest.version+"';"),'HTML version must match published version.json');
let serverVersion=manifest.version,fetches=0,reloads=0,alerts=0;const notice={firstChild:{textContent:''},style:{display:'none'}};
const context={navigator:{onLine:true},document:{getElementById(id){assert.equal(id,'updateNotice');return notice}},fetch:async()=>{fetches++;return {ok:true,json:async()=>({version:serverVersion})}},Date,console,location:{replace(){reloads++}},alert(){alerts++}};vm.createContext(context);vm.runInContext(script,context);
(async()=>{
 await context.checkAppVersion();assert.equal(notice.style.display,'none');console.log('PASS installed Production version does not show a false update');
 serverVersion='2.3.1';await context.checkAppVersion();assert.equal(notice.style.display,'block');assert(notice.firstChild.textContent.includes('2.3.1'));console.log('PASS genuinely different remote version still prompts update');
 serverVersion=manifest.version;await context.checkAppVersion();assert.equal(notice.style.display,'none');console.log('PASS stale remote-version notice clears when version matches');
 let posts=0;context.showAppUpdate({postMessage(m){assert.equal(m.type,'SKIP_WAITING');posts++}});await context.checkAppVersion();assert.equal(notice.style.display,'block');context.applyAppUpdate();assert.equal(posts,1);assert.equal(reloads,0);console.log('PASS real waiting Service Worker stays actionable even at the same app version');
 context.saving=true;context.applyAppUpdate();assert.equal(posts,1);assert.equal(alerts,1);console.log('PASS update remains blocked during a save');
 context.saving=false;vm.runInContext('waitingAppWorker=null;',context);context.applyAppUpdate();assert.equal(reloads,1);context.navigator.onLine=false;const n=fetches;await context.checkAppVersion();assert.equal(fetches,n);console.log('PASS online asset refresh and offline checks require no IndexedDB/localStorage reset');
 assert(!/Đồng bộ thử nghiệm/i.test(html));assert(!/Đồng bộ v2\.3 · Thử nghiệm/.test(fs.readFileSync('sync/client.js','utf8')));console.log('PASS Production header and sync dialog omit trial labels');
})().catch(e=>{console.error(e);process.exitCode=1});
