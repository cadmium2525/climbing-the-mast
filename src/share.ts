import { BIOMES, biomeIndex, formatHeight } from './biomes';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

/** All pixels are drawn locally: no remote images or cross-origin canvas taint. */
export function drawResultCard(canvas: HTMLCanvasElement, height: number, best: number) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 900; canvas.height = 1200;
  const biome = BIOMES[biomeIndex(height)];
  const index = biomeIndex(height);
  ctx.fillStyle = '#f5f3e9'; ctx.fillRect(0, 0, 900, 1200);
  ctx.strokeStyle = '#d8ddcc'; ctx.lineWidth = 1;
  for (let x = 0; x < 900; x += 45) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1200); ctx.stroke(); }
  for (let y = 0; y < 1200; y += 45) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke(); }
  ctx.fillStyle = '#244b38'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('グニャマスト', 62, 88);
  ctx.font = '15px monospace'; ctx.fillText('YOUR LITTLE EXPEDITION', 545, 83);
  ctx.strokeStyle = '#244b38'; ctx.beginPath(); ctx.moveTo(62, 116); ctx.lineTo(838, 116); ctx.stroke();
  const gradient = ctx.createLinearGradient(0, 150, 0, 700);
  gradient.addColorStop(0, biome.sky); gradient.addColorStop(1, index===4 ? '#565480' : index===3 ? '#f7dda9' : '#e2e8d3');
  ctx.fillStyle = gradient; roundRect(ctx, 62, 150, 776, 560, 6);
  ctx.save(); ctx.beginPath(); ctx.rect(62, 150, 776, 560); ctx.clip();
  if(index===4) {
    ctx.fillStyle='#fff8dd';
    for(let i=0;i<46;i++){ctx.beginPath();ctx.arc(80+((i*137)%740),170+((i*89)%480),i%3===0?2:1,0,Math.PI*2);ctx.fill();}
  }
  if(index===3){ctx.fillStyle='#fff0ba';ctx.beginPath();ctx.arc(704,310,48,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha = .25;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = biome.color; ctx.beginPath(); ctx.moveTo(62, 710);
    for (let x = 62; x < 860; x += 20) ctx.lineTo(x, 520 + i * 60 + Math.sin(x * .006 + i * 2) * 70 + Math.cos(x * .012 + i) * 35);
    ctx.lineTo(838, 710); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#617c35'; roundRect(ctx, 455, 150, 33, 560, 8);
  ctx.fillStyle = '#91a64b'; ctx.fillRect(460, 150, 8, 560);
  for (let y = 200; y < 710; y += 110) { ctx.fillStyle = '#aabb67'; roundRect(ctx, 451, y, 42, 8, 3); }
  // The same little climber, translated into a shareable graphic.
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (points: number[][], color: string, width: number) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    points.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
  };
  line([[427,465],[385,507],[458,555]], '#364f57', 25);
  line([[448,465],[504,514],[482,555]], '#476772', 25);
  line([[421,387],[378,351],[462,310]], '#e9b68b', 19);
  line([[449,386],[510,363],[482,338]], '#e9b68b', 19);
  ctx.fillStyle = '#e7bd4e'; roundRect(ctx, 410, 371, 50, 101, 22);
  ctx.fillStyle = '#f2c5a1'; ctx.beginPath(); ctx.arc(435, 346, 28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#c76740'; ctx.beginPath(); ctx.arc(434, 337, 29, Math.PI, 0); ctx.fill(); roundRect(ctx, 403, 329, 64, 11, 5);
  ctx.fillStyle='#36483b';for(const x of [426,445]){ctx.beginPath();ctx.arc(x,350,2.3,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='#ad795a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(435,354,8,.2,Math.PI-.2);ctx.stroke();
  line([[449,554],[468,554]], '#c36743', 20); line([[479,553],[498,553]], '#c36743', 20);
  ctx.restore();
  ctx.fillStyle = '#244b38'; ctx.font = '18px monospace'; ctx.fillText('HIGHEST POINT / 最高到達点', 64, 765);
  ctx.font = 'bold 136px sans-serif';
  const numeralWidth=ctx.measureText(formatHeight(height)).width;
  if(numeralWidth>690)ctx.font=`bold ${136*690/numeralWidth}px sans-serif`;
  ctx.fillText(formatHeight(height), 56, 906);
  const width = ctx.measureText(formatHeight(height)).width;
  ctx.font = '36px monospace'; ctx.fillText('m', Math.min(790, 72 + width), 900);
  ctx.font = 'bold 32px sans-serif'; ctx.fillText(biome.title, 64, 981);
  ctx.font = '22px sans-serif'; ctx.fillStyle = '#697665'; ctx.fillText(biome.message, 64, 1029);
  ctx.strokeStyle = '#b9c4af'; ctx.beginPath(); ctx.moveTo(62, 1075); ctx.lineTo(838, 1075); ctx.stroke();
  ctx.font = '18px monospace'; ctx.fillStyle = '#244b38'; ctx.fillText(`#グニャマスト  BEST ${formatHeight(best)}m`, 64, 1120);
  ctx.font = '17px sans-serif'; ctx.fillText('手足はぐにゃぐにゃ。竹はどこまでも。', 64, 1161);
}

export const resultBlob = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('カードを作れませんでした')), 'image/png');
});
export function shareText(height: number) {
  return `ぐにゃぐにゃの手足で ${formatHeight(height)}m 登った！\n称号「${BIOMES[biomeIndex(height)].title}」\nあなたはどこまで登れる？ #グニャマスト`;
}
export function pageUrl() { return new URL('./', location.href).href; }
export async function saveCard(canvas: HTMLCanvasElement, height: number) {
  const blob = await resultBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `gunyamast-${formatHeight(height)}m.png`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
