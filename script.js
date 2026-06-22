


/* ===== POP-UP DE DOAÇÃO ===== */
document.addEventListener('DOMContentLoaded',function(){
(function(){
    var pop=document.getElementById('DON_POP');
    var closeBtn=document.getElementById('DON_CLOSE');
    var laterBtn=document.getElementById('DON_LATER');
    if(!pop||!closeBtn||!laterBtn)return;
    closeBtn.addEventListener('click',fechar);
    laterBtn.addEventListener('click',fechar);
    function fechar(){
        pop.classList.add('closing');
        setTimeout(function(){pop.classList.add('hidden');pop.classList.remove('closing');},300);
    }
})();

/* ===== APP PRINCIPAL ===== */
(async()=>{
'use strict';

let wcMuxer=null,mrMP4Mime='';
if(typeof VideoEncoder!=='undefined'){
    try{wcMuxer=await import('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.mjs')}catch(e){}
}
if(typeof MediaRecorder!=='undefined'){
    for(var m of['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4;codecs="avc1.42E01E"','video/mp4;codecs=avc1.42E01E','video/mp4']){
        if(MediaRecorder.isTypeSupported(m)){mrMP4Mime=m;break}
    }
}
var hasMP4=!!(wcMuxer||mrMP4Mime);
var HDOT=document.getElementById('HDOT'),HTXT=document.getElementById('HTXT');
if(hasMP4){HDOT.classList.add('ok');HTXT.textContent='Saída MP4 disponível'}
else{HDOT.classList.add('no');HTXT.textContent='Saída WebM (use Chrome para MP4)'}

var S={file:null,sel:null,selecting:false,selStart:null,processing:false,resultBlob:null,resultUrl:null,cfg:{feath:4,quality:'medium'}};
var $=function(s){return document.querySelector(s)};
var DZ=$('#DZ'),FI=$('#FI'),VID=$('#VID'),OC=$('#OC'),ox=OC.getContext('2d');
var VI=$('#VI'),SB=$('#SB'),PC=$('#PC'),px=PC.getContext('2d');
var POV=$('#POV'),PFL=$('#PFL'),PTM=$('#PTM'),PPC=$('#PPC'),PST=$('#PST');
var BT_PROC=$('#BT_PROC'),BT_CLR=$('#BT_CLR'),BT_NEW=$('#BT_NEW');
var BT_DL=$('#BT_DL'),BT_RE=$('#BT_RE'),RES_VID=$('#RES_VID');
var CB_PP=$('#CB_PP'),CB_SK=$('#CB_SK'),CB_TM=$('#CB_TM');
var tmpC=document.createElement('canvas'),tmpX=tmpC.getContext('2d');

function fmt(s){var m=Math.floor(s/60),sec=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')}
function fmtSz(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function toast(msg,tipo){
    var c=$('#TC'),el=document.createElement('div');el.className='toast '+tipo;
    var ic={ok:'fa-check-circle',err:'fa-exclamation-circle',inf:'fa-info-circle'};
    el.innerHTML='<i class="fas '+ic[tipo]+'"></i><span>'+msg+'</span>';c.appendChild(el);
    setTimeout(function(){el.style.opacity='0';el.style.transform='translateX(30px)';el.style.transition='.3s';setTimeout(function(){el.remove()},300)},4500);
}
function setStep(n){for(var i=1;i<=4;i++){var e=$('#S'+i);e.classList.remove('on','ok');if(i<n)e.classList.add('ok');else if(i===n)e.classList.add('on')}}
function updBtns(){var ok=!!(S.sel&&S.sel.w>4&&S.sel.h>4&&!S.processing);BT_PROC.disabled=!ok;BT_CLR.disabled=!ok}

function cPos(e){var r=OC.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top}}
function d2v(dx,dy){return{x:Math.round(dx*VID.videoWidth/OC.width),y:Math.round(dy*VID.videoHeight/OC.height)}}
function v2d(vx,vy,vw,vh){return{x:vx*OC.width/VID.videoWidth,y:vy*OC.height/VID.videoHeight,w:vw*OC.width/VID.videoWidth,h:vh*OC.height/VID.videoHeight}}

DZ.addEventListener('click',function(){FI.click()});
DZ.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')FI.click()});
DZ.addEventListener('dragover',function(e){e.preventDefault();DZ.classList.add('over')});
DZ.addEventListener('dragleave',function(){DZ.classList.remove('over')});
DZ.addEventListener('drop',function(e){e.preventDefault();DZ.classList.remove('over');var f=e.dataTransfer.files;if(f.length&&f[0].type.startsWith('video/'))loadVid(f[0]);else toast('Selecione um arquivo de vídeo válido.','err')});
FI.addEventListener('change',function(){if(FI.files.length)loadVid(FI.files[0])});

function loadVid(file){
    S.file=file;S.sel=null;
    if(S.resultUrl)URL.revokeObjectURL(S.resultUrl);S.resultBlob=null;S.resultUrl=null;
    VID.src=URL.createObjectURL(file);VID.load();
    VID.onloadedmetadata=function(){
        $('#IN').textContent=file.name.length>20?file.name.slice(0,18)+'…':file.name;$('#IN').title=file.name;
        $('#IS').textContent=fmtSz(file.size);$('#IR').textContent=VID.videoWidth+'×'+VID.videoHeight;
        $('#ID').textContent=fmt(VID.duration);CB_SK.max=Math.max(1,Math.floor(VID.duration*30));
        clearOC();SB.style.display='none';$('#SEC_UP').classList.add('hidden');$('#SEC_ED').classList.remove('hidden');
        $('#SEC_RES').classList.add('hidden');setStep(2);updBtns();VID.currentTime=0;VID.play().catch(function(){});
        toast('Vídeo carregado!','ok');
    };
    VID.onerror=function(){toast('Erro ao carregar o vídeo.','err')};
}

new ResizeObserver(function(entries){for(var i=0;i<entries.length;i++){var e=entries[i],w=Math.round(e.contentRect.width),h=Math.round(e.contentRect.height);if(w>0&&h>0&&(OC.width!==w||OC.height!==h)){OC.width=w;OC.height=h;if(S.sel&&!S.selecting)drawSel()}}}).observe(VID);

CB_PP.addEventListener('click',function(){if(S.processing)return;if(VID.paused){VID.play();CB_PP.innerHTML='<i class="fas fa-pause"></i>'}else{VID.pause();CB_PP.innerHTML='<i class="fas fa-play"></i>'}});
CB_SK.addEventListener('input',function(){if(!S.processing)VID.currentTime=CB_SK.value/30});
VID.addEventListener('timeupdate',function(){if(S.processing)return;CB_SK.value=Math.floor(VID.currentTime*30);CB_TM.textContent=fmt(VID.currentTime)+' / '+fmt(VID.duration)});
VID.addEventListener('play',function(){CB_PP.innerHTML='<i class="fas fa-pause"></i>'});
VID.addEventListener('pause',function(){CB_PP.innerHTML='<i class="fas fa-play"></i>'});

function clearOC(){ox.clearRect(0,0,OC.width,OC.height)}
OC.addEventListener('mousedown',selStart);OC.addEventListener('mousemove',selMove);OC.addEventListener('mouseup',selEnd);OC.addEventListener('mouseleave',selEnd);
OC.addEventListener('touchstart',function(e){e.preventDefault();selStart(e)},{passive:false});OC.addEventListener('touchmove',function(e){e.preventDefault();selMove(e)},{passive:false});OC.addEventListener('touchend',selEnd);

function selStart(e){if(S.processing)return;S.selecting=true;S.selStart=cPos(e);S.sel=null;SB.style.display='none';clearOC()}
function selMove(e){
    if(!S.selecting)return;var p=cPos(e),st=S.selStart;
    var dx=Math.min(st.x,p.x),dy=Math.min(st.y,p.y),dw=Math.abs(p.x-st.x),dh=Math.abs(p.y-st.y);
    var vs=d2v(dx,dy),ve=d2v(dx+dw,dy+dh),vw=Math.max(4,ve.x-vs.x),vh=Math.max(4,ve.y-vs.y);
    S.sel={x:Math.max(0,vs.x),y:Math.max(0,vs.y),w:Math.min(vw,VID.videoWidth-vs.x),h:Math.min(vh,VID.videoHeight-vs.y)};
    drawSel();SB.style.display='block';SB.textContent=S.sel.w+' × '+S.sel.h;
}
function selEnd(){if(!S.selecting)return;S.selecting=false;if(!S.sel||S.sel.w<5||S.sel.h<5){S.sel=null;clearOC();SB.style.display='none'}else toast('Região selecionada.','inf');updBtns()}

var selAnim=0;
function drawSel(){
    cancelAnimationFrame(selAnim);clearOC();if(!S.sel)return;
    var d=v2d(S.sel.x,S.sel.y,S.sel.w,S.sel.h);
    ox.fillStyle='rgba(0,0,0,.5)';ox.fillRect(0,0,OC.width,OC.height);ox.clearRect(d.x,d.y,d.w,d.h);
    ox.save();ox.strokeStyle='#00d4aa';ox.lineWidth=2;ox.setLineDash([6,4]);ox.lineDashOffset=-performance.now()/50;
    ox.strokeRect(d.x,d.y,d.w,d.h);ox.restore();
    var hs=5;ox.fillStyle='#00d4aa';
    [[d.x,d.y],[d.x+d.w,d.y],[d.x,d.y+d.h],[d.x+d.w,d.y+d.h]].forEach(function(c){ox.fillRect(c[0]-hs,c[1]-hs,hs*2,hs*2)});
    if(!S.processing)selAnim=requestAnimationFrame(drawSel);
}

 $('#CFG_F').addEventListener('input',function(e){S.cfg.feath=+e.target.value;$('#VL_F').textContent=e.target.value+'px'});
 $('#CFG_Q').addEventListener('change',function(e){S.cfg.quality=e.target.value});

function inpaint(ctx,mask,feath){
    var x=mask.x,y=mask.y,w=mask.w,h=mask.h,cw=ctx.canvas.width,ch=ctx.canvas.height;
    var sx=Math.max(0,Math.round(x)),sy=Math.max(0,Math.round(y)),sw=Math.min(Math.round(w),cw-sx),sh=Math.min(Math.round(h),ch-sy);
    if(sw<2||sh<2)return;
    var src=ctx.getImageData(0,0,cw,ch).data,bs=Math.max(2,Math.min(Math.floor(feath)+3,Math.floor(Math.min(sw,sh)/4)));
    var tA=new Float32Array(sw*3),bA=new Float32Array(sw*3);
    for(var px=0;px<sw;px++){var tr=0,tg=0,tb=0,br=0,bg=0,bb=0;for(var s=1;s<=bs;s++){var ty=Math.max(0,sy-s),ti=(ty*cw+(sx+px))*4;tr+=src[ti];tg+=src[ti+1];tb+=src[ti+2];var by=Math.min(ch-1,sy+sh-1+s),bi=(by*cw+(sx+px))*4;br+=src[bi];bg+=src[bi+1];bb+=src[bi+2]}tA[px*3]=tr/bs;tA[px*3+1]=tg/bs;tA[px*3+2]=tb/bs;bA[px*3]=br/bs;bA[px*3+1]=bg/bs;bA[px*3+2]=bb/bs}
    var lA=new Float32Array(sh*3),rA=new Float32Array(sh*3);
    for(var py=0;py<sh;py++){var lr=0,lg=0,lb=0,rr=0,rg=0,rb=0;for(var s2=1;s2<=bs;s2++){var lx=Math.max(0,sx-s2),li=((sy+py)*cw+lx)*4;lr+=src[li];lg+=src[li+1];lb+=src[li+2];var rx=Math.min(cw-1,sx+sw-1+s2),ri=((sy+py)*cw+rx)*4;rr+=src[ri];rg+=src[ri+1];rb+=src[ri+2]}lA[py*3]=lr/bs;lA[py*3+1]=lg/bs;lA[py*3+2]=lb/bs;rA[py*3]=rr/bs;rA[py*3+1]=rg/bs;rA[py*3+2]=rb/bs}
    var imgD=ctx.getImageData(sx,sy,sw,sh),d=imgD.data,hMax=Math.max(1,sh-1),wMax=Math.max(1,sw-1);
    for(var py2=0;py2<sh;py2++){var ny=py2/hMax;for(var px2=0;px2<sw;px2++){var nx=px2/wMax,idx=(py2*sw+px2)*4;d[idx]=(tA[px2*3]+(bA[px2*3]-tA[px2*3])*ny+lA[py2*3]+(rA[py2*3]-lA[py2*3])*nx)*.5;d[idx+1]=(tA[px2*3+1]+(bA[px2*3+1]-tA[px2*3+1])*ny+lA[py2*3+1]+(rA[py2*3+1]-lA[py2*3+1])*nx)*.5;d[idx+2]=(tA[px2*3+2]+(bA[px2*3+2]-tA[px2*3+2])*ny+lA[py2*3+2]+(rA[py2*3+2]-lA[py2*3+2])*nx)*.5}}
    ctx.putImageData(imgD,sx,sy);
    if(feath>0){var fr=Math.max(1,Math.round(feath*.6));tmpC.width=cw;tmpC.height=ch;tmpX.filter='blur('+fr+'px)';tmpX.drawImage(ctx.canvas,0,0);tmpX.filter='none';ctx.drawImage(tmpC,sx,sy,sw,sh,sx,sy,sw,sh)}
}

BT_PROC.addEventListener('click',startProc);
async function startProc(){
    if(!S.sel||S.processing)return;S.processing=true;setStep(3);updBtns();clearOC();
    PC.width=VID.videoWidth;PC.height=VID.videoHeight;POV.classList.remove('hidden');
    PFL.style.width='0%';PPC.textContent='0%';PTM.textContent='00:00 / '+fmt(VID.duration);
    PST.innerHTML='<i class="fas fa-cog fa-spin"></i> Processando vídeo...';
    try{if(mrMP4Mime)await procMR_MP4();else if(wcMuxer)await procWC_MP4();else await procWebM()}
    catch(e){console.error('Falha:',e);if(S.processing){POV.classList.add('hidden');S.processing=false;updBtns();toast('Erro: '+e.message,'err')}}
}

function procMR_MP4(){return new Promise(function(resolve,reject){
    var w=PC.width,h=PC.height,dur=VID.duration,brMap={high:5e6,medium:2.5e6,low:1e6},bitrate=brMap[S.cfg.quality]||2.5e6,done=false;
    var stream=PC.captureStream(30),hasAudio=false;
    try{if(typeof VID.captureStream==='function'){var vs=VID.captureStream();vs.getAudioTracks().forEach(function(t){stream.addTrack(t);hasAudio=true})}}catch(e){}
    var rec=new MediaRecorder(stream,{mimeType:mrMP4Mime,videoBitsPerSecond:bitrate}),chunks=[];
    rec.ondataavailable=function(e){if(e.data.size>0)chunks.push(e.data)};
    rec.onstop=function(){if(done)return;done=true;clearTimeout(safety);VID.pause();S.resultBlob=new Blob(chunks,{type:'video/mp4'});if(S.resultUrl)URL.revokeObjectURL(S.resultUrl);S.resultUrl=URL.createObjectURL(S.resultBlob);S.processing=false;showResult(hasAudio?'Vídeo processado em MP4 com áudio preservado.':'Vídeo processado em MP4. O áudio não pôde ser capturado neste navegador.');resolve()};
    rec.onerror=function(e){if(done)return;done=true;clearTimeout(safety);VID.pause();S.processing=false;POV.classList.add('hidden');reject(new Error('MediaRecorder erro'))};
    rec.start(100);
    var safety=setTimeout(function(){if(done)return;toast('Tempo limite atingido, finalizando...','inf');try{rec.stop()}catch(e){}},(dur+30)*1000);
    VID.currentTime=0;
    var waitSeek=new Promise(function(r){if(VID.currentTime<.05){r();return}var h=function(){VID.removeEventListener('seeked',h);r()};VID.addEventListener('seeked',h);setTimeout(r,3000)});
    waitSeek.then(function(){VID.play().catch(function(){});var lastT=0,stuck=0;
    function loop(){if(done)return;var vt=VID.currentTime;if(Math.abs(vt-lastT)<.0003){stuck++;if(stuck>60){VID.play().catch(function(){});stuck=0}}else stuck=0;lastT=vt;px.drawImage(VID,0,0,w,h);inpaint(px,S.sel,S.cfg.feath);var pct=Math.min(100,Math.round(vt/dur*100));PFL.style.width=pct+'%';PPC.textContent=pct+'%';PTM.textContent=fmt(vt)+' / '+fmt(dur);if(VID.ended||vt>=dur-.05){PST.innerHTML='<i class="fas fa-check-circle"></i> Finalizando arquivo...';setTimeout(function(){if(!done)try{rec.stop()}catch(e){}},400);return}requestAnimationFrame(loop)}requestAnimationFrame(loop)})
})}

async function procWC_MP4(){
    var w=PC.width,h=PC.height,dur=VID.duration,brMap={high:5e6,medium:2.5e6,low:1e6},bitrate=brMap[S.cfg.quality]||2.5e6,done=false;
    var codecs=['avc1.640028','avc1.64001F','avc1.42001F','avc1.42001E'],codec='';
    for(var c of codecs){try{var r=await VideoEncoder.isConfigSupported({codec:c,width:w,height:h,bitrate});if(r.supported){codec=c;break}}catch(e){}}
    if(!codec)throw new Error('Nenhum codec H264 suportado.');
    var MuxerClass=wcMuxer.Muxer||wcMuxer.MP4Muxer,TargetClass=wcMuxer.ArrayBufferTarget;
    if(!MuxerClass||!TargetClass)throw new Error('mp4-muxer: classes não encontradas.');
    var target=new TargetClass(),muxer;try{muxer=new MuxerClass({target:target,video:{codec:'avc',width:w,height:h},fastStart:'in-memory'})}catch(e){throw new Error('Erro ao criar muxer: '+e.message)}
    var encoder=new VideoEncoder({output:function(chunk,meta){try{muxer.addVideoChunk(chunk,meta)}catch(e){}},error:function(e){console.error('Encoder:',e)}});
    encoder.configure({codec:codec,width:w,height:h,bitrate:bitrate,framerate:30,latencyMode:'quality'});
    await new Promise(function(r){if(VID.currentTime<.05){r();return}VID.addEventListener('seeked',r,{once:true});setTimeout(r,3000)});
    VID.play().catch(function(){});await new Promise(function(r){setTimeout(r,150)});
    var lastT=0,stuck=0,frameIdx=0;
    var safety=setTimeout(function(){if(done)return;toast('Tempo limite atingido, finalizando...','inf');finish()},(dur+30)*1000);
    function finish(){if(done)return;done=true;clearTimeout(safety);VID.pause();try{encoder.flush().then(function(){encoder.close();muxer.finalize();buildResult()}).catch(function(){try{encoder.close();muxer.finalize();buildResult()}catch(e){buildResult()}})}catch(e){buildResult()}}
    function buildResult(){S.processing=false;try{S.resultBlob=new Blob([target.buffer],{type:'video/mp4'});if(S.resultUrl)URL.revokeObjectURL(S.resultUrl);S.resultUrl=URL.createObjectURL(S.resultBlob);showResult('Vídeo processado em MP4 via WebCodecs. Sem faixa de áudio.')}catch(e){POV.classList.add('hidden');toast('Erro ao gerar MP4.','err')}}
    await new Promise(function(resolve){function loop(){if(done){resolve();return}var vt=VID.currentTime;if(Math.abs(vt-lastT)<.0003){stuck++;if(stuck>60){VID.play().catch(function(){});stuck=0}}else stuck=0;lastT=vt;px.drawImage(VID,0,0,w,h);inpaint(px,S.sel,S.cfg.feath);if(encoder.encodeQueueSize<10){var ts=Math.max(0,Math.round(vt*1e6)),kf=frameIdx%60===0;try{var frame=new VideoFrame(PC,{timestamp:ts});encoder.encode(frame,{keyFrame:kf});frame.close();frameIdx++}catch(e){}}var pct=Math.min(100,Math.round(vt/dur*100));PFL.style.width=pct+'%';PPC.textContent=pct+'%';PTM.textContent=fmt(vt)+' / '+fmt(dur);if(VID.ended||vt>=dur-.05){try{var f2=new VideoFrame(PC,{timestamp:Math.round(dur*1e6)});encoder.encode(f2,{keyFrame:false});f2.close()}catch(e){}PST.innerHTML='<i class="fas fa-check-circle"></i> Finalizando arquivo...';setTimeout(function(){finish();resolve()},800);return}requestAnimationFrame(loop)}requestAnimationFrame(loop)})
}

function procWebM(){return new Promise(function(resolve,reject){
    var w=PC.width,h=PC.height,dur=VID.duration,brMap={high:5e6,medium:2.5e6,low:1e6},bitrate=brMap[S.cfg.quality]||2.5e6,done=false;
    var mime='';for(var m of['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']){if(MediaRecorder.isTypeSupported(m)){mime=m;break}}
    if(!mime){S.processing=false;POV.classList.add('hidden');reject(new Error('Nenhum codec suportado.'));return}
    var stream=PC.captureStream(30),hasAudio=false;try{if(typeof VID.captureStream==='function'){var vs=VID.captureStream();vs.getAudioTracks().forEach(function(t){stream.addTrack(t);hasAudio=true})}}catch(e){}
    var rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate}),chunks=[];
    rec.ondataavailable=function(e){if(e.data.size>0)chunks.push(e.data)};
    rec.onstop=function(){if(done)return;done=true;clearTimeout(safety);VID.pause();S.resultBlob=new Blob(chunks,{type:mime});if(S.resultUrl)URL.revokeObjectURL(S.resultUrl);S.resultUrl=URL.createObjectURL(S.resultBlob);S.processing=false;showResult(hasAudio?'Vídeo processado em WebM com áudio. Use Chrome para MP4.':'Vídeo processado em WebM. Use Chrome para MP4.');resolve()};
    rec.onerror=function(e){if(done)return;done=true;clearTimeout(safety);VID.pause();S.processing=false;POV.classList.add('hidden');reject(new Error('MediaRecorder erro'))};
    rec.start(100);
    var safety=setTimeout(function(){if(done)return;toast('Tempo limite atingido, finalizando...','inf');try{rec.stop()}catch(e){}},(dur+30)*1000);
    VID.currentTime=0;
    var waitSeek=new Promise(function(r){if(VID.currentTime<.05){r();return}var h=function(){VID.removeEventListener('seeked',h);r()};VID.addEventListener('seeked',h);setTimeout(r,3000)});
    waitSeek.then(function(){VID.play().catch(function(){});var lastT=0,stuck=0;
    function loop(){if(done)return;var vt=VID.currentTime;if(Math.abs(vt-lastT)<.0003){stuck++;if(stuck>60){VID.play().catch(function(){});stuck=0}}else stuck=0;lastT=vt;px.drawImage(VID,0,0,w,h);inpaint(px,S.sel,S.cfg.feath);var pct=Math.min(100,Math.round(vt/dur*100));PFL.style.width=pct+'%';PPC.textContent=pct+'%';PTM.textContent=fmt(vt)+' / '+fmt(dur);if(VID.ended||vt>=dur-.05){PST.innerHTML='<i class="fas fa-check-circle"></i> Finalizando arquivo...';setTimeout(function(){if(!done)try{rec.stop()}catch(e){}},400);return}requestAnimationFrame(loop)}requestAnimationFrame(loop)})
})}

function showResult(note){POV.classList.add('hidden');RES_VID.src=S.resultUrl;$('#RES_SUB').textContent=note;$('#SEC_ED').classList.add('hidden');$('#SEC_RES').classList.remove('hidden');setStep(4);var ext=S.resultBlob&&S.resultBlob.type.includes('mp4')?'MP4':'WebM';toast('Pronto! '+fmtSz(S.resultBlob.size)+' ('+ext+')','ok')}

BT_DL.addEventListener('click',function(){if(!S.resultUrl)return;var ext=S.resultBlob&&S.resultBlob.type.includes('mp4')?'mp4':'webm';var base=S.file?S.file.name.replace(/\.[^.]+$/,''):'video';var a=document.createElement('a');a.href=S.resultUrl;a.download=base+'_sem_marca.'+ext;document.body.appendChild(a);a.click();document.body.removeChild(a);toast('Download iniciado!','ok')});

BT_CLR.addEventListener('click',function(){S.sel=null;clearOC();SB.style.display='none';updBtns();toast('Seleção removida.','inf')});
BT_NEW.addEventListener('click',goBack);BT_RE.addEventListener('click',goBack);
function goBack(){if(S.processing)return;if(S.resultUrl)URL.revokeObjectURL(S.resultUrl);S.file=null;S.sel=null;S.processing=false;S.resultBlob=null;S.resultUrl=null;VID.pause();VID.removeAttribute('src');VID.load();FI.value='';$('#SEC_ED').classList.add('hidden');$('#SEC_RES').classList.add('hidden');$('#SEC_UP').classList.remove('hidden');setStep(1)}

})();

});