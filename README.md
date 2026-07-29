# Orbit Pong

円形フィールドでCPUと対戦する、スマートフォン／PC対応のミニマムなPongゲームです。ChatGPT Sites版のゲーム性と操作感を維持しつつ、GitHub Pagesへそのまま公開できる静的なVite + Reactアプリとして整理しています。

## ゲーム内容

- プレイヤーは円周の下半分、CPUは上半分を移動
- タッチ、マウス、左右キー（またはA／D）で操作
- 先に5点取ると勝利
- 返球ごとにボールとバーが加速
- 長いラリーでは画面が緑から黄色、赤へ変化
- バーの端や、バーを動かしながら返すことで打球方向が変化
- CPU難易度はEASY／NORMAL／HARD
- 得点後はゲーム画面をタップ／クリックして次のサーブを開始
- SpaceまたはPで一時停止

ゲームの仕様と調整方針は [`ORBIT_PONG_AI_HANDOFF.md`](./ORBIT_PONG_AI_HANDOFF.md) を参照してください。

## ローカル開発

Node.js 22.13以上が必要です。

```bash
npm ci
npm run dev
```

Viteが表示したURLをブラウザで開きます。プロダクションビルドは次のコマンドで確認できます。

```bash
npm test
npm run preview
```

`npm test`はESLint、TypeScript、プロダクションビルド、GitHub Pages向け成果物の検証を順番に実行します。

## GitHub Pagesで公開

1. このリポジトリをGitHubへpushします。
2. GitHubの **Settings → Pages → Build and deployment** で **Source** を **GitHub Actions** にします。
3. ブランチへpushすると、[デプロイワークフロー](./.github/workflows/deploy-pages.yml)がビルドとテストを行い、`dist`をGitHub Pagesへ公開します。公開修正をPRブランチ上でも確認できるよう、ブランチ名は限定していません。

ViteのアセットURLは相対パスにしているため、ユーザーサイトとプロジェクトサイトのどちらでも動作します。手作業で公開する場合は、`npm run build`後の`dist`フォルダーを静的ホスティングへ配置してください。

GitHub PagesのSourceが **Deploy from a branch / root** のままでも空白画面に
ならないよう、リポジトリ直下にはビルド済みのフォールバック版も含めています。
ゲームを修正した場合は、次のコマンドでフォールバック版を更新してください。

```bash
npm run build:pages
```

## 構成

- `app/page.tsx` — ゲーム状態、Canvas描画、物理、CPU、入力、UI
- `app/globals.css` — 筐体デザインとレスポンシブ表示
- `src/main.tsx` — Reactのブラウザーエントリーポイント
- `src/index.html` — 編集用HTMLテンプレート
- `index.html`、`assets/` — branch/root公開用のビルド済みフォールバック
- `public/favicon.svg` — ファビコン
- `.github/workflows/deploy-pages.yml` — GitHub Pagesへの自動公開
- `tests/rendered-html.test.mjs` — 静的成果物の検証

元のChatGPT Sites／Cloudflare Worker専用ファイルと、未使用のスターター画像は公開版には不要なため削除しています。

## ライセンス

ライセンスは指定していません。第三者による再利用を許可する場合は、権利者が適切なライセンスを追加してください。
