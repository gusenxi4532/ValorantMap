(function(){
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
let ads={enabled:true,interval:6,items:[]},index=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,hover=false,focus=false,adDraft=null,changed=false;
const slot=make('section',undefined,'ad-slot');slot.setAttribute('aria-label','广告轮播');document.querySelector('.system-status').after(slot);
const content=make('div',undefined,'ad-content'),controls=make('div',undefined,'ad-controls');slot.append(content,controls);
function draw(){slot.hidden=!ads.enabled;content.replaceChildren();controls.replaceChildren();const items=ads.items.filter(i=>i.enabled);index=items.length?index%items.length:0;const item=items[index];const safe=v=>{try{return new URL(v).protocol==='https:'}catch{return false}};const box=make(item?.link&&safe(item.link)?'a':'div',undefined,'ad-card');if(item?.link&&safe(item.link)){box.href=item.link;box.target='_blank';box.rel='noopener noreferrer sponsored'}box.append(make('small',item?'广告':'广告位预留'));if(item?.image&&(safe(item.image)||/^\/media\/[0-9a-f-]{36}$/.test(item.image))){const img=make('img');img.src=item.image;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();box.append(img)}const copy=make('div',undefined,'ad-copy');copy.append(make('strong',item?.title||'为下一次精彩，留一个位置。'),make('span',item?.description||'此处可展示活动、合作与站点推广内容。'));box.append(copy);content.append(box);if(items.length>1){const button=(text,fn,label)=>{const b=make('button',text);b.type='button';b.onclick=fn;if(label)b.setAttribute('aria-label',label);controls.append(b)};button('‹',()=>{index=(index+items.length-1)%items.length;draw()},'上一条广告');controls.append(make('span',(index+1)+' / '+items.length));button('›',()=>{index++;draw()},'下一条广告');button(paused?'播放':'暂停',()=>{paused=!paused;draw()},'切换广告自动轮播')}}
slot.onmouseenter=()=>hover=true;slot.onmouseleave=()=>hover=false;slot.onfocusin=()=>focus=true;slot.onfocusout=e=>focus=slot.contains(e.relatedTarget);
let elapsed=0;setInterval(()=>{if(paused||hover||focus||document.hidden){elapsed=0;return}if(++elapsed>=ads.interval){elapsed=0;if(ads.items.filter(i=>i.enabled).length>1){index++;draw()}}},1000);
async function refreshAds(){try{const data=staticPreview?await fetch('advertising.json').then(r=>{if(!r.ok)throw Error();return r.json()}):await api('advertising');const visible={...data,items:data.items.filter(i=>i.enabled)};if(JSON.stringify(visible)!==JSON.stringify(ads)){ads=visible;index=0;draw()}}catch{if(!content.childElementCount)draw()}}refreshAds();if(!staticPreview)setInterval(refreshAds,10000);
if(!staticPreview)api('site-info').then(info=>{const footer=document.querySelector('footer');const line=make('div');line.className='filing-info';for(const [text,url]of [[info.icp,'https://beian.miit.gov.cn/'],[info.police,info.policeCode?'https://beian.mps.gov.cn/#/query/webSearch?code='+info.policeCode:'']])if(text&&url){const a=make('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';line.append(a,document.createTextNode('　'))}footer.append(line)}).catch(()=>{});
const originalPanel=openPanel;openPanel=function(){if(admin)enter();else originalPanel()};if(adminPage)document.querySelector('#admin').onclick=()=>{if(admin)enter();else originalPanel()};
function route(){if(adminPage&&location.hash==='#admin')enter(false)}window.addEventListener('hashchange',route);
function leaving(){return !changed||confirm('广告有未保存的修改，离开将丢弃修改。是否继续？')}
function enter(hash=true){if(!adminPage)return;if(hash&&location.hash!=='#admin'){location.hash='admin';return}page='management';document.body.dataset.page='management';document.title='网站管理后台 · 森希Valorant';mapObserver?.disconnect();root.replaceChildren();root.append(make('div','森希Valorant / 网站管理','brand-section'),make('h1','网站管理后台'),make('p','集中管理内容、媒体、广告和管理员账号。'));
 if(staticPreview){root.append(make('p','当前为 GitHub Pages 静态浏览版。请启动桌面项目的 Node 服务，然后打开 /admin.html 登录管理。','warning'));return}
 if(!admin){const b=make('button','登录管理员');b.onclick=originalPanel;root.append(make('p','请先登录管理员账号。'),b);return}
 const actions=make('div',undefined,'mg-grid');for(const [title,description,action]of [
 ['地图点位','拖拽校准点位、保存位置并同步到网站。',()=>{editing=true;Toolbox.open('tool:maps')}],
 ['道具与媒体','编辑打法说明、发布状态，上传和管理点位截图与视频。',()=>Toolbox.open('tool:lineups')],
 ['准星与截图','新增或编辑准星名称、代码、说明和截图。',()=>Toolbox.open('tool:crosshairs')],
 ['账号与安全','更改管理员账号、密码或退出登录。',()=>originalPanel()]
 ]){const card=make('button',undefined,'mg-card');card.append(make('strong',title),make('span',description));card.onclick=()=>{if(leaving()){changed=false;action()}};actions.append(card)}root.append(actions);
 const section=make('section',undefined,'panel mg-ad-editor');section.append(make('h2','顶部广告管理'),make('p','最多12条，按列表顺序展示。未启用的条目仅管理员可见；无启用内容时显示预留广告位。'));root.append(section);loadEditor(section);Toolbox.decorate();}
async function loadEditor(section){section.append(make('p','正在读取广告设置…'));try{adDraft=await api('advertising');changed=false;if(page==='management'&&section.isConnected)editor(section)}catch(e){section.lastChild.textContent=e.message;const retry=make('button','重新加载');retry.onclick=()=>loadEditor(section);section.append(retry)}}
function editor(section){section.querySelectorAll(':scope > :not(h2):not(p:first-of-type)').forEach(e=>e.remove());const form=make('form');form.className='mg-form';const message=make('p');message.setAttribute('role','status');
 const field=(parent,label,value,type,onchange,max)=>{const l=make('label',label),input=make('input');input.type=type;if(type==='checkbox')input.checked=value;else input.value=value;if(max)input.maxLength=max;input.oninput=()=>{onchange(type==='checkbox'?input.checked:input.value);changed=true};l.append(input);parent.append(l);return input};
 field(form,'显示顶部广告位',adDraft.enabled,'checkbox',v=>adDraft.enabled=v);const interval=field(form,'轮播间隔（秒）',adDraft.interval,'number',v=>adDraft.interval=Number(v));interval.min=3;interval.max=30;interval.required=true;
 const list=make('div',undefined,'mg-ad-list');form.append(list);
 adDraft.items.forEach((item,n)=>{const card=make('fieldset');card.append(make('legend','广告 '+(n+1)));field(card,'标题',item.title,'text',v=>item.title=v,80).required=true;field(card,'说明',item.description,'text',v=>item.description=v,200);
 const label=make('label','广告图片（上传后居中裁剪为1280×320）');
 const picker=make('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp';label.append(picker);card.append(label);
 if(item.image){const thumb=make('img');thumb.src=item.image;thumb.alt='当前广告图片';thumb.style.maxWidth='100%';card.append(thumb)}
 picker.onchange=async()=>{
   const file=picker.files[0];if(!file)return;
   if(file.size>20*1024*1024){message.textContent='图片不能超过20 MB';return}
   const inputs=[...form.elements].filter(el=>!el.disabled);
   inputs.forEach(el=>el.disabled=true);message.textContent='正在上传并裁剪…';
   try{
     const response=await fetch('/api/media?scope=advertising&kind=images',{method:'POST',body:file});
     const data=await response.json();if(!response.ok)throw Error(data.error);
     item.image=data.url;changed=true;editor(section);
   }catch(error){message.textContent=error.message}finally{inputs.forEach(el=>el.disabled=false)}
 };
 field(card,'跳转地址（HTTPS，可留空）',item.link,'url',v=>item.link=v,2000);field(card,'启用这条广告',item.enabled,'checkbox',v=>item.enabled=v);const row=make('div',undefined,'toolbar');for(const [text,disabled,fn]of [['上移',n===0,()=>{[adDraft.items[n-1],adDraft.items[n]]=[item,adDraft.items[n-1]]}],['下移',n===adDraft.items.length-1,()=>{[adDraft.items[n+1],adDraft.items[n]]=[item,adDraft.items[n+1]]}],['删除',false,()=>adDraft.items.splice(n,1)]]){const b=make('button',text);b.type='button';b.disabled=disabled;b.onclick=()=>{fn();changed=true;editor(section)};row.append(b)}card.append(row);list.append(card)});
 const actions=make('div',undefined,'toolbar'),add=make('button','添加广告'),save=make('button','保存并发布'),reset=make('button','重新加载已保存设置'),preview=make('button','预览轮播');add.type=reset.type=preview.type='button';save.type='submit';add.disabled=adDraft.items.length>=12;add.onclick=()=>{adDraft.items.push({title:'',description:'',image:'',link:'',enabled:false});changed=true;editor(section)};reset.onclick=()=>{if(leaving())loadEditor(section)};preview.onclick=()=>{if(!form.reportValidity())return;ads=structuredClone(adDraft);index=0;draw();slot.scrollIntoView({block:'start',behavior:'smooth'});message.textContent='仅本页预览，保存后才会同步到网站。'};actions.append(add,preview,save,reset);form.append(actions,message);form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{adDraft=await api('advertising','PUT',adDraft);changed=false;await refreshAds();message.textContent='已保存，网站将在10秒内同步广告。'}catch(err){message.textContent=err.message;if(err.status===401){admin=false;header();enter(false)}}finally{save.disabled=false}};section.append(form)}
document.addEventListener('click',e=>{if(changed&&e.target.closest('.tb-nav,#brand-home,#admin')){if(!leaving()){e.preventDefault();e.stopImmediatePropagation()}else changed=false}},true);
window.addEventListener('beforeunload',e=>{if(changed){e.preventDefault();e.returnValue=''}});
const oldHeader=header;header=function(){oldHeader();if(page==='management'&&!admin)enter(false)};
if(adminPage&&(!location.hash||location.hash==='#admin')){if(staticPreview)enter(false);else api('session').then(s=>{admin=s.admin;username=s.username||'';header();enter(false)}).catch(()=>enter(false))}
})();
