export const BIOMES = [
  { name: '竹取の里', en: 'THE DEPARTURE', from: 0, color: '#315a43', sky: '#d9e2c7', ink: '#254c37', title: '里を発つ姫', message: '迎えが来ないので、自分で帰ることにした。' },
  { name: '山鳥の便り', en: 'A LETTER FROM HOME', from: 4, color: '#667e88', sky: '#c9dbe1', ink: '#32556a', title: '山風の姫', message: 'おじいさんへ。帰りの便は、竹になりました。' },
  { name: '雲の渡し', en: 'CLOUD CROSSING', from: 9, color: '#7aa5b0', sky: '#b8dbe9', ink: '#3c6675', title: '雲を渡る姫', message: '雲の向こうに、うさぎの灯りが見えてきた。' },
  { name: '天の川', en: 'THE MILKY WAY', from: 15, color: '#65618d', sky: '#292846', ink: '#eee4f4', title: '星を渡る姫', message: '月の迎え？ いえ、今日は自力です。' },
  { name: '月の庭', en: 'ALMOST HOME', from: 21, color: '#747690', sky: '#1b2547', ink: '#f4ead5', title: 'もうすぐ月の姫', message: 'あと少し。今日は、よく眠れそう。' },
] as const;
export function biomeIndex(height: number) {
  let index = 0;
  for (let i = 1; i < BIOMES.length; i++) if (height >= BIOMES[i].from) index = i;
  return index;
}
export const formatHeight = (height: number) => Math.max(0, height).toFixed(1);
