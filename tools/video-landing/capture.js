// Captura a landing ao vivo: página base sem as peças + cada peça isolada (fundo transparente) + posições.
const { chromium } = require('playwright'); const fs=require('fs');
const URL=process.env.FT_URL||'https://factory-track-eight.vercel.app/';
const LAYERS=[
 ['.hero-cta','button',30],['.round-link','chip',70],
 ['.challenge-line','card',55],
 ['.proposal-image-wrap','photo',110],['.proposal-note','chip',200],['.image-caption','chip',200],
 ['.workflow-step','card',60],['.module-row','card',45],['.segment-card','card',65],['.benefit','card',55],
 ['.role-list','testimonial',112],['.closing-cta','button',30],
 ['.display-title','title',80],['#contact-title','title',80],['.closing-copy','card',50],
 ['.faq-list details','card',45],['.team-names p','card',45],['.project-details','card',55],
];
(async()=>{
 fs.mkdirSync('cap/layers',{recursive:true}); fs.mkdirSync('cap/tiles',{recursive:true});
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
 await p.goto(URL,{waitUntil:'networkidle'});
 await p.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=500){scrollTo(0,y);await new Promise(r=>setTimeout(r,120));} scrollTo(0,0);});
 await p.addStyleTag({content:`*,*::before,*::after{transition:none!important;animation:none!important}
  .reveal{opacity:1!important;transform:none!important} [data-parallax]{transform:none!important}
  [data-hidden]{visibility:hidden!important}`});
 await p.evaluate(async()=>{document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager');await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await document.fonts.ready;});
 await p.waitForTimeout(1500);
 const layers=await p.evaluate((L)=>{const out=[];let k=0;L.forEach(([s,kind,z])=>document.querySelectorAll(s).forEach(e=>{e.dataset.layer=k;const r=e.getBoundingClientRect();out.push({id:k,sel:s,kind,z,x:r.x,y:r.y+scrollY,w:r.width,h:r.height});k++;}));return out;},LAYERS);
 await p.evaluate(()=>document.querySelectorAll('[data-layer]').forEach(e=>e.setAttribute('data-hidden','')));
 const H=await p.evaluate(()=>document.documentElement.scrollHeight);
 const TH=1024; let n=0;
 for(let y=0;y<H;y+=TH){ await p.screenshot({path:`cap/tiles/${n}.png`,fullPage:true,clip:{x:0,y,width:1440,height:Math.min(TH,H-y)}}); n++; }
 await p.addStyleTag({content:`html.iso, html.iso body{background:transparent!important} html.iso *{visibility:hidden!important} html.iso [data-solo], html.iso [data-solo] *{visibility:visible!important}`});
 await p.evaluate(()=>document.documentElement.classList.add('iso'));
 const PAD=28;
 for(const L of layers){
   await p.evaluate(id=>{document.querySelectorAll('[data-solo]').forEach(e=>e.removeAttribute('data-solo'));const e=document.querySelector(`[data-layer="${id}"]`);e.removeAttribute('data-hidden');e.setAttribute('data-solo','');},L.id);
   const clip={x:Math.max(0,L.x-PAD),y:Math.max(0,L.y-PAD)}; clip.width=Math.min(1440,L.x+L.w+PAD)-clip.x; clip.height=Math.min(H,L.y+L.h+PAD)-clip.y;
   L.clip=clip; L.file=`layers/${L.id}.png`;
   await p.screenshot({path:'cap/'+L.file,fullPage:true,clip,omitBackground:true});
   await p.evaluate(id=>document.querySelector(`[data-layer="${id}"]`).setAttribute('data-hidden',''),L.id);
 }
 fs.writeFileSync('cap/layers.json',JSON.stringify({W:1440,H,tiles:n,tileH:TH,layers},null,1));
 console.log('captura ok: altura',H,'pecas',layers.length,'blocos',n);
 
 await b.close();})();
