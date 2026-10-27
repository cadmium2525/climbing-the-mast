const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 6v12M16 6v12" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.6-2.2 1.7-2.2 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="16.3" r=".9" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  leaf: '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 35V5m-6 8h12m-12 9h12m-12 9h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 15C7 15 5 9 5 6c8 0 13 3 13 9Zm4 10c11 0 13-6 13-9-8 0-13 3-13 9Z" fill="currentColor"/></svg>',
};

export function createUI(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('アプリの表示領域が見つかりません。');
  app.innerHTML = `
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="./" aria-label="グニャマスト ホーム"><span class="brand-mark">${icons.leaf}</span><span class="brand-name">グニャマスト</span></a>
        <div class="header-actions">
          <button class="header-action pause-action" id="pause-button" type="button" aria-label="一時停止">${icons.pause}</button>
          <button class="header-action" id="sound-button" type="button" aria-label="効果音を切り替える" aria-pressed="false">${icons.sound}<span class="visually-hidden">音 OFF</span></button>
          <button class="header-action" id="help-button" type="button" aria-label="遊び方を開く">${icons.help}</button>
        </div>
      </header>
      <main class="climb-layout">
        <section class="climb-stage" aria-label="かぐや姫の3D竹登りレース">
          <div id="game-viewport" class="game-viewport">
            <div class="race-hud" aria-live="off">
              <div class="race-timer"><span class="metric-label">タイム</span><p id="time-value">0:00.0</p><span id="penalty-value" class="penalty-value" hidden>救出 +0秒</span></div>
              <div class="moon-distance"><span class="metric-label">月まで</span><p id="remaining-value">24.0m</p></div>
              <progress id="moon-progress" max="24" value="0" aria-label="月までの進み具合">0%</progress>
            </div>
            <div class="world-label"><span id="biome-label">竹林</span><span class="world-label-en" hidden></span></div>
            <div id="story-toast" class="story-toast" role="status"><strong id="story-title"></strong><p id="story-text"></p></div>
            <p id="status-message" class="status-message" role="status"></p>
            <div id="start-overlay" class="start-overlay">
              <div class="home-heading"><h1 id="game-title">かぐや、月へ帰る。</h1><p class="home-subtitle">月まで24mの帰宅レース</p><p class="best-record">自己ベスト <strong id="best-value">—</strong><span id="best-unit"></span></p></div>
              <div class="home-actions"><button id="start-button" class="start-button" type="button"><span>月へ帰る</span>${icons.arrow}</button><p class="start-hint">手足の丸を上へドラッグ</p></div>
            </div>
            <div id="webgl-fallback" class="webgl-fallback" hidden><span class="fallback-icon">${icons.leaf}</span><h2>竹を準備しています</h2><p>しばらくお待ちください。</p></div>
            <div hidden aria-hidden="true"><span id="height-value">0.0</span><span id="biome-next"></span><span id="checkpoint-value"></span><span id="combo-value"></span><span id="grip-leftHand"></span><span id="grip-rightHand"></span><span id="grip-leftFoot"></span><span id="grip-rightFoot"></span></div>
          </div>
            <div class="rhythm-hud"><span class="combo-hint">手・足を交互に。4回で追い風</span><div id="combo-meter" class="combo-meter" data-combo="0" aria-label="追い風までのリズム"><i></i><i></i><i></i><i></i></div></div>
        </section>
      </main>
    </div>
    <dialog id="help-dialog" class="game-dialog help-dialog" aria-labelledby="help-title">
      <button id="help-close" class="dialog-close header-action" type="button" aria-label="遊び方を閉じる">${icons.close}</button>
      <h2 id="help-title">遊び方</h2>
      <ol class="help-steps"><li>丸を上へドラッグ。<br>竹の近くで離す。</li><li>手・足を交互に4回で追い風。</li><li>落ちても休み竹から再開。<br>救出1回につき＋5秒。</li></ol>
      <p class="help-bottom">2本はつかんだままで。</p>
    </dialog>
    <dialog id="pause-dialog" class="game-dialog pause-dialog" aria-labelledby="pause-title"><h2 id="pause-title">ひとやすみ</h2><p class="dialog-intro">時計も止まっています。</p><button id="resume-button" class="primary-button" type="button">つづける</button><button id="finish-button" class="text-button" type="button">ここまでの記録を見る</button></dialog>
    <dialog id="result-dialog" class="game-dialog result-dialog" aria-labelledby="result-title">
      <div class="result-layout">
        <div class="result-heading"><p id="result-label" class="result-label">月へ帰還</p><h2 id="result-title">おかえり、かぐや姫。</h2><p id="result-value" class="result-value">0:00.0</p><p id="result-description" class="dialog-intro">月で父と母が待っていました。</p></div>
        <div class="result-card-wrap"><canvas id="result-card" width="900" height="1200" aria-label="かぐや姫の月への帰還記録カード"></canvas></div>
        <div class="result-controls"><div class="result-actions"><button id="share-button" class="primary-button" type="button">${icons.share}<span>シェア</span></button><button id="save-button" class="secondary-button" type="button">${icons.download}<span>画像保存</span></button></div><button id="retry-button" class="retry-button" type="button">もう一度登る</button><p class="result-note" role="status">自己ベストはこの端末に保存されます。</p></div>
      </div>
    </dialog>
  `;
}
