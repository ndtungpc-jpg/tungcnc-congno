#!/usr/bin/env python3
"""Offline-only, deterministic RC1 environment packaging. Never deploys or contacts D1."""
import argparse, hashlib, json, pathlib, re, subprocess, zipfile, tomllib
ROOT=pathlib.Path(__file__).resolve().parents[1]
SYNC='https://tungcnc-sync-v23-prod.ndtung-pc.workers.dev'
INBOX='https://tungcnc-quote-inbox-prod.ndtung-pc.workers.dev'
DEBT='https://tungcnc-congno.pages.dev'
QUOTE='https://baogia-tungcnc.pages.dev'
TARGET='production-v23'

def transform(path,text):
    if path in ('sync/client.js','sync/worker.js','quote-inbox/worker.js'):
        # Replace entire allowlists, never add Production to a staging allowlist.
        if path=='sync/client.js':
            text=re.sub(r"\['feature-v2-3-sync-foundation\.tungcnc-congno\.pages\.dev'.*?\]",repr(['tungcnc-congno.pages.dev']),text,count=1)
        else:
            origins=[DEBT,QUOTE] if path.startswith('quote-inbox/') else [DEBT]
            text=re.sub(r'ORIGINS=new Set\(\[.*?\]\)', 'ORIGINS=new Set('+json.dumps(origins)+')',text,count=1)
    if path in ('index.html','bao-gia/index.html'):
        host='baogia-tungcnc.pages.dev' if path.startswith('bao-gia/') else 'tungcnc-congno.pages.dev'
        text=re.sub(r"if\(\[.*?\]\.includes\(location.hostname\)\)window.TG_QUOTE_INBOX_API=",'if(location.hostname==='+json.dumps(host)+')window.TG_QUOTE_INBOX_API=',text,count=1)
    text=re.sub(r'https://tungcnc-sync-v23-(?:staging|legacy-acceptance|bootstrap-rehearsal)\.ndtung-pc\.workers\.dev',SYNC,text)
    text=text.replace('https://tungcnc-quote-inbox-staging.ndtung-pc.workers.dev',INBOX)
    text=text.replace('https://test-direct-quote-bridge.tungcnc-congno.pages.dev',DEBT)
    text=text.replace('legacy-acceptance-v23',TARGET)
    if path=='direct-receiver.js':
        text=re.sub(r'const TG_DIRECT_SENDERS=\[.*?\];','const TG_DIRECT_SENDERS='+json.dumps([DEBT,QUOTE])+';',text,count=1)
    if path=='quote-inbox/worker.js':
        old="origin.includes('.baogia-tungcnc.')"
        assert old in text
        text=text.replace(old,'origin==='+json.dumps(QUOTE))
    if path=='index.html': text=text.replace('Sổ công nợ · v2.3 · Đồng bộ thử nghiệm','Sổ công nợ · v2.3 · Đồng bộ')
    if path=='sync/client.js':
        text=text.replace('Đồng bộ v2.3 · Thử nghiệm','Đồng bộ v2.3')
        # Production environment labels only; keep RC1 handlers and layout unchanged.
        text=text.replace('Kết nối kho nghiệm thu riêng · PC A / S24 B','Kết nối đồng bộ Production').replace('Bật đồng bộ STAGING?','Bật đồng bộ Production?').replace('Tên thiết bị thử nghiệm (A/B/C):','Tên thiết bị Production (PC/S24):')
    if path=='version.json': text=json.dumps({'version':'2.3.0','feature':'sync-foundation','production':True})+'\n'
    if path.endswith('_headers'):
        text=text.replace(' '.join([SYNC]*3),SYNC)
    # Freeze layout/UI. Environment strings remain as RC1 pending separate release approval.
    return text

def build(out):
    out=pathlib.Path(out).resolve()
    if out.exists(): raise SystemExit('Output already exists; choose a new empty directory')
    out.mkdir(parents=True)
    files=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
    selected=[]
    for p in files:
        f=pathlib.PurePosixPath(p)
        rootasset=len(f.parts)==1 and (f.suffix in ('.html','.js','.css','.webmanifest','.xlsx','.png','.ico','.json') or p=='_headers')
        asset=(p.startswith(('icons/','vendor/','lib/','assets/'))) or (p.startswith('bao-gia/') and f.suffix in ('.html','.js','.css','.webmanifest','.png')) or p=='bao-gia/_headers'
        runtime=p.startswith('sync/') and len(f.parts)==2 and f.suffix=='.js'
        if rootasset or asset or runtime:
            selected.append(p)
            dest=out/'pages'/p;dest.parent.mkdir(parents=True,exist_ok=True)
            data=(ROOT/p).read_bytes()
            if f.suffix in ('.js','.html','.css','.json') or p.endswith('_headers'): data=transform(p,data.decode()).encode()
            dest.write_bytes(data)
    for kind,dbid,name,origins in [('sync','bacea568-a449-4f7e-b392-c6ed54b72c57','tungcnc-sync-v23-prod',[DEBT]),('quote-inbox','78e3141d-d03c-4012-adff-e1c2002085fa','tungcnc-quote-inbox-prod',[DEBT,QUOTE])]:
        folder=out/'workers'/kind;folder.mkdir(parents=True)
        for p in ['worker.js']+(['safety.js','core.js'] if kind=='sync' else []):
            text=transform(kind+'/'+p,(ROOT/kind/p).read_text())
            if kind=='sync': text=text.replace("import '../reminder-history.js'","import './reminder-history.js'")
            (folder/p).write_text(text)
        if kind=='sync': (folder/'reminder-history.js').write_bytes((ROOT/'reminder-history.js').read_bytes())
        wrapper="""import runtime from './worker.js';
const origins=new Set(ORIGINS);
export default {async fetch(request,env,ctx){
 const origin=request.headers.get('Origin');
 if(!origins.has(origin))return new Response(JSON.stringify({error:'Origin not allowed'}),{status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(!['GET','HEAD','OPTIONS'].includes(request.method)&&env.RELEASE_WRITES!=='enabled')return new Response(JSON.stringify({error:'Production đang khóa ghi; giữ nguyên hàng đợi và thử lại sau xác nhận chủ xưởng'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin','Retry-After':'60'}});
 return runtime.fetch(request,env,ctx);
}};
""".replace('ORIGINS',json.dumps(origins))
        (folder/'entry.js').write_text(wrapper)
        config=f'name = "{name}"\nmain = "entry.js"\ncompatibility_date = "2026-11-21"\nworkers_dev = true\n[vars]\nRELEASE_WRITES = "blocked"\n'
        if kind=='sync': config+=f'INITIAL_BOOTSTRAP_TARGET = "{TARGET}"\n'
        if kind=='sync': config+='PUBLIC_INITIAL_BOOTSTRAP = \"disabled\"\n'
        config+=f'[[d1_databases]]\nbinding = "DB"\ndatabase_name = "{name}"\ndatabase_id = "{dbid}"\n'
        parsed=tomllib.loads(config)
        assert 'limits' not in parsed and parsed['vars']['RELEASE_WRITES']=='blocked'
        assert parsed['d1_databases'][0]['database_id']==dbid
        (folder/'wrangler.toml').write_text(config)
        schemas=['schema.sql','initial-guard.sql'] if kind=='sync' else ['schema.sql','schema-device.sql']
        (folder/'schema.sql').write_text('\n'.join(transform(kind+'/'+s,(ROOT/kind/s).read_text()) for s in schemas))
        if kind=='sync': (folder/'owner-admin-initial.sql').write_text((ROOT/'sync/admin-initial.sql').read_text())
    paths=sorted(p for p in out.rglob('*') if p.is_file())
    manifest={'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'target':TARGET,'builderSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'requiresWorkersPaid':False,'workerCpuBudgetMs':10,'initialization':'owner-admin-once','publicInitialBootstrap':'disabled','writesDefault':'blocked','deploymentPerformed':False,'files':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    with zipfile.ZipFile(str(out)+'.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(out.rglob('*')):
            if p.is_file():
                info=zipfile.ZipInfo(str(p.relative_to(out)),(2026,11,23,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
    print(json.dumps({'directory':str(out),'zip':str(out)+'.zip','zipSha256':hashlib.sha256(pathlib.Path(str(out)+'.zip').read_bytes()).hexdigest(),'files':len(paths)},indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',required=True);build(p.parse_args().out)
