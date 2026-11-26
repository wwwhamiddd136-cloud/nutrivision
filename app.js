/* NutriVision AI · app logic */
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LS_KEY = 'nutrivision.v1';

/* ---------- state ---------- */
let S = load();
function load(){
  try { const s = JSON.parse(localStorage.getItem(LS_KEY)); if (s && s.profile) return s; } catch(e){}
  return { profile:{name:'',sex:'m',age:null,height:null,weight:null,activity:1.375,goal:'keep',targetKcal:2000,lang:'ar',theme:'dark',onboarded:false},profileT:0,
           days:{}, weights:[], chat:[], aiConsent:false };
}
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(S)); }
function todayKey(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function day(key){ if(!S.days[key]) S.days[key]={meals:[],water:0}; return S.days[key]; }
function t(k){ const d=T(S.profile.lang); return d[k]!==undefined?d[k]:(I18N.ar[k]||k); }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function round1(x){ return Math.round(x*10)/10; }
const KJ_PER_KCAL = 4.184;

/* ---------- i18n ---------- */
function applyLang(){
  const lang=S.profile.lang, d=T(lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=d.dir;
  $$('[data-i]').forEach(el=>{ el.textContent=t(el.dataset.i); });
  $('#splashTag').textContent=t('tagline');
  $('#btnTake').textContent='📷 '+t('takePhoto');
  $('#btnGallery').textContent='🖼 '+t('fromGallery');
  $('#btnManual').textContent='✍️ '+t('manualAdd');
  $('#anTxt').textContent=t('analyzing'); $('#anHint').textContent=t('analyzingHint');
  $('#btnLogMeal').textContent='✓ '+t('addToDiary'); $('#btnRetake').textContent=t('retake');
  $('#searchInput').placeholder=t('searchPh'); $('#btnSearch').textContent=t('searchFood');
  $('#matchInput').placeholder=t('searchPh'); $('#btnMatchSearch').textContent=t('searchFood');
  $('#chatInput').placeholder=t('aiPh');
  $('#privacyTxt').textContent=t('privacyNote')+' · NutriVision AI v1.1.1';
  // profile form labels
  $('#pTitle').textContent=t('pTitle'); $('#pSub').textContent=t('pSub');
  $('#pSave').textContent=t('start'); $('#obLangTitle').textContent=t('chooseLang');
  $$('#sexSeg button').forEach(b=>b.textContent=b.dataset.v==='m'?t('male'):t('female'));
  const acts=['act1','act2','act3','act4'];
  [...$('#fActivity').options].forEach((o,i)=>o.textContent=t(acts[i]));
  $$('#goalSeg button').forEach(b=>b.textContent=t('goal'+b.dataset.v[0].toUpperCase()+b.dataset.v.slice(1)));
  $$('#mealSeg button').forEach(b=>b.textContent=t(b.dataset.meal));
  $$('#themeSeg button').forEach(b=>b.textContent=t(b.dataset.theme));
  $$('.seg[data-seg-lang] button, #langSeg button, #setLangSeg button').forEach(b=>b.classList.toggle('on',b.dataset.lang===lang));
  $$('#themeSeg button').forEach(b=>b.classList.toggle('on',b.dataset.theme===S.profile.theme));
  renderAll();
}

/* ---------- theme ---------- */
function applyTheme(){ document.body.classList.toggle('light', S.profile.theme==='light'); }

/* ---------- toast ---------- */
let toastT;
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.remove('hidden'); el.style.animation='none'; void el.offsetWidth; el.style.animation=''; clearTimeout(toastT); toastT=setTimeout(()=>el.classList.add('hidden'),2200); }

/* ---------- routing ---------- */
let currentView='home';
function go(view){
  currentView=view;
  $$('#views .view').forEach(v=>v.classList.add('hidden'));
  $('#view-'+view).classList.remove('hidden');
  $$('#bottomnav button').forEach(b=>b.classList.toggle('on',b.dataset.view===view));
  $('#chatBar').classList.toggle('hidden', view!=='ai');
  $('#views').scrollTop=0;
  if(view==='home') renderHome();
  if(view==='diary') renderDiary();
  if(view==='progress') renderProgress();
  if(view==='ai') renderChat();
  if(view==='scan') resetScan(false);
}
$$('#bottomnav button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));

/* ---------- splash & onboarding ---------- */
const OB_SLIDES=[['📸','ob1t','ob1d'],['🥗','ob2t','ob2d'],['📊','ob3t','ob3d']];
let obIdx=0;
function renderObSlide(){
  const [em,tk,dk]=OB_SLIDES[obIdx];
  $('#obSlides').innerHTML=`<div class="ob-slide"><span class="em">${em}</span><h2>${t(tk)}</h2><p>${t(dk)}</p></div>`;
  $('#obDots').innerHTML=OB_SLIDES.map((_,i)=>`<i class="${i===obIdx?'on':''}"></i>`).join('');
  $('#obSkip').textContent=t('skip');
  $('#obNext').textContent=obIdx<OB_SLIDES.length-1?t('next'):t('start');
  $('#obLang').classList.toggle('show', obIdx===OB_SLIDES.length-1);
}
$('#obNext').addEventListener('click',()=>{
  if(obIdx<OB_SLIDES.length-1){ obIdx++; renderObSlide(); }
  else { $('#obSlides').classList.add('hidden'); $('#obDots').classList.add('hidden'); $('.ob-actions').classList.add('hidden'); $('#obLang').classList.add('hidden'); $('#profileForm').classList.remove('hidden'); }
});
$('#obSkip').addEventListener('click',()=>{ obIdx=OB_SLIDES.length-1; $('#obNext').click(); });
$$('#langSeg button').forEach(b=>b.addEventListener('click',e=>{e.preventDefault(); S.profile.lang=b.dataset.lang; save(); applyLang(); renderObSlide();}));
$$('#setLangSeg button').forEach(b=>b.addEventListener('click',()=>{ S.profile.lang=b.dataset.lang; save(); applyLang(); }));
$$('#themeSeg button').forEach(b=>b.addEventListener('click',()=>{ S.profile.theme=b.dataset.theme; save(); applyTheme(); applyLang(); }));

/* segmented controls in profile form */
$$('#sexSeg button').forEach(b=>b.addEventListener('click',()=>{ $$('#sexSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); calcPreview(); }));
$$('#goalSeg button').forEach(b=>b.addEventListener('click',()=>{ $$('#goalSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); calcPreview(); }));
['fAge','fHeight','fWeight','fActivity'].forEach(id=>$('#'+id).addEventListener('input',calcPreview));

function mifflin(sex,w,h,a,act,goal){
  let bmr = 10*w + 6.25*h - 5*a + (sex==='m'?5:-161);
  let k = bmr*act + (goal==='lose'?-400:goal==='gain'?300:0);
  return Math.max(1200, Math.round(k));
}
function calcPreview(){
  const age=+$('#fAge').value, h=+$('#fHeight').value, w=+$('#fWeight').value, act=+$('#fActivity').value;
  const sex=$('#sexSeg .on').dataset.v, goal=$('#goalSeg .on').dataset.v;
  const el=$('#kcalPreview');
  if(age&&h&&w){ el.classList.add('show'); el.textContent='≈ '+mifflin(sex,w,h,age,act,goal)+' '+t('kcalDay'); }
  else el.classList.remove('show');
}
let editingProfile=false;
$('#profileForm').addEventListener('submit',e=>{
  e.preventDefault();
  const p=S.profile;
  p.name=$('#fName').value.trim()||p.name;
  p.sex=$('#sexSeg .on').dataset.v; p.age=+$('#fAge').value; p.height=+$('#fHeight').value;
  p.weight=+$('#fWeight').value; p.activity=+$('#fActivity').value; p.goal=$('#goalSeg .on').dataset.v;
  p.targetKcal=mifflin(p.sex,p.weight,p.height,p.age,p.activity,p.goal);
  p.onboarded=true; S.profileT=Date.now(); save();
  if(window.NVAuth) NVAuth.pushProfile();
  if(p.weight){ logWeight(p.weight); }
  $('#onboarding').classList.add('hidden');
  if(editingProfile){ editingProfile=false; $('#settingsSheet').classList.remove('hidden'); }
  $('#app').classList.remove('hidden');
  applyLang(); go('home'); toast(t('savedToast')+' ✓');
});
function logWeight(kg){
  const k=todayKey();
  const ex=S.weights.find(w=>w.d===k);
  if(ex) ex.kg=kg; else S.weights.push({d:k,kg});
  save();
}
$('#btnEditProfile').addEventListener('click',()=>{
  editingProfile=true;
  const p=S.profile;
  $('#settingsSheet').classList.add('hidden');
  $('#app').classList.add('hidden');
  $('#onboarding').classList.remove('hidden');
  $('#obSlides').classList.add('hidden'); $('#obDots').classList.add('hidden'); $('.ob-actions').classList.add('hidden'); $('#obLang').classList.add('hidden');
  $('#profileForm').classList.remove('hidden');
  $('#fName').value=p.name; $('#fAge').value=p.age; $('#fHeight').value=p.height; $('#fWeight').value=p.weight; $('#fActivity').value=p.activity;
  $$('#sexSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===p.sex));
  $$('#goalSeg button').forEach(b=>b.classList.toggle('on',b.dataset.v===p.goal));
  calcPreview();
});

/* ---------- init ---------- */
function init(){
  applyTheme();
  setTimeout(()=>$('#splash').classList.add('bye'),1900);
  if(!S.profile.onboarded){ applyLang(); renderObSlide(); $('#onboarding').classList.remove('hidden'); return; }
  applyLang();
  $('#app').classList.remove('hidden');
  go('home');
}
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js').catch(()=>{}); }

/* ---------- totals ---------- */
function mealTotals(m){ return m.totals; }
function dayTotals(key){
  const d=S.days[key]||{meals:[],water:0}, tot={kcal:0,p:0,c:0,f:0,fib:0};
  d.meals.forEach(m=>{ tot.kcal+=m.totals.kcal; tot.p+=m.totals.p; tot.c+=m.totals.c; tot.f+=m.totals.f; tot.fib+=(m.totals.fib||0); });
  return tot;
}
function fmtDateLabel(key){
  const [y,m,dd]=key.split('-').map(Number);
  const d=new Date(y,m-1,dd);
  const loc=S.profile.lang==='ar'?'ar-MA':S.profile.lang==='fr'?'fr-FR':'en-US';
  return d.toLocaleDateString(loc,{weekday:'long',day:'numeric',month:'long'});
}

/* ---------- home ---------- */
function renderHome(){
  const p=S.profile, key=todayKey(), tot=dayTotals(key);
  const hr=new Date().getHours();
  const sep=S.profile.lang==='ar'?'، ':', ';
  $('#tbHello').textContent=(hr<18?t('gMorning'):t('gEvening'))+(p.name?sep+p.name:'');
  $('#tbDate').textContent=fmtDateLabel(key);
  const target=p.targetKcal||2000;
  const eaten=Math.round(tot.kcal);
  const left=Math.max(0,target-eaten);
  $('#ringNum').textContent=left;
  $('#ringLabel').textContent=t('kcalLeft');
  $('#statEaten').textContent=eaten+' '+t('kcal');
  $('#statTarget').textContent=target+' '+t('kcal');
  const circ=327;
  $('#ringFg').style.strokeDashoffset=circ*(1-Math.min(1,eaten/target));
  const pm={p:[tot.p,(target*0.25)/4],c:[tot.c,(target*0.45)/4],f:[tot.f,(target*0.30)/9]};
  $('#mP').innerHTML=round1(tot.p)+'<span> '+t('g')+'</span>';
  $('#mC').innerHTML=round1(tot.c)+'<span> '+t('g')+'</span>';
  $('#mF').innerHTML=round1(tot.f)+'<span> '+t('g')+'</span>';
  $('#bP').style.width=Math.min(100,pm.p[0]/pm.p[1]*100)+'%';
  $('#bC').style.width=Math.min(100,pm.c[0]/pm.c[1]*100)+'%';
  $('#bF').style.width=Math.min(100,pm.f[0]/pm.f[1]*100)+'%';
  $('#waterTxt').textContent=day(key).water+' '+t('ml')+' · '+t('waterToday');
  renderMeals($('#homeMeals'), key, false);
}
$$('.w-btns .chip').forEach(b=>b.addEventListener('click',()=>{
  const key=todayKey(); const d=day(key);
  d.water=Math.max(0,d.water+ +b.dataset.water); save(); renderHome();
}));
$('#goScan1').addEventListener('click',()=>go('scan'));

/* ---------- meals list ---------- */
const MEAL_ICON={breakfast:'🌅',lunch:'☀️',dinner:'🌙',snack:'🍎'};
function renderMeals(el,key,deletable){
  const meals=day(key).meals;
  if(!meals.length){ el.innerHTML=`<div class="empty">${t('noMeals')}<br>${deletable?'':t('addMeal')+' 👇'}</div>`; return; }
  el.innerHTML=meals.map(m=>`
    <div class="meal" data-id="${m.id}">
      <div class="thumb">${m.photo?`<img src="${m.photo}" alt="">`:MEAL_ICON[m.type]||'🍽'}</div>
      <div class="m-body">
        <div class="m-name">${esc(m.name)}</div>
        <div class="m-sub">${t(m.type)} · ${Math.round(m.totals.p)}${t('g')} ${t('protein')}</div>
      </div>
      <div class="m-kcal">${Math.round(m.totals.kcal)} ${t('kcal')}</div>
      ${deletable?`<button class="m-del" data-del="${m.id}">🗑</button>`:''}
    </div>`).join('');
  if(deletable) el.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{
    const d=day(key); d.meals=d.meals.filter(m=>m.id!==b.dataset.del); save(); renderDiary(); renderHome(); toast(t('deletedToast'));
  }));
}

/* ---------- diary ---------- */
let diaryOffset=0;
function diaryKey(){ const d=new Date(); d.setDate(d.getDate()+diaryOffset); return todayKey(d); }
function renderDiary(){
  const key=diaryKey();
  $('#dayLabel').textContent=diaryOffset===0?t('today'):fmtDateLabel(key);
  const tot=dayTotals(key);
  $('#dayTotal').innerHTML=`
    <div><b>${Math.round(tot.kcal)}</b><span>${t('kcal')}</span></div>
    <div><b>${round1(tot.p)}</b><span>${t('protein')} (${t('g')})</span></div>
    <div><b>${round1(tot.c)}</b><span>${t('carbs')} (${t('g')})</span></div>
    <div><b>${round1(tot.f)}</b><span>${t('fat')} (${t('g')})</span></div>`;
  const el=$('#diaryMeals');
  const meals=day(key).meals;
  if(!meals.length){ el.innerHTML=`<div class="empty">${t('noEntries')}</div>`; return; }
  renderMeals(el,key,true);
}
$('#dayPrev').addEventListener('click',()=>{ diaryOffset--; renderDiary(); });
$('#dayNext').addEventListener('click',()=>{ if(diaryOffset<0) diaryOffset++; renderDiary(); });

/* ---------- scan flow ---------- */
let scanItems=[];      // [{name,nameEn,grams,match:{fdcId,description,per100}|null,conf}]
let scanDish='', scanPhoto='', scanThumb='';
let apiAvailable=true;

async function apiPost(path, body, timeoutMs){
  const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(), timeoutMs||30000);
  try{
    const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal});
    clearTimeout(to);
    if(!r.ok) throw new Error('http '+r.status);
    return await r.json();
  }catch(e){ clearTimeout(to); throw e; }
}
function resizeImage(file,maxDim,quality){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      const k=Math.min(1,maxDim/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      res(c.toDataURL('image/jpeg',quality));
    };
    img.onerror=rej;
    img.src=URL.createObjectURL(file);
  });
}
function resetScan(clearData=true){
  if(clearData){ scanItems=[]; scanDish=''; scanPhoto=''; }
  $('#scanHome').classList.remove('hidden');
  $('#scanAnalyzing').classList.add('hidden');
  $('#scanResults').classList.add('hidden');
  $('#scanManual').classList.add('hidden');
}
$('#btnTake').addEventListener('click',()=>ensureAiConsent(()=>$('#fileCam').click()));
$('#btnGallery').addEventListener('click',()=>ensureAiConsent(()=>$('#fileGal').click()));

/* ---------- AI consent (required before any upload to Gemini) ---------- */
let aiConsentCb=null;
function ensureAiConsent(cb){
  if(S.aiConsent) return cb();
  aiConsentCb=cb;
  $('#aiConsentSheet').classList.remove('hidden');
}
$('#btnAiYes').addEventListener('click',()=>{ S.aiConsent=true; save(); $('#aiConsentSheet').classList.add('hidden');
  const cb=aiConsentCb; aiConsentCb=null; refreshAiState(); if(cb) cb(); });
$('#btnAiNo').addEventListener('click',()=>{ aiConsentCb=null; $('#aiConsentSheet').classList.add('hidden'); });
$('#aiConsentSheet').addEventListener('click',e=>{ if(e.target.id==='aiConsentSheet'){ aiConsentCb=null; $('#aiConsentSheet').classList.add('hidden'); } });
function refreshAiState(){ const el=$('#aiConsentState'); if(el) el.textContent=t(S.aiConsent?'aiStatOn':'aiStatOff'); }
$('#btnAiConsent').addEventListener('click',()=>{
  if(S.aiConsent){ S.aiConsent=false; save(); refreshAiState(); toast(t('aiStatOff')+' ✓'); }
  else ensureAiConsent(()=>{});
});
$('#btnManual').addEventListener('click',()=>{ $('#scanHome').classList.add('hidden'); $('#scanManual').classList.remove('hidden'); $('#searchInput').focus(); });
$('#fileCam').addEventListener('change',e=>handlePhoto(e.target.files[0]));
$('#fileGal').addEventListener('change',e=>handlePhoto(e.target.files[0]));

async function handlePhoto(file){
  if(!file) return;
  $('#fileCam').value=''; $('#fileGal').value='';
  scanPhoto=await resizeImage(file,1024,0.82);
  scanThumb=await resizeImage(file,160,0.7);
  $('#anImg').src=scanPhoto;
  $('#scanHome').classList.add('hidden');
  $('#scanAnalyzing').classList.remove('hidden');
  try{
    const r=await apiPost('/api/analyze',{image:scanPhoto,lang:S.profile.lang},60000);
    if(!r.ok||!r.items||!r.items.length) throw new Error('bad');
    scanDish=r.dish||'';
    scanItems=r.items.slice(0,12).map(it=>({name:it.name||it.name_en,nameEn:it.name_en||it.name,grams:Math.round(it.grams)||100,conf:it.confidence||'medium',match:null}));
    // nutrition lookup per item
    await Promise.all(scanItems.map(async it=>{ it.match=await findNutrition(it.nameEn); }));
    renderScanResults();
  }catch(e){
    $('#scanAnalyzing').classList.add('hidden');
    if(!apiAvailable || (e.message||'').includes('http 40')){
      alert(t('scanOff'));
    }else alert(t('scanErr'));
    $('#scanHome').classList.remove('hidden');
  }
}
async function findNutrition(query){
  try{
    const r=await apiPost('/api/nutrition',{query},20000);
    if(r.ok&&r.results&&r.results.length) return r.results[0];
    return null;
  }catch(e){
    // offline fallback: built-in DB
    const hit=searchLocal(query)[0];
    return hit?{fdcId:hit.id,description:hit.en,per100:{kcal:hit.kcal,p:hit.p,c:hit.c,f:hit.f,fib:hit.fib},local:true}:null;
  }
}
function itemKcal(it){ return it.match?it.match.per100.kcal*it.grams/100:0; }
function itemNut(it){ const k=it.grams/100,p=it.match?it.match.per100:{kcal:0,p:0,c:0,f:0,fib:0};
  return {kcal:p.kcal*k,p:p.p*k,c:p.c*k,f:p.f*k,fib:(p.fib||0)*k}; }

function renderScanResults(){
  $('#scanAnalyzing').classList.add('hidden');
  $('#scanResults').classList.remove('hidden');
  $('#dishName').textContent=scanDish?('🍽 '+scanDish):'';
  const wrap=$('#scanItems');
  wrap.innerHTML=scanItems.map((it,i)=>`
    <div class="scan-item" data-i="${i}">
      <div class="si-body">
        <div class="si-name">${esc(it.name)}</div>
        <div class="si-match ${it.match?'ok':'no'}" data-match="${i}">${it.match?('USDA: '+esc(it.match.description)):t('notInDb')}</div>
      </div>
      <input type="number" min="1" max="2000" value="${it.grams}" data-grams="${i}" inputmode="numeric">
      <div class="si-kcal">${Math.round(itemKcal(it))}</div>
      <button class="si-x" data-x="${i}">✕</button>
    </div>`).join('');
  wrap.querySelectorAll('[data-grams]').forEach(inp=>inp.addEventListener('input',()=>{
    scanItems[+inp.dataset.grams].grams=Math.max(1,+inp.value||1);
    inp.closest('.scan-item').querySelector('.si-kcal').textContent=Math.round(itemKcal(scanItems[+inp.dataset.grams]));
    renderScanTotal();
  }));
  wrap.querySelectorAll('[data-x]').forEach(b=>b.addEventListener('click',()=>{ scanItems.splice(+b.dataset.x,1); renderScanResults(); }));
  wrap.querySelectorAll('[data-match]').forEach(el=>el.addEventListener('click',()=>openMatch(+el.dataset.match)));
  renderScanTotal();
}
function renderScanTotal(){
  const tot={kcal:0,p:0,c:0,f:0};
  scanItems.forEach(it=>{ const n=itemNut(it); tot.kcal+=n.kcal; tot.p+=n.p; tot.c+=n.c; tot.f+=n.f; });
  $('#scanTotal').innerHTML=`
    <div><b>${Math.round(tot.kcal)}</b><span>${t('kcal')}</span></div>
    <div><b>${round1(tot.p)}</b><span>${t('protein')}</span></div>
    <div><b>${round1(tot.c)}</b><span>${t('carbs')}</span></div>
    <div><b>${round1(tot.f)}</b><span>${t('fat')}</span></div>`;
}
$$('#mealSeg button').forEach(b=>b.addEventListener('click',()=>{ $$('#mealSeg button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); }));
$('#btnRetake').addEventListener('click',()=>resetScan());
$('#btnLogMeal').addEventListener('click',()=>{
  if(!scanItems.length) return;
  const tot={kcal:0,p:0,c:0,f:0,fib:0};
  const items=scanItems.filter(it=>it.match).map(it=>{
    const n=itemNut(it); tot.kcal+=n.kcal; tot.p+=n.p; tot.c+=n.c; tot.f+=n.f; tot.fib+=n.fib;
    return {name:it.name,grams:it.grams,fdcId:it.match.fdcId,per100:it.match.per100};
  });
  const d=day(todayKey());
  d.meals.push({id:uid(),type:$('#mealSeg .on').dataset.meal,name:scanDish||items.map(i=>i.name).slice(0,2).join(' + ')||t('dish'),
    items,totals:{kcal:Math.round(tot.kcal),p:round1(tot.p),c:round1(tot.c),f:round1(tot.f),fib:round1(tot.fib)},photo:scanThumb});
  save(); toast(t('addedToast')+' ✓'); resetScan(); go('home');
});

/* ---------- manual & match search ---------- */
function searchLocal(q){
  q=(q||'').trim().toLowerCase(); if(!q) return [];
  return FOOD_DB.filter(f=>f.en.toLowerCase().includes(q)||f.ar.includes(q)||f.fr.toLowerCase().includes(q)).slice(0,8);
}
async function runSearch(q,wrap,onPick){
  wrap.innerHTML=`<div class="empty">${t('analyzing')}</div>`;
  let local=searchLocal(q), remote=[];
  try{
    const r=await apiPost('/api/nutrition',{query:q},15000);
    if(r.ok) remote=r.results||[];
  }catch(e){ apiAvailable=false; }
  if(!local.length&&!remote.length){ wrap.innerHTML=`<div class="empty">${t('noResults')}</div>`; return; }
  wrap.innerHTML='';
  local.forEach(f=>{
    wrap.insertAdjacentHTML('beforeend',`
      <button class="sr-item"><div class="sr-body"><div class="sr-name">${esc(langName(f))}</div>
      <div class="sr-sub">${t('fiber')}: ${f.fib}${t('g')} · ${t('protein')}: ${f.p}${t('g')}</div></div>
      <span class="sr-k">${f.kcal} ${t('kcal')}</span></button>`);
    wrap.lastElementChild.addEventListener('click',()=>onPick({fdcId:f.id,description:f.en,localName:langName(f),per100:{kcal:f.kcal,p:f.p,c:f.c,f:f.f,fib:f.fib}}));
  });
  remote.forEach(f=>{
    if(local.some(l=>l.id===f.fdcId)) return;
    wrap.insertAdjacentHTML('beforeend',`
      <button class="sr-item"><div class="sr-body"><div class="sr-name">${esc(f.description)}</div>
      <div class="sr-sub">USDA #${f.fdcId}</div></div>
      <span class="sr-k">${Math.round(f.per100.kcal)} ${t('kcal')}</span></button>`);
    wrap.lastElementChild.addEventListener('click',()=>onPick(f));
  });
}
function langName(f){ return S.profile.lang==='ar'?f.ar:S.profile.lang==='fr'?f.fr:f.en; }
$('#btnSearch').addEventListener('click',()=>runSearch($('#searchInput').value,$('#searchResults'),pickManual));
$('#searchInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault(); $('#btnSearch').click();} });

function pickManual(f){
  const grams=100; // editable in the results step
  scanItems=[{name:f.localName||f.description,nameEn:f.description,grams,conf:'high',match:{fdcId:f.fdcId,description:f.description,per100:f.per100}}];
  scanDish=''; scanThumb='';
  $('#scanManual').classList.add('hidden');
  renderScanResults();
}

/* match modal */
let matchIdx=null;
function openMatch(i){ matchIdx=i; $('#matchInput').value=scanItems[i].nameEn||scanItems[i].name; $('#matchModal').classList.remove('hidden'); $('#btnMatchSearch').click(); }
$('#closeMatch').addEventListener('click',()=>$('#matchModal').classList.add('hidden'));
$('#btnMatchSearch').addEventListener('click',()=>runSearch($('#matchInput').value,$('#matchResults'),f=>{
  scanItems[matchIdx].match={fdcId:f.fdcId,description:f.description,per100:f.per100};
  $('#matchModal').classList.add('hidden'); renderScanResults();
}));
$('#matchModal').addEventListener('click',e=>{ if(e.target.id==='matchModal') $('#matchModal').classList.add('hidden'); });

/* ---------- renderAll (used on language/theme switch) ---------- */
function renderAll(){
  if(!S.profile.onboarded) return;
  const key=todayKey();
  const hr=new Date().getHours();
  const sep2=S.profile.lang==='ar'?'، ':', ';
  $('#tbHello').textContent=(hr<18?t('gMorning'):t('gEvening'))+(S.profile.name?sep2+S.profile.name:'');
  $('#tbDate').textContent=fmtDateLabel(key);
  renderHome(); renderDiary(); renderProgress(); renderChat();
}

/* ---------- progress ---------- */
function renderProgress(){
  const cv=$('#chartWeek'); if(!cv) return;
  const loc=S.profile.lang==='ar'?'ar-MA':S.profile.lang==='fr'?'fr-FR':'en-US';
  let days=[],vals=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=todayKey(d);
    days.push(d.toLocaleDateString(loc,{weekday:'short'}));
    vals.push(Math.round(dayTotals(k).kcal));
  }
  if(document.documentElement.dir==='rtl'){ days.reverse(); vals.reverse(); } // newest on the left for RTL
  const avg=Math.round(vals.reduce((a,b)=>a+b,0)/7);
  $('#avgKcal').textContent=t('avgKcal')+': '+avg+' '+t('kcalDay')+' · '+t('target')+': '+(S.profile.targetKcal||2000);
  barChart(cv,days,vals,S.profile.targetKcal||2000);
  const wcv=$('#chartWeight');
  const ws=S.weights.slice(-14);
  if(ws.length<2){ const {ctx,w,h}=setupCanvas(wcv,140); ctx.fillStyle=css('--muted'); ctx.font='13px system-ui'; ctx.textAlign='center'; ctx.fillText(t('noData'),w/2,h/2); }
  else lineChart(wcv,ws.map(w=>w.d.slice(5)),ws.map(w=>w.kg));
}
function setupCanvas(cv,hCss){
  const dpr=window.devicePixelRatio||1;
  const w=cv.clientWidth||300;
  cv.style.height=hCss+'px';
  cv.width=w*dpr; cv.height=hCss*dpr;
  const ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
  return {ctx,w,h:hCss};
}
function css(v){ return getComputedStyle(document.body).getPropertyValue(v).trim(); }
function barChart(cv,labels,vals,target){
  const {ctx,w,h}=setupCanvas(cv,180);
  if(vals.every(v=>v===0)){ ctx.fillStyle=css('--muted'); ctx.font='13px system-ui'; ctx.textAlign='center'; ctx.fillText(t('noData'),w/2,h/2); return; }
  const max=Math.max(target*1.2,...vals,10);
  const bw=Math.min(28,(w/vals.length)*0.55);
  const rtl=document.documentElement.dir==='rtl';
  ctx.font='11px system-ui'; ctx.textAlign='center';
  // target line
  const ty=h-14-(target/max)*(h-30);
  ctx.strokeStyle=css('--purple'); ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(4,ty); ctx.lineTo(w-4,ty); ctx.stroke(); ctx.setLineDash([]);
  vals.forEach((v,i)=>{
    const x=w/(vals.length)*(i+0.5);
    const bh=Math.max(3,(v/max)*(h-30));
    const y=h-14-bh;
    const g=ctx.createLinearGradient(0,y,0,h-14);
    g.addColorStop(0,'#5eeaa0'); g.addColorStop(1,'#245c48');
    ctx.fillStyle=v===0?css('--line'):g;
    ctx.beginPath(); ctx.roundRect(x-bw/2,y,bw,bh,5); ctx.fill();
    ctx.fillStyle=css('--muted'); ctx.fillText(labels[i],x,h-2);
    if(v>0){ ctx.fillStyle=css('--txt'); ctx.fillText(v,x,y-4); }
  });
}
function lineChart(cv,labels,vals){
  const {ctx,w,h}=setupCanvas(cv,140);
  const min=Math.min(...vals)-1, max=Math.max(...vals)+1;
  const px=i=>20+(w-40)*(i/(vals.length-1));
  const py=v=>h-24-((v-min)/(max-min||1))*(h-44);
  ctx.strokeStyle=css('--line'); ctx.beginPath(); ctx.moveTo(20,10); ctx.lineTo(20,h-24); ctx.lineTo(w-10,h-24); ctx.stroke();
  ctx.strokeStyle='#5eeaa0'; ctx.lineWidth=2.5; ctx.beginPath();
  vals.forEach((v,i)=>i?ctx.lineTo(px(i),py(v)):ctx.moveTo(px(i),py(v))); ctx.stroke();
  ctx.fillStyle='#5eeaa0';
  vals.forEach((v,i)=>{ ctx.beginPath(); ctx.arc(px(i),py(v),3.5,0,7); ctx.fill(); });
  ctx.fillStyle=css('--muted'); ctx.font='10px system-ui'; ctx.textAlign='center';
  vals.forEach((v,i)=>{ if(i%Math.ceil(vals.length/6)===0) ctx.fillText(labels[i],px(i),h-8); });
  ctx.fillStyle=css('--txt');
  ctx.fillText(vals[vals.length-1]+' '+t('kg'),px(vals.length-1),py(vals[vals.length-1])-8);
}
$('#btnAddWeight').addEventListener('click',()=>{
  const v=prompt(t('weightLog')+' ('+t('kg')+')',S.profile.weight||'');
  if(v===null) return;
  const kg=+String(v).replace(',','.');
  if(!kg||kg<30||kg>300) return;
  logWeight(kg); renderProgress(); toast(t('savedToast')+' ✓');
});

/* ---------- assistant ---------- */
function renderChat(){
  const box=$('#chatBox');
  if(!S.chat.length) S.chat.push({role:'bot',text:t('aiHello')});
  box.innerHTML=S.chat.slice(-30).map(m=>`<div class="msg ${m.role==='user'?'user':'bot'}">${esc(m.text)}</div>`).join('');
  $('#aiSugs').innerHTML=['aiSug1','aiSug2','aiSug3'].map(k=>`<button class="chip" data-sug="${k}">${t(k)}</button>`).join('');
  $$('#aiSugs .chip').forEach(b=>b.addEventListener('click',()=>{ $('#chatInput').value=t(b.dataset.sug); sendChat(); }));
  $('#views').scrollTop=$('#views').scrollHeight;
}
async function sendChat(){
  const txt=$('#chatInput').value.trim(); if(!txt) return;
  if(!S.aiConsent){ ensureAiConsent(()=>sendChat()); return; }
  $('#chatInput').value='';
  S.chat.push({role:'user',text:txt}); save(); renderChat();
  $('#chatBox').insertAdjacentHTML('beforeend',`<div class="msg bot typing" id="typing">${t('thinking')}</div>`);
  $('#views').scrollTop=$('#views').scrollHeight;
  try{
    // Send only what's needed: the chat messages and language. No profile or diary data.
    const r=await apiPost('/api/chat',{messages:S.chat.slice(-10).map(m=>({role:m.role,text:m.text})),lang:S.profile.lang},45000);
    if(!r.ok) throw new Error('bad');
    S.chat.push({role:'bot',text:r.reply});
  }catch(e){
    S.chat.push({role:'bot',text:t('aiOff')});
  }
  save(); renderChat();
}
$('#btnSend').addEventListener('click',sendChat);
$('#chatInput').addEventListener('keydown',e=>{ if(e.key==='Enter') sendChat(); });

/* ---------- settings ---------- */
$('#btnSettings').addEventListener('click',()=>{ refreshAiState(); $('#settingsSheet').classList.remove('hidden'); });
$('#closeSettings').addEventListener('click',()=>$('#settingsSheet').classList.add('hidden'));
$('#settingsSheet').addEventListener('click',e=>{ if(e.target.id==='settingsSheet') $('#settingsSheet').classList.add('hidden'); });
$('#btnExport').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nutrivision-data.json'; a.click();
});
$('#btnClear').addEventListener('click',()=>{
  if(!confirm(t('clearConfirm'))) return;
  localStorage.removeItem(LS_KEY); location.reload();
});

/* boot */
init();
