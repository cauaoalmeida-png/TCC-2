// Renderiza o filme quadro a quadro na GPU e gera o MP4 (H.264).
// Uso: node render.js [stills|preview|final]
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path'); const http=require('http'); const {spawnSync}=require('child_process');
const mode=process.argv[2]||'final'; const VERT=process.argv.includes('vertical'); const VW=VERT?1080:1440, VH=VERT?1920:1152, SUF=VERT?'-vertical':'';
const MIME={'.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.js':'text/javascript'};
const srv=http.createServer((q,r)=>{const f=path.join(__dirname,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});r.end(d);});}).listen(8799);
(async()=>{
 const b=await chromium.launch({args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--enable-unsafe-webgpu']});
 const p=await b.newPage({viewport:{width:VW,height:VH},deviceScaleFactor:1});
 p.on('pageerror',e=>console.log('erro na pagina:',e.message));
 await p.goto('http://localhost:8799/film.html'+(VERT?'?v=1':'')); await p.waitForFunction(()=>window.READY||window.ERR,null,{timeout:180000});
 const err=await p.evaluate(()=>window.ERR); if(err){console.log(err);process.exit(1);}
 console.log('GPU:',await p.evaluate(()=>{const g=document.getElementById('c').getContext('webgl2');const e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'?';}));
 const out=path.join(__dirname,'saida'+SUF); fs.mkdirSync(out,{recursive:true});
 if(mode==='stills'){
   const STL=(process.env.FT_STILLS||'0,1.6,2.5,5,6.5,9.3,11').split(',').map(Number); for(const tf of STL){const t=await p.evaluate(x=>{let lo=0,hi=FILM.duration;for(let k=0;k<50;k++){const m=(lo+hi)/2;if(FILM.filmTime(m)<x)lo=m;else hi=m;}return hi;},tf); await p.evaluate(t=>FILM.seek(t,16),t);await p.screenshot({path:path.join(out,`quadro-${t.toFixed(1)}s.png`),timeout:0});console.log('quadro',t);}
 } else {
   const fps=mode==='preview'?30:60, sub=mode==='preview'?1:16, DUR=await p.evaluate(()=>FILM.duration), N=Math.round(DUR*fps);
   const fdir=path.join(out,'frames-'+mode); fs.rmSync(fdir,{recursive:true,force:true}); fs.mkdirSync(fdir,{recursive:true});
   const t0=Date.now();
   for(let i=0;i<N;i++){ await p.evaluate(([t,s])=>FILM.seek(t,s),[i/fps,sub]); await p.screenshot({path:path.join(fdir,String(i).padStart(4,'0')+'.png'),timeout:0});
     if(i%30===0) console.log(`quadro ${i}/${N}  (${((Date.now()-t0)/1000).toFixed(0)}s)`); }
   const ff=require('ffmpeg-static'); const mp4=path.join(out,mode==='final'?'FactoryTrack-flyover-3D'+SUF+'.mp4':'FactoryTrack-flyover-previa-30fps.mp4');
   const args=['-y','-framerate',String(fps),'-i',path.join(fdir,'%04d.png')];
   const track=process.env.FT_TRACK; if(track&&fs.existsSync(track)) args.push('-i',track,'-c:a','aac','-b:a','192k','-shortest');
   args.push('-c:v','libx264','-preset','slow','-crf','14','-pix_fmt','yuv420p','-movflags','+faststart',mp4);
   const r=spawnSync(ff,args,{stdio:'inherit'}); console.log(r.status===0?'MP4 pronto: '+mp4:'ffmpeg falhou');
 }
 await b.close(); srv.close();
})();
