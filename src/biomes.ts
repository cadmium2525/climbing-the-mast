export const BIOMES = [
  { name: '風そよぐ竹林', en: 'BAMBOO FOREST', from: 0, color: '#315a43', sky: '#d9e2c7', ink: '#254c37', title: '竹林の挑戦者', message: '一歩ずつ、空に近づいている。' },
  { name: '遥かな山並み', en: 'MOUNTAIN AIR', from: 15, color: '#667e88', sky: '#c9dbe1', ink: '#32556a', title: '山風の旅人', message: '山の向こうにも、まだ空がある。' },
  { name: 'ふわり、雲の上', en: 'ABOVE THE CLOUDS', from: 40, color: '#7aa5b0', sky: '#b8dbe9', ink: '#3c6675', title: '雲海の散歩人', message: 'いつのまにか、雲を追い越した。' },
  { name: '茜色の空', en: 'GOLDEN HOUR', from: 80, color: '#ba7569', sky: '#f4cbae', ink: '#874c50', title: '夕焼けの冒険家', message: '今日の夕焼けは、いつもより近い。' },
  { name: '星々のあいだ', en: 'INTO THE STARS', from: 150, color: '#383b69', sky: '#1b2547', ink: '#dfdeef', title: '星をつかむ人', message: '手を伸ばした先に、宇宙があった。' },
] as const;
export function biomeIndex(height: number) {
  let index = 0;
  for (let i = 1; i < BIOMES.length; i++) if (height >= BIOMES[i].from) index = i;
  return index;
}
export const formatHeight = (height: number) => Math.max(0, height).toFixed(1);
