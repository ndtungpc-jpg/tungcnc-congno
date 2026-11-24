// Access JWT verification is mandatory even when called outside the Pages edge.
let cached=null,loadedAt=0;
const bytes=s=>{if(!/^[A-Za-z0-9_-]+$/.test(s)||s.length%4===1)throw Error('Invalid token');const base=s.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(base+'='.repeat((4-base.length%4)%4)),c=>c.charCodeAt(0));};
const decode=s=>JSON.parse(new TextDecoder().decode(bytes(s)));
export async function verifyAccess(request,env,{fetcher=fetch,now=Date.now()}={}){
 const token=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!token||token.length>16384)throw Error('Access required');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
 const header=decode(parts[0]),claims=decode(parts[1]),seconds=now/1000;
 if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)throw Error('Invalid signature algorithm');
 if(claims.iss!==env.ACCESS_ISSUER)throw Error('Access issuer denied');
 if(!(Array.isArray(claims.aud)?claims.aud:[claims.aud]).includes(env.ACCESS_AUD))throw Error('Access audience denied');
 if(claims.email!==env.ACCESS_OWNER_EMAIL)throw Error('Access email denied');
 if(typeof claims.sub!=='string'||!claims.sub)throw Error('Access subject denied');
 if(claims.type!=='app')throw Error('Access token type denied');
 if(!Number.isFinite(claims.exp)||claims.exp<=seconds)throw Error('Access expiration denied');
 if(!Number.isFinite(claims.iat)||claims.iat>seconds+30)throw Error('Access issued time denied');
 if(claims.nbf!==undefined&&(!Number.isFinite(claims.nbf)||claims.nbf>seconds+30))throw Error('Access not-before denied');
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER)||!env.ACCESS_AUD)throw Error('Access not configured');
 if(!cached||cached.issuer!==env.ACCESS_ISSUER||now-loadedAt>300000){const response=await fetcher(env.ACCESS_ISSUER+'/cdn-cgi/access/certs',{redirect:'manual'});if(!response.ok)throw Error('Access keys unavailable');const body=await response.json();if(!Array.isArray(body.keys)||body.keys.length>20)throw Error('Invalid Access keys');cached={issuer:env.ACCESS_ISSUER,keys:body.keys};loadedAt=now;}
 const jwk=cached.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));
 if(!jwk)throw Error('Unknown Access key');const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const signature=bytes(parts[2]);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('Invalid Access signature');
 return {email:claims.email,subject:claims.sub,expiresAt:claims.exp*1000};
}
