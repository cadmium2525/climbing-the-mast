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
  moon: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19.5 14.8A8.3 8.3 0 0 1 9.2 4.5a8.4 8.4 0 1 0 10.3 10.3Z" fill="currentColor"/><path d="M18 3v4m-2-2h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
};

export function createUI(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('アプリの表示領域が見つかりません。');
  app.innerHTML = `
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="./" aria-label="グニャマスト ホーム">
          <span class="brand-mark">${icons.leaf}</span>
          <span class="brand-name">グニャマスト<span>かぐや、月へ帰る</span></span>
        </a>
        <p class="header-edition">THE MOON RETURN RACE <span>A BAMBOO TALE</span></p>
        <div class="header-actions">
          <button class="header-action" id="sound-button" type="button" aria-label="効果音を切り替える" aria-pressed="false">${icons.sound}<span>音 OFF</span></button>
          <button class="header-action" id="help-button" type="button" aria-label="遊び方を開く">${icons.help}<span>遊び方</span></button>
        </div>
      </header>

      <main class="climb-layout">
        <section class="introduction" aria-labelledby="game-title">
          <p class="eyebrow"><span class="small-square"></span> 月まで24m。ぐにゃぐにゃ帰還レース。</p>
          <h1 id="game-title">迎えが来ない。<br>なら、登ろう。</h1>
          <p class="intro-description">月の迎えを待ちくたびれた、かぐや姫。<br>「もう、自力で帰ります。」<br>ぐにゃぐにゃの手足で、月まで何分？</p>
          <div class="intro-meta">
            <p class="mini-label">FASTEST MOON RETURN</p>
            <p class="best-record"><span id="best-value">—</span><span id="best-unit" class="record-unit"></span></p>
            <p class="record-note">この端末の最速帰還 <span>↗</span></p>
          </div>
          <div class="field-note"><span class="field-note-number">姫の手記 /</span><p>待つより、登るほうが早い。<br>たぶん。</p><span class="note-arrow">${icons.moon}</span></div>
        </section>

        <section class="climb-stage" aria-label="かぐや姫の3D竹登りレース">
          <div class="scene-caption"><span>ONE BAMBOO. ONE WAY HOME.</span><span>↑ NEXT STOP: THE MOON</span></div>
          <div id="game-viewport" class="game-viewport">
            <div class="world-label"><span class="live-dot"></span><span id="biome-label">竹林</span><span class="world-label-rule"></span> <span class="world-label-en">KAGUYA’S WAY HOME</span></div>
            <div class="race-hud" aria-live="off">
              <div class="race-timer"><span class="mini-label">RETURN TIME</span><p id="time-value">0:00.0</p><span id="penalty-value" class="penalty-value">救出 +0秒</span></div>
              <div class="altitude-hud"><span class="mini-label">TO THE MOON</span><p><span id="height-value">0.0</span><span class="height-unit">/ 24m</span></p><span id="biome-next">4m で、山鳥のいる空へ</span></div>
              <div class="moon-distance"><div class="progress-label"><span>${icons.moon} 月まで <strong id="remaining-value">24.0m</strong></span><span id="checkpoint-value">次の休み竹 6m</span></div><progress id="moon-progress" max="24" value="0" aria-label="月までの進み具合">0%</progress></div>
            </div>
            <div class="stage-actions"><button class="round-button" id="pause-button" type="button" aria-label="一時停止">${icons.pause}</button></div>
            <div class="grip-hud" aria-label="手足のつかまり状態"><span class="mini-label">GRIP</span><div class="grip-indicators"><span class="grip-indicator gripped" id="grip-leftHand" aria-label="左手"><span>左手</span></span><span class="grip-indicator gripped" id="grip-rightHand" aria-label="右手"><span>右手</span></span><span class="grip-indicator gripped foot" id="grip-leftFoot" aria-label="左足"><span>左足</span></span><span class="grip-indicator gripped foot" id="grip-rightFoot" aria-label="右足"><span>右足</span></span></div></div>
            <div class="rhythm-hud"><div class="combo-heading"><span class="mini-label">MOON RHYTHM</span><span id="combo-value">手 → 足 → 手 → 足</span></div><div id="combo-meter" class="combo-meter" data-combo="0" aria-label="追い風までのリズム"><i></i><i></i><i></i><i></i></div><span class="combo-hint">手 → 足を交互に。4回で追い風。</span></div>
            <div id="story-toast" class="story-toast" role="status"><span class="story-moon">${icons.moon}</span><div><strong id="story-title"></strong><p id="story-text"></p></div></div>
            <span class="scene-side-note">A SMALL STEP FOR A VERY TIRED PRINCESS</span>
            <p id="status-message" class="status-message" role="status">手足の丸を、竹の少し上へドラッグ</p>
            <div id="start-overlay" class="start-overlay">
              <p class="start-note"><span></span>制限時間なし。最速の月帰りをめざそう。</p>
              <button id="start-button" class="start-button" type="button"><span>自力で、月へ帰る<small>LET’S GO HOME</small></span><span class="start-arrow">${icons.arrow}</span></button>
              <p class="start-hint">手 → 足の順につかむと、追い風が吹く。</p>
            </div>
            <div id="webgl-fallback" class="webgl-fallback" hidden><span class="fallback-icon">${icons.leaf}</span><h2>竹を準備しています</h2><p>しばらくお待ちください。</p></div>
          </div>
          <div class="scene-bottom"><span><i></i> A VERY HANDMADE MOONSHOT</span><span>24m TO HOME.</span></div>
        </section>

        <aside class="route" aria-label="月までの帰り道">
          <p class="eyebrow">THE WAY UP</p>
          <h2>月までの<br>帰り道。</h2>
          <ol class="route-list">
            <li data-biome="4"><span class="route-node moon-node"></span><span class="route-height">21 m —</span><span class="route-name">月の庭<span>ALMOST HOME</span></span></li>
            <li data-biome="3"><span class="route-node"></span><span class="route-height">15 m —</span><span class="route-name">星路<span>A PATH OF STARS</span></span></li>
            <li data-biome="2"><span class="route-node"></span><span class="route-height">9 m —</span><span class="route-name">雲海<span>ABOVE THE CLOUDS</span></span></li>
            <li data-biome="1"><span class="route-node"></span><span class="route-height">4 m —</span><span class="route-name">山鳥<span>AN UNEXPECTED AUDIENCE</span></span></li>
            <li class="is-active" data-biome="0"><span class="route-node"></span><span class="route-height">0 m —</span><span class="route-name">竹林<span>WHERE IT ALL BEGINS</span></span><span class="route-current">YOU ARE HERE</span></li>
          </ol>
          <p class="route-note"><span>${icons.moon}</span>24m で、おかえりなさい。</p>
        </aside>
      </main>

      <section class="control-bar" aria-label="操作のヒント">
        <p class="control-caption">HOW TO CLIMB</p>
        <div class="control-step"><span>01</span><p>手足の丸をつかむ</p></div><span class="control-arrow">→</span>
        <div class="control-step"><span>02</span><p>竹の上へ運ぶ</p></div><span class="control-arrow">→</span>
        <div class="control-step"><span>03</span><p>離してつかまる</p></div>
        <p class="control-tip"><strong>手 → 足</strong> 交互につかんで追い風。</p>
      </section>
      <footer class="site-footer"><span>© GUNYAMAST</span><span>竹取物語、その帰り道。</span><span>FREE TO THE MOON <i>↗</i></span></footer>
    </div>

    <dialog id="help-dialog" class="game-dialog help-dialog" aria-labelledby="help-title">
      <button id="help-close" class="dialog-close round-button" type="button" aria-label="遊び方を閉じる">${icons.close}</button>
      <p class="eyebrow">A LITTLE MOON GUIDE</p><h2 id="help-title">コツは、<br>手、足、手、足。</h2><p class="dialog-intro">月からの迎えは、まだ来ない。<br>かぐや姫を24m先の月へ送り届けよう。</p>
      <ol class="help-steps"><li><span class="help-number">01</span><div><h3>丸を、少し上の竹へ</h3><p>手足の丸を指でドラッグし、竹の近くで離すとつかまります。2本以上を残すと安定。マウスでも遊べます。</p></div></li><li><span class="help-number">02</span><div><h3>手と足を交互に、追い風を呼ぶ</h3><p>手 → 足 → 手 → 足と4回、上へつかみ直すと0.8mの追い風！左右はどちらでも大丈夫です。</p></div></li><li><span class="help-number">03</span><div><h3>ひと区切りずつ、月へ帰ろう</h3><p>6m・12m・18mの休み竹を通ると、落ちてもそこへ救出。救出は1回につきタイムに5秒加算されます。</p></div></li></ol>
      <p class="help-bottom"><span>${icons.moon}</span>制限時間はなし。24m到着までの速さを競います。一時停止中は時計も止まります。</p>
    </dialog>

    <dialog id="pause-dialog" class="game-dialog pause-dialog" aria-labelledby="pause-title"><p class="eyebrow">THE MOON CAN WAIT</p><h2 id="pause-title">姫も、ひとやすみ。</h2><p class="dialog-intro">時計も止めておきました。<br>お茶を飲んだら、もうひと登り。</p><div class="pause-illustration" aria-hidden="true">${icons.moon}<span>HOME IS GETTING CLOSER.</span></div><button id="resume-button" class="primary-button" type="button">月をめざす ${icons.arrow}</button><button id="finish-button" class="text-button" type="button">リタイアして記録を見る <span>↗</span></button></dialog>

    <dialog id="result-dialog" class="game-dialog result-dialog" aria-labelledby="result-title"><div class="result-layout"><div class="result-card-wrap"><canvas id="result-card" width="900" height="1200" aria-label="かぐや姫の月への帰還記録カード"></canvas></div><div class="result-content"><p id="result-label" class="eyebrow">KAGUYA’S RETURN TICKET</p><h2 id="result-title">おかえり、<br>かぐや姫。</h2><p id="result-description" class="dialog-intro">自力で帰った、そのタイム。<br>月への帰還報告を、みんなにも。</p><div class="result-actions"><button id="share-button" class="primary-button" type="button">${icons.share}<span>記録をシェア</span></button><button id="save-button" class="secondary-button" type="button">${icons.download}<span>カードを保存</span></button><button id="x-share-button" class="text-button x-share-button" type="button">${icons.x}<span>X に投稿する</span><span>↗</span></button></div><button id="retry-button" class="retry-button" type="button">もう一度、月へ帰る <span>↗</span></button><p class="result-note">月に到着した最速タイムを、この端末に保存します。</p></div></div></dialog>
  `;
}
