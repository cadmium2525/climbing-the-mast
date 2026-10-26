import './style.css';
import { createUI } from './ui';
import { ClimbSimulation, LIMB_IDS, type LimbId, type Vec2 } from './simulation';
import { ClimbRenderer } from './renderer';
import { BIOMES, biomeIndex, formatHeight } from './biomes';
import { MoonRace, MOON_HEIGHT, CHECKPOINTS, formatTime } from './race';
import { drawResultCard, resultBlob, saveCard, shareText, pageUrl, type RaceResult } from './share';

createUI();
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const sim=new ClimbSimulation();
const race=new MoonRace(sim);
let view:ClimbRenderer|undefined;
const dialogs=['help-dialog','pause-dialog','result-dialog'].map(id=>el<HTMLDialogElement>(id));
const paused=()=>document.hidden||dialogs.some(dialog=>dialog.open);
const BEST_KEY='gunyamast-moon-best-v1';
type BestRecord={time:number;splits:number[]};
let best:BestRecord|null=null;
let resultData:RaceResult|null=null;
let showingResult=false;
let lastBiome=-1;
let lastEvent=0;
let lastBoosts=0;
let toastUntil=0;
let statusUntil=0;
let boostUntil=0;
let finishAt=0;
let soundEnabled=false;
let audio:AudioContext|undefined;
let previous=performance.now();
let accumulator=0;
let lastUI=0;
const pointers=new Map<number,{id:LimbId;offset:Vec2;previousY:number}>();
const keyboardTargets=new Map<LimbId,{point:Vec2;previousY:number}>();
try{
  const saved:unknown=JSON.parse(localStorage.getItem(BEST_KEY)||'null');
  if(saved&&typeof saved==='object'&&'time' in saved&&'splits' in saved){
    const candidate=saved as BestRecord;
    if(Number.isFinite(candidate.time)&&candidate.time>0&&Array.isArray(candidate.splits)&&candidate.splits.length===5&&candidate.splits.every(n=>Number.isFinite(n)&&n>=0))best=candidate;
  }
}catch{/* Storage is optional in private mode. */}
el('best-value').textContent=best?formatTime(best.time):'—';
const resetClock=()=>{previous=performance.now();accumulator=0;};
function flushActiveClock(){
  const now=performance.now(),delta=Math.max(0,(now-previous)/1000);
  if(!dialogs.some(dialog=>dialog.open)){race.tick(delta);accumulator+=Math.min(delta,.05);}
  previous=now;
}
const message=(text:string)=>{
  el('status-message').textContent=text;
  statusUntil=text?performance.now()+1800:0;
  el('status-message').classList.toggle('is-visible',!!text);
};
function tone(success:boolean,magic=false){
  if(!soundEnabled)return;
  try{
    audio??=new AudioContext();void audio.resume();
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.type='sine';oscillator.frequency.setValueAtTime(magic?880:success?680:210,audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(magic?1760:success?980:110,audio.currentTime+.14);
    gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);
    oscillator.connect(gain).connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.21);
  }catch{/* Audio is optional. */}
}
function releasePointers(){sim.cancelDrags();pointers.clear();keyboardTargets.clear();}
function showStory(title:string,text:string,now=performance.now()){
  message('');
  el('story-title').textContent=title;el('story-text').textContent=text;toastUntil=now+4500;
  el('story-toast').classList.add('is-visible');
}
function consumeEvent(now:number){
  if(race.boosts>lastBoosts){lastBoosts=race.boosts;boostUntil=now+1100;tone(true,true);}
  const event=race.event;if(!event||event.id===lastEvent)return;
  lastEvent=event.id;
  let text=event.text;
  if(event.kind==='story'&&best&&race.stage>0){
    const split=race.splits[race.stage-1],old=best.splits[race.stage-1];
    if(Number.isFinite(split)&&Number.isFinite(old))text=`ベスト比 ${split<=old?'−':'＋'}${Math.abs(split-old).toFixed(1)}秒`;
  }
  if(event.kind==='rescue'){releasePointers();view?.resetCamera();message('');tone(false);}
  showStory(event.title,text,now);
}
function updateUI(now=performance.now()){
  el('height-value').textContent=formatHeight(Math.min(MOON_HEIGHT,sim.height));
  el('time-value').textContent=formatTime(race.time);
  el('remaining-value').textContent=`${formatHeight(MOON_HEIGHT-sim.height)}m`;
  el<HTMLProgressElement>('moon-progress').value=race.progress*MOON_HEIGHT;
  el('penalty-value').textContent=`救出 ＋${race.penalties}秒`;
  el('penalty-value').hidden=race.penalties===0;
  el('combo-value').textContent=`${race.combo} / 4`;
  el('combo-meter').dataset.combo=String(race.combo);
  const nextCheckpoint=CHECKPOINTS.find(height=>height>race.checkpoint);
  el('checkpoint-value').textContent=race.completed?'おかえり、かぐや姫！':nextCheckpoint?`次の休み竹 ${nextCheckpoint}m`:'あとは、月へ。';
  const index=biomeIndex(sim.height);
  if(index!==lastBiome){
    view?.setBiome(index);lastBiome=index;el('biome-label').textContent=BIOMES[index].name;
    document.querySelector('.world-label-en')!.textContent=BIOMES[index].en;
    el('biome-next').textContent=index<4?`${BIOMES[index+1].from}mで、${BIOMES[index+1].name}へ`:'24mで、月に到着。';
    el('game-viewport').dataset.biome=String(index);
    document.querySelectorAll<HTMLElement>('.route-list li').forEach(item=>item.classList.toggle('is-active',Number(item.dataset.biome)===index));
  }
  for(const id of LIMB_IDS){
    const grip=el(`grip-${id}`),limb=sim.limbs[id];grip.classList.toggle('gripped',limb.gripped);
    grip.setAttribute('aria-label',`${id.startsWith('left')?'左':'右'}${id.endsWith('Hand')?'手':'足'}：${limb.gripped?'つかまり中':'離している'}`);
  }
  if(now>toastUntil)el('story-toast').classList.remove('is-visible');
  if(now>statusUntil)el('status-message').classList.remove('is-visible');
}
function start(){
  if(!view)return;
  dialogs.forEach(dialog=>dialog.close());releasePointers();race.reset();race.start();
  showingResult=false;resultData=null;finishAt=0;lastBiome=-1;lastBoosts=0;boostUntil=0;resetClock();
  document.body.classList.add('is-playing');el('game-viewport').classList.remove('is-cleared');
  view.resetCamera();
  message('手足の丸を上へドラッグ');
  el('story-toast').classList.remove('is-visible');toastUntil=0;
  updateUI();requestAnimationFrame(()=>view?.resize());
}
function showResult(){
  if(showingResult)return;
  flushActiveClock();
  if(!race.completed)race.retire();
  releasePointers();showingResult=true;
  const improved=race.completed&&(!best||race.time<best.time);
  if(improved){best={time:race.time,splits:[...race.splits]};try{localStorage.setItem(BEST_KEY,JSON.stringify(best));}catch{/* Play continues without storage. */}}
  el('best-value').textContent=best?formatTime(best.time):'—';
  resultData={cleared:race.completed,time:race.time,height:Math.min(MOON_HEIGHT,sim.maxHeight),falls:race.falls,boosts:race.boosts,best:best?.time??null};
  drawResultCard(el<HTMLCanvasElement>('result-card'),resultData);
  el('result-title').textContent=race.completed?'おかえり、かぐや。':'今日は、ここまで。';
  el('result-value').textContent=race.completed?formatTime(race.time):`月まで ${formatHeight(MOON_HEIGHT-resultData.height)}m`;
  el('result-label').textContent=race.completed?(improved?'自己ベスト！':'月へ帰還'):'また挑戦しよう';
  el('result-description').textContent=race.completed?'父と母が待っていました。':'次は、月で待つ家族のもとへ。';
  document.querySelector('.result-note')!.textContent=race.completed?'最速タイムを保存しました。':'リタイアは最速記録に入りません。';
  el<HTMLDialogElement>('pause-dialog').close();el<HTMLDialogElement>('result-dialog').showModal();
}
function pause(){
  if(showingResult||sim.status==='ready'||race.completed)return;
  flushActiveClock();
  releasePointers();resetClock();if(!el<HTMLDialogElement>('pause-dialog').open)el<HTMLDialogElement>('pause-dialog').showModal();
}
function finishGrip(id:LimbId,previousY:number){
  flushActiveClock();
  const success=sim.endDrag(id);race.recordGrip(id,previousY,success);tone(success);
  message(success?'':'竹の近くで離そう');
  consumeEvent(performance.now());
}

try{
  view=new ClimbRenderer(el('game-viewport'),sim,()=>{
    pause();const fallback=el('webgl-fallback');fallback.hidden=false;
    fallback.innerHTML='<h2>3D画面が一時停止しました</h2><p>再読み込みして、もう一度お試しください。端末の最速記録は保存されています。</p><button class="primary-button" onclick="location.reload()">再読み込み</button>';
  });
  const scenery=el('game-viewport').querySelector<HTMLElement>('.scenery-art');
  if(scenery)scenery.style.backgroundImage=`url("${import.meta.env.BASE_URL}assets/forest-bg.png")`;
  for(const id of LIMB_IDS){
    const handle=view.handles[id];
    handle.addEventListener('pointerdown',event=>{
      if(paused()||!view||!sim.beginDrag(id))return;
      event.preventDefault();handle.setPointerCapture(event.pointerId);
      const point=view.screenToWorld(event.clientX,event.clientY);
      pointers.set(event.pointerId,{id,previousY:sim.limbs[id].pos.y,offset:{x:sim.limbs[id].pos.x-point.x,y:sim.limbs[id].pos.y-point.y}});
    });
    handle.addEventListener('pointermove',event=>{
      const pointer=pointers.get(event.pointerId);if(!pointer||!view||paused())return;
      event.preventDefault();const point=view.screenToWorld(event.clientX,event.clientY);
      sim.moveDrag(id,{x:point.x+pointer.offset.x,y:point.y+pointer.offset.y});
    });
    const release=(event:PointerEvent)=>{
      const pointer=pointers.get(event.pointerId);if(!pointer)return;
      pointers.delete(event.pointerId);finishGrip(id,pointer.previousY);
      if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);handle.addEventListener('lostpointercapture',release);
    handle.addEventListener('keydown',event=>{
      if(paused()||(sim.status!=='playing'&&sim.status!=='falling'))return;
      if(event.key===' '||event.key==='Enter'){
        event.preventDefault();const target=keyboardTargets.get(id);
        if(target){finishGrip(id,target.previousY);keyboardTargets.delete(id);}
        else if(sim.beginDrag(id)){keyboardTargets.set(id,{point:{...sim.limbs[id].pos},previousY:sim.limbs[id].pos.y});message('矢印で動かし、Enterでつかむ');}
      }else if(event.key.startsWith('Arrow')){
        event.preventDefault();if(!keyboardTargets.has(id)&&sim.beginDrag(id))keyboardTargets.set(id,{point:{...sim.limbs[id].pos},previousY:sim.limbs[id].pos.y});
        const target=keyboardTargets.get(id);if(!target)return;
        target.point.x+=event.key==='ArrowLeft'?-.08:event.key==='ArrowRight'?.08:0;
        target.point.y+=event.key==='ArrowUp'?.08:event.key==='ArrowDown'?-.08:0;sim.moveDrag(id,target.point);
      }
    });
  }
}catch(error){
  console.error('WebGL could not initialize',error);const fallback=el('webgl-fallback');fallback.hidden=false;
  fallback.innerHTML='<h2>3Dを表示できませんでした</h2><p>最新版のSafari・Chromeでお試しください。ハードウェアアクセラレーションを有効にすると遊べる場合があります。</p>';
  el<HTMLButtonElement>('start-button').disabled=true;
}
el('start-button').addEventListener('click',start);el('retry-button').addEventListener('click',start);
el('pause-button').addEventListener('click',pause);
el('resume-button').addEventListener('click',()=>el<HTMLDialogElement>('pause-dialog').close());
el('finish-button').addEventListener('click',showResult);
el('help-button').addEventListener('click',()=>{flushActiveClock();releasePointers();resetClock();el<HTMLDialogElement>('help-dialog').showModal();});
el('help-close').addEventListener('click',()=>el<HTMLDialogElement>('help-dialog').close());
for(const dialog of dialogs)dialog.addEventListener('close',resetClock);
el<HTMLDialogElement>('result-dialog').addEventListener('cancel',event=>event.preventDefault());
el('sound-button').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;el('sound-button').setAttribute('aria-pressed',String(soundEnabled));
  const soundLabel=el('sound-button').querySelector('span');if(soundLabel)soundLabel.textContent=`音 ${soundEnabled?'ON':'OFF'}`;
  el('sound-button').setAttribute('aria-label',soundEnabled?'音を消す':'音を出す');tone(true);
  el('sound-button').querySelector('svg path:last-child')!.setAttribute('d',soundEnabled?'M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12':'m16 9 5 6m0-6-5 6');
});
el('save-button').addEventListener('click',async()=>{
  if(!resultData)return;
  try{await saveCard(el<HTMLCanvasElement>('result-card'),resultData);document.querySelector('.result-note')!.textContent='画像を保存しました。';}
  catch{document.querySelector('.result-note')!.textContent='保存できません。もう一度お試しください。';}
});
el('share-button').addEventListener('click',async()=>{
  if(!resultData)return;
  const button=el<HTMLButtonElement>('share-button');button.disabled=true;
  try{
    const file=new File([await resultBlob(el<HTMLCanvasElement>('result-card'))],'gunyamast-kaguya.png',{type:'image/png'});
    if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'グニャマスト — かぐや、月へ帰る',text:`${shareText(resultData)}\n${pageUrl()}`});
    else if(navigator.share)await navigator.share({title:'グニャマスト',text:shareText(resultData),url:pageUrl()});
    else{
      await saveCard(el<HTMLCanvasElement>('result-card'),resultData);
      try{await navigator.clipboard.writeText(`${shareText(resultData)}\n${pageUrl()}`);document.querySelector('.result-note')!.textContent='画像を保存し、投稿文をコピーしました。';}
      catch{document.querySelector('.result-note')!.textContent='画像を保存しました。SNSに添付できます。';}
    }
  }catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))document.querySelector('.result-note')!.textContent='共有できません。画像を保存できます。';}
  finally{button.disabled=false;}
});
el('x-share-button').addEventListener('click',()=>{
  if(!resultData)return;const params=new URLSearchParams({text:shareText(resultData),url:pageUrl()});window.open(`https://twitter.com/intent/tweet?${params}`,'_blank','noopener,noreferrer');
  document.querySelector('.result-note')!.textContent='保存した画像をXに添付できます。';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();resetClock();});
window.addEventListener('blur',()=>{if(sim.status==='playing'||sim.status==='falling')pause();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!paused())pause();});

function frame(now:number){
  const wallDelta=Math.max(0,(now-previous)/1000);previous=now;const dt=Math.min(wallDelta,.05);
  if(!paused()){
    race.tick(wallDelta);accumulator+=dt;
    while(accumulator>=1/120){sim.step(1/120);race.afterStep();accumulator-=1/120;}
    consumeEvent(now);
    if(race.completed&&!showingResult){
      if(!finishAt){finishAt=now+2500;releasePointers();el('game-viewport').classList.add('is-cleared');tone(true,true);}
      if(now>=finishAt)showResult();
    }
  }else accumulator=0;
  view?.setRaceFeedback(race.combo,now<boostUntil,race.completed);view?.update(dt);
  if(now-lastUI>50){updateUI(now);lastUI=now;}
  requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);
if(import.meta.env.DEV)Object.assign(window,{__GUNYAMAST__:{sim,race,get view(){return view;},biomeIndex}});
