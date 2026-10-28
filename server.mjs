import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require=createRequire(import.meta.url);

// Self-hosted adapter for a separately operated, unofficial NCM API.
// Does not bypass DRM, paywalls or music licensing.
const PORT=Number(process.env.PORT||3000);
const UPSTREAM=(process.env.NETEASE_API_URL||'http://127.0.0.1:3101').replace(/\/$/,'');
const APP_ORIGIN=(process.env.APP_ORIGIN||'').replace(/\/$/,'');
const sessions=new Map();
const pending=new Map();
const now=()=>Date.now();
const json=(res,status,obj,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj))};
function cookie(req){return /(?:^|;\s*)wei_ncm_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1]||''}
function auth(req){const id=cookie(req),s=sessions.get(id);if(!s||s.expires<now()){sessions.delete(id);return null}return s}
function cors(req){const origin=req.headers.origin;return origin&&origin===APP_ORIGIN?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Vary':'Origin'}:{}}
function checkReturn(input){try{const u=new URL(input);if(u.origin===APP_ORIGIN&&['https:','http:'].includes(u.protocol))return u.href}catch{}return APP_ORIGIN||'/'}
async function upstream(path,credential){if(!UPSTREAM)throw Error('NETEASE_API_URL not configured');const url=new URL(UPSTREAM+path);const options={headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)};if(credential)options.headers.Cookie=credential;if(!['http:','https:'].includes(url.protocol))throw Error('Invalid upstream URL');const r=await fetch(url,options);if(!r.ok)throw Error('Upstream HTTP '+r.status);return r.json()}
const tracksOf=x=>Array.isArray(x?.songs)?x.songs:Array.isArray(x?.playlist?.tracks)?x.playlist.tracks:[];
const mapSong=t=>({id:String(t.id),name:t.name||'',artist:(t.ar||t.artists||[]).map(a=>a.name).join(' / '),cover:t.al?.picUrl||t.album?.picUrl||''});
const page=(token,returnTo)=>`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>网易云连接验证</title><style>body{font:16px system-ui;max-width:440px;margin:8vh auto;padding:22px;line-height:1.7;color:#222}img{width:230px;height:230px;object-fit:contain}small{color:#666}button{padding:10px}</style><h2>网易云扫码连接</h2><p>请使用网易云音乐官方 App 扫码并确认。此流程依赖非官方社区接口，非网易云官方授权合作。</p><img id="qr" alt="登录二维码"><p id="status">正在生成二维码…</p><small>请勿向他人提供二维码、密码或登录凭证。登录凭证只存储在本服务进程内，重启即失效。</small><script>const token=${JSON.stringify(token)};const target=${JSON.stringify(returnTo)};async function api(p){let r=await fetch(p,{credentials:'same-origin'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}async function start(){try{let a=await api('/auth/qr/create?t='+token);document.querySelector('#qr').src=a.qrimg;document.querySelector('#status').textContent='等待扫码';let timer=setInterval(async()=>{try{let s=await api('/auth/qr/check?t='+token);document.querySelector('#status').textContent=s.message;if(s.done){clearInterval(timer);location.replace(target)}if(s.expired){clearInterval(timer)}}catch(e){document.querySelector('#status').textContent=e.message}},2500)}catch(e){document.querySelector('#status').textContent='二维码生成失败：'+e.message}}start()</script></html>`;
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');const c=cors(req);if(req.method==='OPTIONS'){res.writeHead(204,{...c,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});return res.end()}
 try{
  if(u.pathname==='/health')return json(res,200,{ok:true,configured:!!UPSTREAM,appOrigin:APP_ORIGIN||null});
  if(!UPSTREAM||!APP_ORIGIN)return json(res,503,{error:'Configure NETEASE_API_URL and APP_ORIGIN',missing:[...(!UPSTREAM?['NETEASE_API_URL']:[]),...(!APP_ORIGIN?['APP_ORIGIN']:[])]},c);
  if(u.pathname==='/api/netease/auth/start'){
   if(req.headers['sec-fetch-site']==='cross-site' && !checkReturn(u.searchParams.get('return_to')).startsWith(APP_ORIGIN))return json(res,403,{error:'Origin not allowed'});
   const t=crypto.randomBytes(24).toString('hex');const ret=checkReturn(u.searchParams.get('return_to'));
   pending.set(t,{created:now(),returnTo:ret});res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'"});return res.end(page(t,ret));
  }
  if(u.pathname==='/auth/qr/create'){
   const p=pending.get(u.searchParams.get('t'));if(!p||now()-p.created>300000)return json(res,410,{error:'QR expired'});
   const key=await upstream('/login/qr/key?timestamp='+now());p.key=key.data?.unikey;if(!p.key)throw Error('No QR key');const qr=await upstream('/login/qr/create?qrimg=true&key='+encodeURIComponent(p.key)+'&timestamp='+now());return json(res,200,{qrimg:qr.data?.qrimg||''});
  }
  if(u.pathname==='/auth/qr/check'){
   const t=u.searchParams.get('t'),p=pending.get(t);if(!p||!p.key||now()-p.created>300000)return json(res,410,{error:'QR expired'});
   const r=await upstream('/login/qr/check?key='+encodeURIComponent(p.key)+'&timestamp='+now());
   if(r.code===803&&r.cookie){const id=crypto.randomBytes(32).toString('hex');sessions.set(id,{credential:r.cookie,expires:now()+7*86400000});pending.delete(t);return json(res,200,{done:true,message:'连接成功'},{'Set-Cookie':`wei_ncm_session=${id}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`})}
   return json(res,200,{done:false,expired:r.code===800,message:({800:'二维码已过期，请重新打开登录',801:'等待扫码',802:'请在网易云 App 确认'})[r.code]||'等待确认'});
  }
  if(u.pathname==='/api/netease/logout'&&req.method==='POST') {sessions.delete(cookie(req));return json(res,200,{ok:true},{...c,'Set-Cookie':'wei_ncm_session=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0'})}
  if(u.pathname==='/api/netease/status')return json(res,200,{connected:!!auth(req),upstreamConfigured:!!UPSTREAM},c);
  if(!u.pathname.startsWith('/api/netease/'))return json(res,404,{error:'Not found'},c);
  const s=auth(req);if(!s)return json(res,401,{error:'Not connected'},c);
  if(u.pathname==='/api/netease/me'){
   const r=await upstream('/login/status?timestamp='+now(),s.credential);const a=r.data?.profile||r.profile;if(!a?.userId)return json(res,401,{error:'Login expired'},c);return json(res,200,{id:String(a.userId),nickname:a.nickname||'',avatar:a.avatarUrl||''},c);
  }
  if(u.pathname==='/api/netease/playlists'){
   const r=await upstream('/login/status?timestamp='+now(),s.credential);const uid=r.data?.profile?.userId||r.profile?.userId;if(!uid)return json(res,401,{error:'Login expired'},c);
   const p=await upstream('/user/playlist?uid='+encodeURIComponent(uid)+'&limit=1000&timestamp='+now(),s.credential);
   return json(res,200,{playlists:(p.playlist||[]).map(x=>({id:String(x.id),name:x.name,cover:x.coverImgUrl||'',trackCount:x.trackCount||0}))},c);
  }
  const m=/^\/api\/netease\/playlists\/(\d+)\/tracks$/.exec(u.pathname);
  if(m){const p=await upstream('/playlist/track/all?id='+m[1]+'&limit=1000&timestamp='+now(),s.credential);return json(res,200,{tracks:tracksOf(p).map(mapSong)},c)}
  const play=/^\/api\/netease\/tracks\/(\d+)\/play$/.exec(u.pathname);
  if(play){return json(res,403,{url:null,message:'未配置官方授权的第三方音频播放接口。请使用网易云官方客户端播放受保护歌曲。'},c)}
  return json(res,404,{error:'Not found'},c);
 }catch(e){return json(res,502,{error:String(e.message||e)},c)}
});
// Run the community API privately on loopback, not exposed to the Internet.
if (!process.env.NETEASE_API_URL) {
 try {
  const pkg=require.resolve('NeteaseCloudMusicApi/package.json');
  const child=spawn(process.execPath,[join(dirname(pkg),'app.js')],{
   env:{...process.env,PORT:'3101',HOST:'127.0.0.1'},stdio:'inherit'
  });
  child.on('exit',(code)=>console.error('Local NCM API exited:',code));
 } catch(e) { console.error('Local NCM API startup failed:',e.message); }
}
server.listen(PORT,()=>console.log('NCM bridge listening on '+PORT));
