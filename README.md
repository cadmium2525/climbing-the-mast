# グニャマスト

ぐにゃぐにゃの手足で、どこまでも続く竹を登るスマートフォン向けブラウザゲームです。Three.js で描画する竹と人間、ばねで遅れて動く手足、高さで変わる景色、保存・共有できる記録カードを備えています。制限時間はありません。

## 起動・ビルド

Node.js 22.12 以上と npm を用意し、このフォルダーで実行します。

```sh
npm install
npm run dev
```

表示されたローカル URL をブラウザーで開きます。同じ Wi-Fi のスマートフォンで確認する場合は、Vite が表示する `Network` の URL を使います。

```sh
npm test
npm run build
npm run preview
```

- `npm test`: 登れること、放置で高さが増えないこと、落下・復帰・リセット、フレームレート差などのシミュレーション検証。
- `npm run build`: TypeScript の検証と静的サイトの生成。出力先は `dist/`。
- `npm run preview`: ビルドしたサイトをローカルで確認。

初回インストール後の再現用には `npm ci` を使用できます。ゲームの動作に API キーや環境変数は不要です。

## 遊び方

1. 「登りはじめる」を押します。
2. 手足の丸を 1 つつかみ、少し上の竹へゆっくりドラッグします。
3. 手足が指に追いついたら、竹の近くで指を離してつかまります。
4. 左右の手と足を交互に動かして、体を引き上げます。

パソコンではマウスでも操作できます。手足が追いつく前に大きく振ったり、届かない位置で離すとつかまりません。手足を 2 本以上、慣れるまでは 3 本残すと安定します。手ばかりを上げず、足もこまめに運ぶのがコツです。伸びきった手足は外れますが、落ち始めても手足が届くうちはつかみ直せます。

時間制限や体力の減少はなく、安定した姿勢なら何分でも休めます。一時停止から、その時点の記録を残して終了することもできます。得点は今回の最高到達点で、落下中に下がることはありません。

## 記録と SNS

終了時に高さと到達した景色をまとめた PNG カードを作ります。「記録をシェア」は、対応したスマートフォンでは OS の共有画面を開きます。画像共有に対応しない環境では、カードの保存と投稿用テキストの共有を利用できます。

「カードを保存」で PNG を保存し、好きな SNS に添付できます。「X に投稿する」は記録とゲームの URL を入れた投稿画面を開きます。X の投稿画面へ画像は自動添付されないため、必要なら保存したカードを追加してください。投稿の確定は利用者が行います。

自己ベストはブラウザーの `localStorage` に保存します。同じ端末・同じブラウザー内の記録で、全国ランキングやアカウント機能はありません。ブラウザーのデータを消すと記録も消えます。

## GitHub Pages への公開

公開用の GitHub リポジトリーは、無料プランで使える **Public** にします。独自ドメインを購入する必要はありません。GitHub Free の Public リポジトリーでは [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) と [標準ランナーの GitHub Actions](https://docs.github.com/en/actions/concepts/billing-and-usage) を無料で利用できます。

1. GitHub で Public リポジトリーを作り、このプロジェクトを `main` ブランチへ push します。
2. リポジトリーの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定します。
3. **Actions** タブで `Deploy game to GitHub Pages` の完了を確認します。初回に Pages の設定をした後、必要なら **Run workflow** から再実行します。
4. Pages の設定画面、または完了した `deploy` ジョブに表示される URL を開きます。

`.github/workflows/deploy.yml` が `main` への push を検知し、`npm ci` → テスト → ビルド → Pages 公開を行います。`package-lock.json` もリポジトリーへ含めてください。

`vite.config.ts` は `base: './'` を指定しています。画像や JavaScript を相対パスで参照するため、`https://ユーザー名.github.io/リポジトリー名/` のサブディレクトリーでも動作します。`dist/` の中身が公開されます。

このプロジェクトの公開先:

- リポジトリー: [cadmium2525/climbing-the-mast](https://github.com/cadmium2525/climbing-the-mast)
- ゲーム: [グニャマスト](https://cadmium2525.github.io/climbing-the-mast/)

ゲームの URL は Pages のデプロイ完了後に利用できます。

## 費用・素材・構成

- 実行はブラウザー内で完結します。有料サーバー、データベース、画像生成 API、外部の課金 API は使用しません。
- 竹とプレイヤーの 3D モデルはコードで形状を組み立てています。有料モデルや有料フォントは使用していません。
- 背景画像は本プロジェクト用に画像生成ツールで制作したローカルファイルです。ゲームの実行中に画像を生成したり、外部サービスへ送信したりしません。生成内容は `public/assets/ASSETS.md` を参照してください。
- [Three.js](https://github.com/mrdoob/three.js/blob/dev/LICENSE) は MIT ライセンスです。Vite、TypeScript、テストツールも npm の無償パッケージを使用しています。
- 有料プランの契約、有料素材の購入、独自ドメインの購入は不要です。公開の無料条件は上記の Public リポジトリー・標準ランナーを前提とします。

主なソースは `src/simulation.ts`（手足と登りの挙動）、`src/renderer.ts`（Three.js 描画）、`src/ui.ts` / `src/style.css`（画面）、`src/share.ts`（記録カード）、`src/biomes.ts`（景色の切り替え）です。

検証した画面・操作・実機確認の範囲は [動作確認メモ](docs/verification.md) にまとめています。
