const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const production=process.env.NODE_ENV==='production';
let origin=process.env.PUBLIC_ORIGIN||'';
if(origin){const u=new URL(origin);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('PUBLIC_ORIGIN 必须是完整站点来源，不含路径');origin=u.origin}
if(production&&(!origin||!origin.startsWith('https://')))throw Error('生产环境必须配置 HTTPS PUBLIC_ORIGIN');
const trusted=(process.env.TRUSTED_PROXY_IPS||'').split(',').filter(Boolean);if(trusted.some(ip=>!net.isIP(ip)))throw Error('TRUSTED_PROXY_IPS 必须是明确的代理IP列表');
const normalize=ip=>(ip||'').replace(/^::ffff:/,'');
function clientIP(req){const remote=normalize(req.socket.remoteAddress);if(trusted.map(normalize).includes(remote)){const forwarded=req.headers['x-forwarded-for'];if(typeof forwarded==='string'){const ip=forwarded.split(',').at(-1).trim();if(net.isIP(ip))return normalize(ip)}}return remote}
function validOrigin(req){if(req.headers['sec-fetch-site']==='cross-site')return false;return !req.headers.origin||req.headers.origin===(origin||'http://'+req.headers.host)}
function passwordOK(p){return typeof p==='string'&&p.length>=12&&p.length<=256&&p.toLowerCase()!=='adminadminadmin'}
function initialPassword(){const f=process.env.ADMIN_PASSWORD_FILE;return f?fs.readFileSync(f,'utf8').trimEnd():(process.env.ADMIN_PASSWORD||'')}
function headers(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");if(production)res.setHeader('Strict-Transport-Security','max-age=31536000')}
module.exports={production,origin,clientIP,validOrigin,passwordOK,initialPassword,headers,cookieSecure:production||origin.startsWith('https://')?'; Secure':''};
