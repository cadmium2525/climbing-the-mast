import { BIOMES, biomeIndex, formatHeight } from './biomes';
import { formatTime, MOON_HEIGHT } from './race';

export type RaceResult = {
  cleared: boolean; time: number; height: number; falls: number; boosts: number; best: number | null;
};
export function resultTitle(result: RaceResult) {
  if (!result.cleared) return '里帰りは、つづく。';
  return result.time < 90 ? '月の最速便' : result.time < 180 ? '羽衣の達人' : '自力帰還のかぐや姫';
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

/** Locally generated card. No cross-origin canvas dependencies. */
export function drawResultCard(canvas: HTMLCanvasElement, result: RaceResult) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = 900; canvas.height = 1200;
  const biome = BIOMES[biomeIndex(result.height)];
  ctx.fillStyle = '#f5f3e9'; ctx.fillRect(0, 0, 900, 1200);
  ctx.strokeStyle = '#dedbcb'; ctx.lineWidth = 1;
  for(let x=0;x<900;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,1200);ctx.stroke();}
  for(let y=0;y<1200;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(900,y);ctx.stroke();}
  ctx.fillStyle = '#333c43'; ctx.font = 'bold 31px sans-serif'; ctx.fillText('グニャマスト', 62, 83);
  ctx.font = '19px sans-serif'; ctx.fillText('かぐや、月へ帰る。', 581, 81);
  ctx.strokeStyle='#ada987';ctx.beginPath();ctx.moveTo(62,113);ctx.lineTo(838,113);ctx.stroke();
  const sky=ctx.createLinearGradient(0,145,0,670);sky.addColorStop(0,'#191f3e');sky.addColorStop(1,result.cleared?'#655c80':biome.color);
  ctx.fillStyle=sky;roundRect(ctx,62,145,776,510,7);
  ctx.save();ctx.beginPath();ctx.rect(62,145,776,510);ctx.clip();
  ctx.fillStyle='#f9ebc8';
  for(let i=0;i<58;i++){ctx.beginPath();ctx.arc(75+((i*137)%750),158+((i*89)%470),i%4===0?2:1,0,Math.PI*2);ctx.fill();}
  ctx.shadowColor='#fce8b3';ctx.shadowBlur=40;ctx.beginPath();ctx.arc(676,283,91,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#dccda1';for(const [x,y,r] of [[650,260,14],[700,301,20],[640,307,9],[695,240,8]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#7b8b4b';roundRect(ctx,442,145,29,510,6);ctx.fillStyle='#b2bd72';ctx.fillRect(447,145,6,510);
  for(let y=190;y<655;y+=96){ctx.fillStyle='#bfcb86';roundRect(ctx,438,y,37,7,3);}
  const line=(points:number[][],color:string,width:number)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
  // Her back faces the viewer: long black hair and the red obi bow.
  line([[419,473],[381,514],[443,559]],'#be8190',27);
  line([[450,473],[497,520],[469,559]],'#d5a0ad',27);
  line([[419,400],[368,374],[443,332]],'#ede3d1',31);
  line([[452,400],[508,376],[467,350]],'#f2e9dd',31);
  line([[430,341],[444,331]],'#edc4a3',15);line([[473,351],[465,349]],'#edc4a3',15);
  ctx.fillStyle='#e9c5c5';roundRect(ctx,407,388,56,96,22);
  ctx.fillStyle='#ce6474';roundRect(ctx,404,449,62,20,4);
  ctx.fillStyle='#1e2430';roundRect(ctx,411,336,48,105,22);
  ctx.strokeStyle='#e5c26d';ctx.lineWidth=5;ctx.beginPath();ctx.arc(436,349,17,Math.PI,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#a94c64';ctx.beginPath();ctx.moveTo(437,460);ctx.lineTo(403,444);ctx.lineTo(403,480);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(435,460);ctx.lineTo(470,444);ctx.lineTo(470,480);ctx.closePath();ctx.fill();
  line([[435,559],[451,559]],'#ecdcc0',15);line([[465,559],[482,559]],'#ecdcc0',15);
  if(result.cleared){
    ctx.fillStyle='#efe6cf';ctx.beginPath();ctx.ellipse(660,650,180,42,0,0,Math.PI*2);ctx.fill();
    const drawParent=(x:number,mother:boolean)=>{
      ctx.fillStyle=mother?'#b594bd':'#8cabb7';roundRect(ctx,x-22,552,44,75,14);
      ctx.fillStyle=mother?'#eee1d1':'#dce6e1';roundRect(ctx,x-25,553,10,67,4);roundRect(ctx,x+15,553,10,67,4);
      ctx.fillStyle=mother?'#cc839a':'#c5b277';roundRect(ctx,x-24,584,48,10,3);
      ctx.fillStyle='#efcbae';ctx.beginPath();ctx.arc(x,535,21,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=mother?'#292736':'#7f8393';ctx.beginPath();ctx.arc(x,529,22,Math.PI,Math.PI*2);ctx.fill();
      if(mother){ctx.beginPath();ctx.arc(x+12,507,12,0,Math.PI*2);ctx.fill();}
      else{ctx.fillStyle='#e3e2dc';ctx.beginPath();ctx.moveTo(x-10,548);ctx.lineTo(x+10,548);ctx.lineTo(x,565);ctx.closePath();ctx.fill();}
      ctx.fillStyle='#303542';for(const dx of [-7,7]){ctx.beginPath();ctx.arc(x+dx,536,2,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='#a96d66';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,541,6,.2,Math.PI-.2);ctx.stroke();
      ctx.strokeStyle=mother?'#eee1d1':'#dce6e1';ctx.lineWidth=15;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x+(mother?19:-19),568);ctx.lineTo(x+(mother?34:-34),551);ctx.lineTo(x+(mother?32:-32),528);ctx.stroke();
      ctx.fillStyle='#efcbae';ctx.beginPath();ctx.arc(x+(mother?32:-32),523,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e3c578';ctx.beginPath();ctx.arc(x,521,7,Math.PI,Math.PI*2);ctx.lineWidth=3;ctx.strokeStyle='#e3c578';ctx.stroke();
    };
    drawParent(610,false);drawParent(744,true);
  }
  ctx.restore();
  ctx.fillStyle='#333c43';ctx.font='17px monospace';ctx.fillText(result.cleared?'MOON RETURN / 月まで帰還':'TO BE CONTINUED / 今回の旅',64,709);
  const numeral=result.cleared?formatTime(result.time):`${formatHeight(result.height)} / ${MOON_HEIGHT}m`;
  ctx.font='bold 113px sans-serif';const width=ctx.measureText(numeral).width;if(width>780)ctx.font=`bold ${113*780/width}px sans-serif`;ctx.fillText(numeral,56,842);
  ctx.font='bold 32px sans-serif';ctx.fillText(resultTitle(result),64,914);
  ctx.font='22px sans-serif';ctx.fillStyle='#717264';ctx.fillText(result.cleared?'「おかえり」月で父と母が待っていました。':'月では父と母が、帰りを待っています。',64,960);
  ctx.font='19px monospace';ctx.fillStyle='#565b58';ctx.fillText(`追い風 ${result.boosts}回   救出 ${result.falls}回（+${result.falls*5}秒）`,64,1012);
  ctx.strokeStyle='#bdbca8';ctx.beginPath();ctx.moveTo(62,1050);ctx.lineTo(838,1050);ctx.stroke();
  ctx.font='19px monospace';ctx.fillText(result.best!==null?`PERSONAL BEST  ${formatTime(result.best)}`:'月への旅は、まだこれから。',64,1097);
  ctx.font='20px sans-serif';ctx.fillText('#グニャマスト #かぐや月へ帰る',64,1141);
}

export const resultBlob=(canvas:HTMLCanvasElement)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('カードを作れませんでした')),'image/png'));
export function shareText(result:RaceResult){
  return result.cleared?`迎えが来ないので、自力で月へ帰りました。\n帰還タイム ${formatTime(result.time)} / 追い風${result.boosts}回・救出${result.falls}回\n「${resultTitle(result)}」 #グニャマスト #かぐや月へ帰る`:`月まであと${formatHeight(MOON_HEIGHT-result.height)}m！\nぐにゃぐにゃのかぐや姫、里帰りはつづく。 #グニャマスト #かぐや月へ帰る`;
}
export function pageUrl(){return new URL('./',location.href).href;}
export async function saveCard(canvas:HTMLCanvasElement,result:RaceResult){
  const url=URL.createObjectURL(await resultBlob(canvas));const link=document.createElement('a');
  link.href=url;link.download=`gunyamast-kaguya-${result.cleared?result.time.toFixed(2)+'s':'journey'}.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
