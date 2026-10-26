const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 6v12M16 6v12" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M9.8 9a2.3 2.3 0 0 1 4.4 1c0 1.6-2.2 1.7-2.2 3.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="16.3" r=".9" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 4 14 16h-4L5 4h4l10 16M19 4 5 20" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  leaf: '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 35V5m-6 8h12m-12 9h12m-12 9h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M18 15C7 15 5 9 5 6c8 0 13 3 13 9Zm4 10c11 0 13-6 13-9-8 0-13 3-13 9Z" fill="currentColor"/></svg>',
};

export function createUI(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('アプリの表示領域が見つかりません。');
  app.innerHTML = `
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="./" aria-label="グニャマスト ホーム">
          <span class="brand-mark">${icons.leaf}</span>
          <span class="brand-name">グニャマスト<span>GUNYAMAST</span></span>
        </a>
        <p class="header-edition">THE ENDLESS BAMBOO CLIMB <span>VOL. 01</span></p>
        <div class="header-actions">
          <button class="header-action" id="sound-button" type="button" aria-label="効果音を切り替える" aria-pressed="false">${icons.sound}<span>音 OFF</span></button>
          <button class="header-action" id="help-button" type="button" aria-label="遊び方を開く">${icons.help}<span>遊び方</span></button>
        </div>
      </header>

      <main class="climb-layout">
        <section class="introduction" aria-labelledby="game-title">
          <p class="eyebrow"><span class="small-square"></span> 脱力系・竹登りゲーム</p>
          <h1 id="game-title">ぐにゃっと、<br>どこまでも。</h1>
          <p class="intro-description">頼りない手足と、一本の竹。<br>つかんで、のばして、またつかむ。<br>あなたはどこまで登れる？</p>
          <div class="intro-meta">
            <p class="mini-label">YOUR PERSONAL BEST</p>
            <p class="best-record"><span id="best-value">0.0</span><span class="record-unit">m</span></p>
            <p class="record-note">この端末の最高到達点 <span>↗</span></p>
          </div>
          <div class="field-note"><span class="field-note-number">01 /</span><p>急がなくて、だいじょうぶ。<br>空は逃げないから。</p><span class="note-arrow">${icons.arrow}</span></div>
        </section>

        <section class="climb-stage" aria-label="3D 竹登りゲーム">
          <div class="scene-caption"><span>ONE BAMBOO. ENDLESS POSSIBILITIES.</span><span>↑ UP WE GO</span></div>
          <div id="game-viewport" class="game-viewport">
            <div class="world-label"><span class="live-dot"></span><span id="biome-label">竹林</span><span class="world-label-rule"></span> <span class="world-label-en">THE JOURNEY BEGINS</span></div>
            <div class="altitude-hud" aria-live="off"><span class="mini-label">ALTITUDE</span><p><span id="height-value">0.0</span><span class="height-unit">m</span></p><span id="biome-next">15m で、竹林の向こうへ</span></div>
            <div class="stage-actions"><button class="round-button" id="pause-button" type="button" aria-label="一時停止">${icons.pause}</button></div>
            <div class="grip-hud" aria-label="手足のつかまり状態"><span class="mini-label">GRIP</span><div class="grip-indicators"><span class="grip-indicator gripped" id="grip-leftHand" aria-label="左手"><span>左手</span></span><span class="grip-indicator gripped" id="grip-rightHand" aria-label="右手"><span>右手</span></span><span class="grip-indicator gripped foot" id="grip-leftFoot" aria-label="左足"><span>左足</span></span><span class="grip-indicator gripped foot" id="grip-rightFoot" aria-label="右足"><span>右足</span></span></div></div>
            <span class="scene-side-note">TAKE YOUR TIME / FIND YOUR RHYTHM</span>
            <p id="status-message" class="status-message" role="status">手足の丸を、竹の上へドラッグ</p>
            <div id="start-overlay" class="start-overlay">
              <p class="start-note"><span></span>制限時間なし。のんびり、真剣に。</p>
              <button id="start-button" class="start-button" type="button"><span>登りはじめる<small>LET’S CLIMB</small></span><span class="start-arrow">${icons.arrow}</span></button>
              <p class="start-hint">手足をドラッグして、竹をつかもう。</p>
            </div>
            <div id="webgl-fallback" class="webgl-fallback" hidden><span class="fallback-icon">${icons.leaf}</span><h2>竹を準備しています</h2><p>しばらくお待ちください。</p></div>
          </div>
          <div class="scene-bottom"><span><i></i> 3D CLIMBING EXPERIMENT</span><span>NO TIMER. JUST YOU.</span></div>
        </section>

        <aside class="route" aria-label="高さで変わる景色">
          <p class="eyebrow">THE WAY UP</p>
          <h2>空までの<br>よりみち。</h2>
          <ol class="route-list">
            <li data-biome="4"><span class="route-node"></span><span class="route-height">150 m —</span><span class="route-name">星々<span>INTO THE STARS</span></span></li>
            <li data-biome="3"><span class="route-node"></span><span class="route-height">80 m —</span><span class="route-name">夕焼け<span>GOLDEN HOUR</span></span></li>
            <li data-biome="2"><span class="route-node"></span><span class="route-height">40 m —</span><span class="route-name">雲海<span>ABOVE THE CLOUDS</span></span></li>
            <li data-biome="1"><span class="route-node"></span><span class="route-height">15 m —</span><span class="route-name">山々<span>MOUNTAIN AIR</span></span></li>
            <li class="is-active" data-biome="0"><span class="route-node"></span><span class="route-height">0 m —</span><span class="route-name">竹林<span>WHERE IT ALL BEGINS</span></span><span class="route-current">YOU ARE HERE</span></li>
          </ol>
          <p class="route-note"><span>∞</span>ゴールは、まだ先。</p>
        </aside>
      </main>

      <section class="control-bar" aria-label="操作のヒント">
        <p class="control-caption">HOW TO CLIMB</p>
        <div class="control-step"><span>01</span><p>手足の丸をつかむ</p></div><span class="control-arrow">→</span>
        <div class="control-step"><span>02</span><p>竹の上へ運ぶ</p></div><span class="control-arrow">→</span>
        <div class="control-step"><span>03</span><p>離してつかまる</p></div>
        <p class="control-tip">手足を <strong>2本以上</strong> 残すと安定します。</p>
      </section>
      <footer class="site-footer"><span>© GUNYAMAST</span><span>肩の力を抜いて、上を向こう。</span><span>FREE TO CLIMB <i>↗</i></span></footer>
    </div>

    <dialog id="help-dialog" class="game-dialog help-dialog" aria-labelledby="help-title">
      <button id="help-close" class="dialog-close round-button" type="button" aria-label="遊び方を閉じる">${icons.close}</button>
      <p class="eyebrow">A LITTLE FIELD GUIDE</p><h2 id="help-title">コツは、<br>ちょっとずつ。</h2><p class="dialog-intro">ぐにゃぐにゃの手足を動かして、<br>終わらない竹を登っていこう。</p>
      <ol class="help-steps"><li><span class="help-number">01</span><div><h3>手足の丸をつかむ</h3><p>左右の手と足、4つの丸を指でドラッグ。パソコンならマウスでも遊べます。</p></div></li><li><span class="help-number">02</span><div><h3>少し上の竹へ運ぶ</h3><p>手足が届くところまで、少しずつ。欲張りすぎると、からだがぐにゃり。</p></div></li><li><span class="help-number">03</span><div><h3>指を離して、つかまる</h3><p>竹の近くで離すとつかまります。手足を2本以上残すと、安定して登れます。</p></div></li></ol>
      <p class="help-bottom"><span>∞</span>制限時間はありません。落ちたところが、今日の記録。</p>
    </dialog>

    <dialog id="pause-dialog" class="game-dialog pause-dialog" aria-labelledby="pause-title"><p class="eyebrow">TAKE A BREATHER</p><h2 id="pause-title">ひとやすみ。</h2><p class="dialog-intro">竹は、ここで待っています。<br>自分のペースで、もうひと登り。</p><div class="pause-illustration" aria-hidden="true">${icons.leaf}<span>KEEP GOING, GENTLY.</span></div><button id="resume-button" class="primary-button" type="button">つづける ${icons.arrow}</button><button id="finish-button" class="text-button" type="button">ここまでの記録を残す <span>↗</span></button></dialog>

    <dialog id="result-dialog" class="game-dialog result-dialog" aria-labelledby="result-title"><div class="result-layout"><div class="result-card-wrap"><canvas id="result-card" width="900" height="1200" aria-label="今回の登頂記録カード"></canvas></div><div class="result-content"><p class="eyebrow">YOUR CLIMB, YOUR STORY</p><h2 id="result-title">よく、<br>のぼりました。</h2><p class="dialog-intro">ぐにゃぐにゃでも、一歩ずつ。<br>今日の景色を、みんなにも。</p><div class="result-actions"><button id="share-button" class="primary-button" type="button">${icons.share}<span>記録をシェア</span></button><button id="save-button" class="secondary-button" type="button">${icons.download}<span>カードを保存</span></button><button id="x-share-button" class="text-button x-share-button" type="button">${icons.x}<span>X に投稿する</span><span>↗</span></button></div><button id="retry-button" class="retry-button" type="button">もう一度、空へ <span>↗</span></button><p class="result-note">記録はこの端末に保存されます。</p></div></div></dialog>
  `;
}
