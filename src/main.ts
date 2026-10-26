import './style.css';
import { createUI } from './ui';
import { ClimbSimulation, LIMB_IDS, type LimbId, type Vec2 } from './simulation';
import { ClimbRenderer } from './renderer';
import { BIOMES, biomeIndex, formatHeight } from './biomes';
import { drawResultCard, resultBlob, saveCard, shareText, pageUrl } from './share';

createUI();
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sim = new ClimbSimulation();
let view: ClimbRenderer | undefined;
const dialogs = ['help-dialog', 'pause-dialog', 'result-dialog'].map(id => el<HTMLDialogElement>(id));
const paused = () => document.hidden || dialogs.some(dialog => dialog.open);
let best = 0;
let lastBiome = -1;
let resultHeight = 0;
let showingResult = false;
let soundEnabled = false;
let audio: AudioContext | undefined;
const pointers = new Map<number, { id: LimbId; offset: Vec2 }>();
const keyboardTargets = new Map<LimbId, Vec2>();
try { const saved = Number(localStorage.getItem('gunyamast-best-v1')); if (Number.isFinite(saved) && saved > 0) best = saved; } catch { /* Private mode can disable storage. */ }
el('best-value').textContent = formatHeight(best);

function message(text: string) { el('status-message').textContent = text; }
function tone(success: boolean) {
  if (!soundEnabled) return;
  try {
    audio ??= new AudioContext(); void audio.resume();
    const oscillator = audio.createOscillator(); const gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(success ? 680 : 210, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(success ? 980 : 110, audio.currentTime + .12);
    gain.gain.setValueAtTime(.045, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .17);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .18);
  } catch { /* Audio is optional. */ }
}
function releasePointers() {
  sim.cancelDrags(); pointers.clear(); keyboardTargets.clear();
}
function updateUI() {
  el('height-value').textContent = formatHeight(sim.height);
  const index = biomeIndex(sim.height);
  if (index !== lastBiome) {
    view?.setBiome(index); lastBiome = index;
    el('biome-label').textContent = BIOMES[index].name;
    document.querySelector('.world-label-en')!.textContent = BIOMES[index].en;
    el('biome-next').textContent = index < 4 ? `${BIOMES[index+1].from}m で、次の景色へ` : 'この先も、どこまでも。';
    el('game-viewport').dataset.biome = String(index);
    document.querySelectorAll<HTMLElement>('.route-list li').forEach(item => item.classList.toggle('is-active', Number(item.dataset.biome) === index));
    if (index > 0) message(`${BIOMES[index].name}に到着。もう少し、上へ。`);
  }
  for (const id of LIMB_IDS) {
    const grip = el(`grip-${id}`); const limb = sim.limbs[id];
    grip.classList.toggle('gripped', limb.gripped);
    grip.setAttribute('aria-label', `${id.startsWith('left') ? '左' : '右'}${id.endsWith('Hand') ? '手' : '足'}：${limb.gripped ? 'つかまり中' : '離している'}`);
  }
}
function start() {
  if (!view) return;
  dialogs.forEach(dialog => dialog.close()); releasePointers(); sim.reset(); sim.start();
  showingResult = false; lastBiome = -1; document.body.classList.add('is-playing');
  message('まず左手を、少し上の竹へ。ゆっくり運んで離そう。'); updateUI();
  requestAnimationFrame(() => view?.resize());
}
function result() {
  if (showingResult) return;
  releasePointers(); sim.finish(); showingResult = true; resultHeight = sim.maxHeight;
  best = Math.max(best, resultHeight); el('best-value').textContent = formatHeight(best);
  try { localStorage.setItem('gunyamast-best-v1', String(best)); } catch { /* Continue without persistent storage. */ }
  drawResultCard(el<HTMLCanvasElement>('result-card'), resultHeight, best);
  document.querySelector('.result-note')!.textContent='記録はこの端末に保存されます。';
  el<HTMLDialogElement>('pause-dialog').close(); el<HTMLDialogElement>('result-dialog').showModal();
}
function pause() {
  if (showingResult || sim.status === 'ready') return;
  releasePointers(); if (!el<HTMLDialogElement>('pause-dialog').open) el<HTMLDialogElement>('pause-dialog').showModal();
}

try {
  view = new ClimbRenderer(el('game-viewport'), sim, () => {
    pause(); const fallback=el('webgl-fallback');fallback.hidden=false;
    fallback.innerHTML='<h2>3D画面が一時停止しました</h2><p>ページを再読み込みして、もう一度お試しください。端末の最高記録は保存されています。</p><button class="primary-button" onclick="location.reload()">再読み込み</button>';
  });
  const scenery = el('game-viewport').querySelector<HTMLElement>('.scenery-art');
  if (scenery) scenery.style.backgroundImage = `url("${import.meta.env.BASE_URL}assets/forest-bg.png")`;
  for (const id of LIMB_IDS) {
    const handle=view.handles[id];
    handle.addEventListener('pointerdown', event => {
      if (paused() || !view || !sim.beginDrag(id)) return;
      event.preventDefault(); handle.setPointerCapture(event.pointerId);
      const point=view.screenToWorld(event.clientX,event.clientY);
      pointers.set(event.pointerId,{id,offset:{x:sim.limbs[id].pos.x-point.x,y:sim.limbs[id].pos.y-point.y}});
      message('竹の近くへ、ゆっくり。丸が追いついたら指を離そう。');
    });
    handle.addEventListener('pointermove', event => {
      const pointer=pointers.get(event.pointerId);if(!pointer||!view||paused())return;
      event.preventDefault();const point=view.screenToWorld(event.clientX,event.clientY);
      sim.moveDrag(id,{x:point.x+pointer.offset.x,y:point.y+pointer.offset.y});
    });
    const release = (event: PointerEvent) => {
      if(!pointers.has(event.pointerId))return;
      pointers.delete(event.pointerId);const success=sim.endDrag(id);tone(success);
      message(success?'つかめた！ 次の手足も、少しずつ。':'届かなかった！ 竹の近くの、無理のない位置へ。');
      if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);
    };
    handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);
    handle.addEventListener('lostpointercapture',release);
    handle.addEventListener('keydown',event=>{
      if(paused()||sim.status!=='playing')return;
      if(event.key===' '||event.key==='Enter') {
        event.preventDefault();
        if(keyboardTargets.has(id)){tone(sim.endDrag(id));keyboardTargets.delete(id);}
        else if(sim.beginDrag(id)){keyboardTargets.set(id,{...sim.limbs[id].pos});message('矢印キーで動かし、Enterでつかまる。');}
      } else if(event.key.startsWith('Arrow')) {
        event.preventDefault();
        if(!keyboardTargets.has(id)&&sim.beginDrag(id))keyboardTargets.set(id,{...sim.limbs[id].pos});
        const target=keyboardTargets.get(id);if(!target)return;
        target.x+=event.key==='ArrowLeft'?-.08:event.key==='ArrowRight'?.08:0;
        target.y+=event.key==='ArrowUp'?.08:event.key==='ArrowDown'?-.08:0;sim.moveDrag(id,target);
      }
    });
  }
} catch (error) {
  console.error('WebGL could not initialize', error);
  const fallback=el('webgl-fallback');fallback.hidden=false;
  fallback.innerHTML='<h2>3Dを表示できませんでした</h2><p>最新版のSafari・Chromeでお試しください。ブラウザのハードウェアアクセラレーションを有効にすると遊べる場合があります。</p>';
  el<HTMLButtonElement>('start-button').disabled=true;
}
el('start-button').addEventListener('click',start);
el('retry-button').addEventListener('click',start);
el('pause-button').addEventListener('click',pause);
el('resume-button').addEventListener('click',()=>el<HTMLDialogElement>('pause-dialog').close());
el('finish-button').addEventListener('click',result);
el('help-button').addEventListener('click',()=>{releasePointers();el<HTMLDialogElement>('help-dialog').showModal();});
el('help-close').addEventListener('click',()=>el<HTMLDialogElement>('help-dialog').close());
el<HTMLDialogElement>('result-dialog').addEventListener('cancel',event=>event.preventDefault());
el('sound-button').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;el('sound-button').setAttribute('aria-pressed',String(soundEnabled));
  el('sound-button').querySelector('span')!.textContent=`音 ${soundEnabled?'ON':'OFF'}`;tone(true);
  el('sound-button').querySelector('svg path:last-child')!.setAttribute('d',soundEnabled?'M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12':'m16 9 5 6m0-6-5 6');
});
el('save-button').addEventListener('click',async()=>{
  try{await saveCard(el<HTMLCanvasElement>('result-card'),resultHeight);document.querySelector('.result-note')!.textContent='保存したカードを、好きなSNSに添付できます。';}
  catch{document.querySelector('.result-note')!.textContent='カードを保存できませんでした。もう一度お試しください。';}
});
el('share-button').addEventListener('click',async()=>{
  const button=el<HTMLButtonElement>('share-button');button.disabled=true;
  try {
    const file=new File([await resultBlob(el<HTMLCanvasElement>('result-card'))],`gunyamast-${formatHeight(resultHeight)}m.png`,{type:'image/png'});
    if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'グニャマスト',text:`${shareText(resultHeight)}\n${pageUrl()}`});
    else if(navigator.share)await navigator.share({title:'グニャマスト',text:shareText(resultHeight),url:pageUrl()});
    else {
      await saveCard(el<HTMLCanvasElement>('result-card'),resultHeight);
      try {await navigator.clipboard.writeText(`${shareText(resultHeight)}\n${pageUrl()}`);document.querySelector('.result-note')!.textContent='カードを保存し、投稿文をコピーしました。SNSに貼り付けてシェア！';}
      catch{document.querySelector('.result-note')!.textContent='カードを保存しました。「Xに投稿する」から記録をシェアできます。';}
    }
  } catch(error) {
    if(!(error instanceof DOMException&&error.name==='AbortError'))document.querySelector('.result-note')!.textContent='共有できませんでした。「カードを保存」から画像を保存できます。';
  } finally{button.disabled=false;}
});
el('x-share-button').addEventListener('click',()=>{
  const params=new URLSearchParams({text:shareText(resultHeight),url:pageUrl()});
  window.open(`https://twitter.com/intent/tweet?${params}`,'_blank','noopener,noreferrer');
  document.querySelector('.result-note')!.textContent='カードも載せるなら、保存した画像をXの投稿に添付してください。';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('blur',()=>{if(sim.status==='playing'||sim.status==='falling')pause();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!paused())pause();});

let previous=performance.now();let accumulator=0;let lastUI=0;
function frame(now:number){
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(!paused()){
    accumulator+=dt;
    while(accumulator>=1/120){sim.step(1/120);accumulator-=1/120;}
    if(sim.status==='ended'&&!showingResult)result();
  }else accumulator=0;
  view?.update(dt);
  if(now-lastUI>80){updateUI();lastUI=now;}
  requestAnimationFrame(frame);
}
updateUI();requestAnimationFrame(frame);

// Development-only inspection; excluded from production by Vite.
if(import.meta.env.DEV)Object.assign(window,{__GUNYAMAST__:{sim,get view(){return view;},biomeIndex}});
