const fs=require('fs'),path=require('path');
module.exports=({root,dir,json,body,authenticated})=>{
 const file=path.join(dir,'advertising.json');let state=JSON.parse(fs.readFileSync(fs.existsSync(file)?file:path.join(root,'dist/advertising.json'),'utf8'));
 const url=(v)=>{if(v==='')return true;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}};
 return async(req,res,route)=>{
  if(route!=='/api/advertising')return false;
  if(req.method==='GET'){json(res,200,authenticated(req)?state:{...state,items:state.items.filter(i=>i.enabled)});return true}
  if(!authenticated(req)){json(res,401,{error:'请先登录管理员账号'});return true}
  if(req.method!=='PUT'){json(res,405,{error:'不支持此操作'});return true}
  const b=await body(req);
  if(b.revision!==state.revision){json(res,409,{error:'广告已被其他管理员修改，请重新加载后编辑'});return true}
  if(typeof b.enabled!=='boolean'||!Number.isInteger(b.interval)||b.interval<3||b.interval>30||!Array.isArray(b.items)||b.items.length>12){json(res,400,{error:'广告最多12条，轮播间隔为3–30秒'});return true}
  const items=[];for(const i of b.items){if(!i||typeof i.title!=='string'||!i.title.trim()||i.title.length>80||typeof i.description!=='string'||i.description.length>200||typeof i.image!=='string'||i.image.length>2000||!url(i.image)||typeof i.link!=='string'||i.link.length>2000||!url(i.link)||typeof i.enabled!=='boolean'){json(res,400,{error:'请检查广告内容；图片与跳转地址仅支持HTTPS链接'});return true}items.push({title:i.title.trim(),description:i.description,image:i.image,link:i.link,enabled:i.enabled})}
  const next={revision:state.revision+1,enabled:b.enabled,interval:b.interval,items};fs.writeFileSync(file+'.tmp',JSON.stringify(next,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);state=next;json(res,200,state);return true;
 }
};
